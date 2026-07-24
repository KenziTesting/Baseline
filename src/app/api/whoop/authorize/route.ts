import { NextResponse } from "next/server";
import { buildAuthorizeUrl, getWhoopConfig } from "@/lib/providers/wearable/whoop";
import { writeOAuthState } from "@/lib/providers/wearable/tokenStore";

/** Kicks off the OAuth flow: sets a CSRF state cookie and redirects to WHOOP. */
export async function GET() {
  const config = getWhoopConfig();
  if (!config) {
    return NextResponse.json(
      { error: "WHOOP is not configured. Set WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, and WHOOP_REDIRECT_URI." },
      { status: 501 },
    );
  }
  const state = crypto.randomUUID();
  await writeOAuthState(state);
  return NextResponse.redirect(buildAuthorizeUrl(config, state));
}
