"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { ArrowRight } from "@/components/icons";
import { useBaselineStore } from "@/lib/store";
import { buildCoachContext } from "@/lib/coach";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = ["What should I do today?", "Am I recovered enough to lift?", "What's my biggest weakness?", "My knee's a little sore."];

export default function CoachPage() {
  const store = useBaselineStore();
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [offlineReason, setOfflineReason] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => setHydrated(true), []);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const context = buildCoachContext(useBaselineStore.getState());
      const res = await fetch("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next, context }) });
      const json = (await res.json()) as { reply: string; source: string; reason?: string };
      setOffline(json.source === "fallback");
      setOfflineReason(json.reason ?? null);
      setMessages((m) => [...m, { role: "assistant", content: json.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Couldn't reach the coach. Try again." }]);
    } finally {
      setBusy(false);
    }
  };

  const alter = hydrated ? store.alterEgo?.name : undefined;

  return (
    <div className="flex min-h-[92vh] flex-col pb-24">
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Coach</h1>
          <p className="text-xs text-white/40">Knows your build, your gaps, and today&apos;s readiness.</p>
        </div>
        <span className="font-display text-base text-amber-500">BASELINE</span>
      </header>

      <div ref={scroller} className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="animate-fade-up">
            <div className="surface p-4">
              <p className="text-[15px] leading-relaxed text-white/80">
                {alter ? `${alter}. ` : ""}I&apos;ve got your profile, your gap report, today&apos;s session, and your recovery in front of me. Ask me anything — what to train, whether to back off, where you&apos;re soft.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="pressable rounded-full border border-white/[0.08] bg-court-850 px-3 py-2 text-xs font-semibold text-white/70 hover:text-white">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "ml-auto bg-amber-500/[0.14] text-white" : "surface text-white/85"}`}>
            {m.content.split("\n").map((l, j) => <p key={j} className={j > 0 ? "mt-1.5" : ""}>{l}</p>)}
          </div>
        ))}
        {busy && <div className="surface max-w-[60%] rounded-2xl px-4 py-3 text-sm text-white/40">Thinking…</div>}
      </div>

      {offline && (
        <p className="mt-2 text-center text-[11px] text-white/30">
          {offlineReason === "api_error"
            ? "Offline coach — the live coach is temporarily unavailable (the API returned an error, often a low credit balance). Reading your data back for now."
            : "Offline coach (no ANTHROPIC_API_KEY set) — reading your data back. Add the key for the full coach."}
        </p>
      )}

      <div className="sticky bottom-0 -mx-5 mt-3 bg-gradient-to-t from-court-950 via-court-950/95 to-transparent px-5 pb-6 pt-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask your coach…"
            className="min-h-[52px] flex-1 rounded-2xl border border-white/[0.08] bg-court-850 px-4 text-base text-white outline-none focus:border-amber-500/70"
          />
          <button onClick={() => send(input)} disabled={busy || !input.trim()} className="pressable flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-court-950 disabled:opacity-40">
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
