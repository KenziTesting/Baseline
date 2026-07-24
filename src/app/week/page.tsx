"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { ArrowRight, Check } from "@/components/icons";
import { FRAMEWORKS, getWeek, type DayBlock } from "@/lib/mental";
import { useBaselineStore } from "@/lib/store";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const todayIndex = () => (new Date().getDay() + 6) % 7;

export default function WeekPage() {
  const router = useRouter();
  const { subscription, alterEgo, currentWeekIndex, blockCompletions, toggleBlock, saveIntention, intentions } = useBaselineStore();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState<number | null>(todayIndex());

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (!hydrated) return;
    if (!subscription.active) router.replace("/paywall");
    else if (!alterEgo) router.replace("/week/onboarding");
  }, [hydrated, subscription.active, alterEgo, router]);

  const week = getWeek(currentWeekIndex);
  if (!hydrated || !subscription.active || !alterEgo || !week) {
    return <div className="pt-24 text-center text-white/40">Loading THE WEEK…</div>;
  }
  const fw = FRAMEWORKS[week.framework];
  const alter = alterEgo.name;

  return (
    <div className="pb-28">
      <header className="pt-2">
        <p className="eyebrow">Week {week.index} · {fw.tagline}</p>
        <h1 className="mt-1 font-display text-[38px] uppercase leading-[0.95] tracking-tight text-amber-500">{week.name}</h1>
        <p className="mt-2 text-sm text-white/55">{week.theme}</p>
        <p className="mt-3 rounded-xl border border-white/10 bg-court-900/60 p-3 text-sm italic leading-relaxed text-white/70">“{fw.hook}”</p>
      </header>

      <div className="mt-6 space-y-2.5">
        {week.days.map((d) => (
          <DayCard
            key={d.day}
            block={d}
            alter={alter}
            isToday={d.day === todayIndex()}
            done={!!blockCompletions[`${week.index}:${d.day}`]}
            expanded={open === d.day}
            onToggleExpand={() => setOpen(open === d.day ? null : d.day)}
            onMarkDone={() => toggleBlock(week.index, d.day)}
            onSaveIntention={(t) => saveIntention(week.index, t)}
            intentionText={intentions.find((i) => i.weekIndex === week.index)?.text ?? ""}
            onOpenReport={() => router.push("/week/report")}
          />
        ))}
      </div>
    </div>
  );
}

function DayCard({
  block, alter, isToday, done, expanded, onToggleExpand, onMarkDone, onSaveIntention, intentionText, onOpenReport,
}: {
  block: DayBlock;
  alter: string;
  isToday: boolean;
  done: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onMarkDone: () => void;
  onSaveIntention: (t: string) => void;
  intentionText: string;
  onOpenReport: () => void;
}) {
  const [intent, setIntent] = useState(intentionText);
  const isSilent = block.kind === "compete";
  const isReport = block.kind === "report";
  const body = (p: string) => p.replaceAll("{alter}", alter);

  return (
    <div className={`surface overflow-hidden ${isToday ? "!border-amber-500/40" : ""}`}>
      <button onClick={onToggleExpand} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="w-9 text-sm font-bold text-white/40">{DAY_NAMES[block.day]}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{block.title}{isToday && <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">TODAY</span>}</p>
          <p className="text-xs text-white/40">{block.minutes ? `${block.minutes} min` : "No content — go compete"}</p>
        </div>
        {done ? <Check className="h-5 w-5 text-readiness-green" /> : <span className="text-white/25">›</span>}
      </button>

      {expanded && (
        <div className="border-t border-white/[0.05] px-4 pb-4 pt-3">
          {isSilent ? (
            <div className="space-y-2">
              <p className="text-sm text-white/70"><span className="text-white/40">Morning:</span> {block.compete?.morning}</p>
              <p className="text-sm text-white/70"><span className="text-white/40">Night:</span> {block.compete?.night}</p>
              <p className="pt-1 text-xs text-white/35">Today the app stays quiet. That&apos;s the point.</p>
            </div>
          ) : (
            <>
              {block.body.map((p, i) => (
                <p key={i} className="mb-2 text-[15px] leading-relaxed text-white/75">{body(p)}</p>
              ))}
              {block.kind === "declaration" && (
                <div className="mt-3">
                  <Field label="Your intention this week">
                    <TextInput value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="Write it. Don't tap it." />
                  </Field>
                  <button onClick={() => onSaveIntention(intent)} className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300">Save intention</button>
                </div>
              )}
              {block.prompts && block.kind !== "declaration" && (
                <ul className="mt-2 space-y-1.5">
                  {block.prompts.map((pr) => (
                    <li key={pr.id} className="flex gap-2 text-sm text-white/70"><span className="text-amber-500">›</span>{pr.label}{pr.kind === "scale" ? ` (${pr.min}–${pr.max})` : ""}</li>
                  ))}
                </ul>
              )}
              {isReport ? (
                <Button className="mt-4" onClick={onOpenReport}>Open The Report <ArrowRight className="h-5 w-5" /></Button>
              ) : (
                <button onClick={onMarkDone} className={`pressable mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border text-sm font-bold ${done ? "border-readiness-green/50 bg-readiness-green/10 text-readiness-green" : "border-white/10 bg-court-850 text-white/70"}`}>
                  <Check className="h-4 w-4" /> {done ? "Logged — nice" : "Mark this rep done"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
