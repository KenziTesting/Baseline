import { NextResponse } from "next/server";
import { ensureFreshTokens, fetchTodayReadiness, getWhoopConfig } from "@/lib/providers/wearable/whoop";
import { readTokens, writeTokens } from "@/lib/providers/wearable/tokenStore";

/**
 * Today's WHOOP readiness. Returns `{ readiness: null }` (not an error) when
 * WHOOP isn't configured, isn't connected, or has no reading yet — the client
 * degrades to self-report rather than showing fabricated data (spec Part 8).
 */
export async function GET() {
  const config = getWhoopConfig();
  if (!config) return NextResponse.json({ readiness: null, connected: false, configured: false });

  const stored = await readTokens();
  if (!stored) return NextResponse.json({ readiness: null, connected: false, configured: true });

  try {
    const tokens = await ensureFreshTokens(config, stored);
    if (tokens !== stored) await writeTokens(tokens); // persist a refreshed token
    const readiness = await fetchTodayReadiness(tokens.accessToken);
    return NextResponse.json({ readiness, connected: true, configured: true });
  } catch {
    return NextResponse.json({ readiness: null, connected: true, configured: true, error: "fetch_failed" });
  }
}
