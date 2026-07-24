import { NextRequest, NextResponse } from "next/server";

/**
 * Coach chat (spec Part 1 module 6). The LLM has read-access to the athlete's
 * context (injected as a system prompt) but the deterministic engines own the
 * plan — the coach explains and motivates, it doesn't invent training data.
 *
 * Env-gated on ANTHROPIC_API_KEY. Without it we degrade to an honest, data-driven
 * fallback rather than a broken chat (spec Part 8: never fabricate).
 *
 * Model: claude-sonnet-5 (fast + capable for conversation).
 */

const MODEL = "claude-sonnet-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

const COACH_SYSTEM = `You are the athlete's basketball performance coach inside the Baseline app.
Voice: a coach who's known them three years — warm, blunt, specific, occasionally funny, never a drill sergeant or a LinkedIn influencer. Short sentences. Second person.
Hard rules:
- You are NOT a doctor. If they describe pain (sharp, swelling, numbness, or lasting >2 weeks), tell them to stop and see a qualified professional — do not offer a workaround drill.
- Load management over hype. If their recovery is low, tell them to back off even if they want to grind.
- Never invent biometric numbers or a training plan. Use ONLY the context provided below. If you don't have a number, say so.
- No fabricated quotes, no "no days off," no sleep-deprivation advice.
Keep replies tight — a few sentences unless they ask for detail.`;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { messages: CoachMessage[]; context: string };
  const messages = (body.messages ?? []).slice(-12);
  const context = body.context ?? "";
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return NextResponse.json({ reply: fallbackReply(messages, context, "no_key"), source: "fallback", reason: "no_key" });
  }

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: `${COACH_SYSTEM}\n\n--- ATHLETE CONTEXT (from their own logged data) ---\n${context}`,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) {
      // Surface the real reason (e.g. low credit balance) rather than a generic fail.
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      return NextResponse.json({ reply: fallbackReply(messages, context, "api_error"), source: "fallback", reason: "api_error", detail: body.error?.message });
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const reply = json.content?.filter((c) => c.type === "text").map((c) => c.text).join("").trim() || "…";
    return NextResponse.json({ reply, source: "claude" });
  } catch {
    return NextResponse.json({ reply: fallbackReply(messages, context, "api_error"), source: "fallback", reason: "api_error" });
  }
}

/** Honest, data-driven answer without a key — reads the injected context, never fabricates. */
function fallbackReply(messages: CoachMessage[], context: string, reason: "no_key" | "api_error"): string {
  const last = messages[messages.length - 1]?.content.toLowerCase() ?? "";
  const line = (label: string) => context.split("\n").find((l) => l.toLowerCase().includes(label.toLowerCase()));
  if (/pain|hurt|sore/.test(last)) {
    return "If it's soreness, we route around it and keep training. If it's sharp pain, swelling, or numbness — stop and see a professional. I'm not a doctor and I won't pretend to be one.";
  }
  if (/today|session|train|do/.test(last)) {
    return `Here's what your data says right now:\n${line("Today") ?? "No session loaded."}\n${line("Readiness") ?? ""}\nConnect an ANTHROPIC_API_KEY to talk to the full coach.`;
  }
  if (/gap|weak|improve|work on/.test(last)) {
    return `Your biggest gaps toward your archetype:\n${line("Gaps") ?? "Finish onboarding to see them."}\n(Full coach unlocks with an ANTHROPIC_API_KEY.)`;
  }
  if (/recover|readiness|rest|whoop/.test(last)) {
    return `${line("Readiness") ?? "No readiness reading yet."}\nRemember: on a low-recovery day, the smart move is to back off — grinding a red day digs a hole.`;
  }
  const why = reason === "api_error"
    ? "The coach's API call failed (often a low credit balance on the Anthropic account)"
    : "No ANTHROPIC_API_KEY is set";
  return `I'm in offline mode — ${why}. I can still read your data back to you:\n${context.slice(0, 400)}…\nFix that and I'll actually coach.`;
}
