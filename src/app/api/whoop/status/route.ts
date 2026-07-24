import { NextResponse } from "next/server";
import { isWhoopConfigured } from "@/lib/providers/wearable/whoop";
import { readTokens } from "@/lib/providers/wearable/tokenStore";

/** Tells the client whether WHOOP is set up (env) and connected (tokens present). */
export async function GET() {
  const configured = isWhoopConfigured();
  const tokens = configured ? await readTokens() : null;
  return NextResponse.json({ configured, connected: Boolean(tokens) });
}
