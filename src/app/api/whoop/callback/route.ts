import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getWhoopConfig } from "@/lib/providers/wearable/whoop";
import { consumeOAuthState, writeTokens } from "@/lib/providers/wearable/tokenStore";

/** OAuth redirect target: verifies CSRF state, exchanges the code for tokens. */
export async function GET(req: NextRequest) {
  const config = getWhoopConfig();
  if (!config) {
    return NextResponse.redirect(new URL("/settings?whoop=notconfigured", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const expectedState = await consumeOAuthState();

  if (url.searchParams.get("error")) {
    return NextResponse.redirect(new URL("/settings?whoop=denied", req.url));
  }
  if (!code || !returnedState || returnedState !== expectedState) {
    return NextResponse.redirect(new URL("/settings?whoop=badstate", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(config, code);
    await writeTokens(tokens);
    return NextResponse.redirect(new URL("/settings?whoop=connected", req.url));
  } catch {
    return NextResponse.redirect(new URL("/settings?whoop=error", req.url));
  }
}
