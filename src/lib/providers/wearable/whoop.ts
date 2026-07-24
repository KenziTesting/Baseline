/**
 * WHOOP integration (spec Part 4.1). SERVER-ONLY — never import from a client
 * component; it uses the client secret and stored OAuth tokens.
 *
 * ⚠️ Requires an APPROVED WHOOP developer account. The endpoint paths, scopes,
 * and response field names below reflect the WHOOP Developer Platform v1 shape
 * and MUST be verified against the current WHOOP docs before shipping — WHOOP
 * has revised these. Everything is written so that swapping a path or field is a
 * one-line change.
 *
 * Auth: OAuth 2.0 authorization-code flow with refresh tokens.
 * Data pulled: recovery score, HRV (RMSSD), resting HR, sleep, day strain.
 * Baselines: rolling 30-day HRV/RHR (see baseline.ts) — absolute values alone
 * are meaningless.
 */

import type { Readiness } from "@/lib/core";
import { computeBaselines, type DailyReading } from "./baseline";

// --- Endpoints & scopes (VERIFY against current WHOOP docs) ---
const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_API_BASE = "https://api.prod.whoop.com/developer";
const WHOOP_SCOPES = [
  "read:recovery",
  "read:sleep",
  "read:cycles",
  "read:workout",
  "read:profile",
  "offline", // required to receive a refresh token
];

export interface WhoopConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface WhoopTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
}

export function getWhoopConfig(): WhoopConfig | null {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function isWhoopConfigured(): boolean {
  return getWhoopConfig() !== null;
}

export function buildAuthorizeUrl(config: WhoopConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: WHOOP_SCOPES.join(" "),
    state,
  });
  return `${WHOOP_AUTH_URL}?${params.toString()}`;
}

async function tokenRequest(config: WhoopConfig, body: Record<string, string>): Promise<WhoopTokens> {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...body,
    }),
  });
  if (!res.ok) {
    throw new Error(`WHOOP token request failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export function exchangeCodeForTokens(config: WhoopConfig, code: string): Promise<WhoopTokens> {
  return tokenRequest(config, {
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });
}

export function refreshTokens(config: WhoopConfig, refreshToken: string): Promise<WhoopTokens> {
  return tokenRequest(config, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: WHOOP_SCOPES.join(" "),
  });
}

/** Ensure a live access token, refreshing (and returning new tokens) if expired. */
export async function ensureFreshTokens(config: WhoopConfig, tokens: WhoopTokens): Promise<WhoopTokens> {
  if (Date.now() < tokens.expiresAt - 60_000) return tokens;
  return refreshTokens(config, tokens.refreshToken);
}

async function apiGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${WHOOP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`WHOOP GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

// --- Response shapes (VERIFY field names) ---
interface RecoveryRecord {
  created_at: string;
  score?: { recovery_score: number; hrv_rmssd_milli: number; resting_heart_rate: number };
}
interface SleepRecord {
  score?: { stage_summary?: { total_in_bed_time_milli?: number; total_awake_time_milli?: number } };
}
interface CycleRecord {
  score?: { strain: number };
}

/** Recent recovery records → daily readings for the rolling baseline. */
export async function fetchRecentReadings(accessToken: string, days = 30): Promise<DailyReading[]> {
  const data = await apiGet<{ records: RecoveryRecord[] }>(
    accessToken,
    `/v1/recovery?limit=${days}`,
  );
  return (data.records ?? [])
    .filter((r) => r.score)
    .map((r) => ({
      dateISO: r.created_at.slice(0, 10),
      hrvMs: Math.round(r.score!.hrv_rmssd_milli),
      rhrBpm: Math.round(r.score!.resting_heart_rate),
    }));
}

/**
 * Today's readiness from WHOOP. Uses the rolling baseline; when there isn't
 * enough history (cold start) it anchors the baseline to today's values so the
 * autoregulation doesn't cry wolf, and leans on WHOOP's own recovery score
 * (already baseline-relative). NEVER returns fabricated data — null if no
 * recovery record exists yet today.
 */
export async function fetchTodayReadiness(accessToken: string): Promise<Readiness | null> {
  const [recovery, sleep, cycle] = await Promise.all([
    apiGet<{ records: RecoveryRecord[] }>(accessToken, `/v1/recovery?limit=30`),
    apiGet<{ records: SleepRecord[] }>(accessToken, `/v1/activity/sleep?limit=1`),
    apiGet<{ records: CycleRecord[] }>(accessToken, `/v1/cycle?limit=1`),
  ]);

  const records = recovery.records ?? [];
  const today = records.find((r) => r.score);
  if (!today?.score) return null; // no reading yet — degrade, don't fabricate

  const readings: DailyReading[] = records
    .filter((r) => r.score)
    .map((r) => ({ dateISO: r.created_at.slice(0, 10), hrvMs: r.score!.hrv_rmssd_milli, rhrBpm: r.score!.resting_heart_rate }));
  const baselines = computeBaselines(readings);

  const hrvMs = Math.round(today.score.hrv_rmssd_milli);
  const rhrBpm = Math.round(today.score.resting_heart_rate);

  const sleepMs = sleep.records?.[0]?.score?.stage_summary?.total_in_bed_time_milli ?? 0;
  const awakeMs = sleep.records?.[0]?.score?.stage_summary?.total_awake_time_milli ?? 0;
  const sleepHours = Math.round(((sleepMs - awakeMs) / 3_600_000) * 10) / 10;

  return {
    recovery: Math.round(today.score.recovery_score),
    sleepHours,
    hrvMs,
    hrvBaselineMs: baselines.reliable ? baselines.hrvBaselineMs : hrvMs,
    rhrBpm,
    rhrBaselineBpm: baselines.reliable ? baselines.rhrBaselineBpm : rhrBpm,
    dayStrain: Math.round((cycle.records?.[0]?.score?.strain ?? 0) * 10) / 10,
    source: "whoop",
  };
}

/**
 * Push a completed session back to WHOOP as a workout (spec Part 4.1: "where the
 * API allows"). WHOOP's public Developer API is currently READ-oriented and does
 * not expose a supported workout-create endpoint for third parties. We therefore
 * return `unsupported` rather than POSTing to an unverified path. If/when WHOOP
 * ships a write endpoint, implement it here.
 */
export async function pushWorkout(): Promise<{ ok: boolean; reason: string }> {
  return { ok: false, reason: "WHOOP does not expose a public workout-create endpoint yet." };
}
