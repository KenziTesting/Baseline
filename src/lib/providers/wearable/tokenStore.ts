/**
 * WHOOP token persistence. SERVER-ONLY.
 *
 * Single-user app → tokens live in an httpOnly, secure cookie (never exposed to
 * JS). For a multi-user build this would move to a `calendar_links`-style row in
 * Postgres keyed by user id; the interface stays the same.
 */

import { cookies } from "next/headers";
import type { WhoopTokens } from "./whoop";

const TOKEN_COOKIE = "whoop_tokens";
const STATE_COOKIE = "whoop_oauth_state";

export async function readTokens(): Promise<WhoopTokens | null> {
  const raw = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WhoopTokens;
  } catch {
    return null;
  }
}

export async function writeTokens(tokens: WhoopTokens): Promise<void> {
  (await cookies()).set(TOKEN_COOKIE, JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days (refresh token lifetime ballpark)
  });
}

export async function clearTokens(): Promise<void> {
  (await cookies()).delete(TOKEN_COOKIE);
}

export async function writeOAuthState(state: string): Promise<void> {
  (await cookies()).set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes to complete the flow
  });
}

export async function consumeOAuthState(): Promise<string | null> {
  const store = await cookies();
  const state = store.get(STATE_COOKIE)?.value ?? null;
  store.delete(STATE_COOKIE);
  return state;
}
