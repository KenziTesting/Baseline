import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

/**
 * WHOOP webhook receiver (spec Part 4.1). WHOOP pushes events for new recovery /
 * sleep / workout records; we verify the HMAC signature, then (in a full build)
 * invalidate cached readiness and fire a notification. Polling `/v1/recovery` is
 * the documented fallback when webhooks aren't delivered.
 *
 * ⚠️ Verify the signature header names and scheme against current WHOOP docs.
 */

const SIGNATURE_HEADER = "x-whoop-signature";
const TIMESTAMP_HEADER = "x-whoop-signature-timestamp";

function verifySignature(rawBody: string, timestamp: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(timestamp + rawBody);
  const expected = hmac.digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.WHOOP_CLIENT_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const rawBody = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER);
  const timestamp = req.headers.get(TIMESTAMP_HEADER);

  if (!signature || !timestamp || !verifySignature(rawBody, timestamp, signature, secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // { type: "recovery.updated" | "sleep.updated" | "workout.updated", ... }
  const event = JSON.parse(rawBody) as { type?: string };
  switch (event.type) {
    case "recovery.updated":
    case "sleep.updated":
    case "workout.updated":
      // TODO(Phase 8): invalidate cached readiness + schedule a notification.
      break;
    default:
      break;
  }
  return NextResponse.json({ received: true });
}
