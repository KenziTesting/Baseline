/**
 * WearableProvider interface (spec Part 4.1). WHOOP, Apple Health, Garmin, and
 * Oura all plug in behind this. The app must work with NONE connected, degrading
 * to a manual RPE + sleep self-report — so getTodayReadiness may return null and
 * callers must handle it (never fabricate a recovery score, spec Part 8).
 */

import type { Readiness } from "@/lib/core";

export interface WearableProvider {
  readonly id: string;
  readonly label: string;
  isConnected(): boolean;
  /** Null when no reading is available (device not synced / not connected). */
  getTodayReadiness(): Promise<Readiness | null>;
}
