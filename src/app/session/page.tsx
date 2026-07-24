"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { ArrowLeft, ArrowRight, Bolt, Check, Shield } from "@/components/icons";
import { VideoDemo } from "@/components/VideoDemo";
import {
  DRILLS,
  TIER_ORDER,
  tierForLevel,
  type BodyRegion,
  type Drill,
} from "@/lib/core";
import { selectTodaySession } from "@/lib/today";
import { useBaselineStore, type LoggedDrill, type LoggedSet, type SessionLogRecord } from "@/lib/store";

const REGIONS: { value: BodyRegion; label: string }[] = [
  { value: "ankle", label: "Ankle" },
  { value: "knee", label: "Knee" },
  { value: "hip", label: "Hip" },
  { value: "lower_back", label: "Low back" },
  { value: "shoulder", label: "Shoulder" },
];

export default function SessionPage() {
  const router = useRouter();
  const {
    profile, gapReport, aspirationalArchetypeId, phase, availableEquipment, readiness, logSession,
  } = useBaselineStore();

  const [hydrated, setHydrated] = useState(false);
  const [injuryRegions, setInjuryRegions] = useState<BodyRegion[]>([]);
  const [idx, setIdx] = useState(0);
  const [logs, setLogs] = useState<Record<number, LoggedDrill>>({});
  const [swap, setSwap] = useState<Record<string, string>>({});
  const [showHurt, setShowHurt] = useState(false);
  const [done, setDone] = useState(false);
  const [showExitGate, setShowExitGate] = useState(false);
  const [pushupsLeft, setPushupsLeft] = useState(10);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && (!gapReport || !readiness)) router.replace("/today");
  }, [hydrated, gapReport, readiness, router]);

  const today = useMemo(() => {
    if (!profile || !gapReport || !aspirationalArchetypeId || !readiness) return null;
    return selectTodaySession({
      profile, gapReport, aspirationalArchetypeId, phase, availableEquipment, readiness, injuryRegions,
    });
  }, [profile, gapReport, aspirationalArchetypeId, phase, availableEquipment, readiness, injuryRegions]);

  const session = today?.session ?? null;
  const playerTierIdx = profile ? TIER_ORDER.indexOf(tierForLevel(profile.level)) : 3;

  // Flatten blocks into an ordered step list.
  const steps = useMemo(
    () => (session ? session.blocks.flatMap((b) => b.drills.map((p) => ({ block: b.name, prescribed: p }))) : []),
    [session],
  );

  // Keep index in range if the session shrinks after an injury modify.
  useEffect(() => {
    if (idx >= steps.length && steps.length > 0) setIdx(steps.length - 1);
  }, [steps.length, idx]);

  if (!hydrated || !session || steps.length === 0) {
    return <div className="pt-24 text-center text-white/40">Loading your session…</div>;
  }

  const currentIds = new Set(
    steps.map((s) => swap[s.prescribed.drill.id] ?? s.prescribed.drill.id),
  );

  const step = steps[Math.min(idx, steps.length - 1)]!;
  const origDrill = step.prescribed.drill;
  const effective: Drill = swap[origDrill.id] ? DRILLS.find((d) => d.id === swap[origDrill.id])! : origDrill;
  const sets = step.prescribed.sets;
  const log = logs[idx];

  const setLog = (patch: Partial<LoggedDrill>) =>
    setLogs((prev) => ({ ...prev, [idx]: { drillId: effective.id, drillName: effective.name, sets: prev[idx]?.sets ?? [], ...prev[idx], ...patch } }));

  const setSetValue = (setIdx: number, patch: Partial<LoggedSet>) =>
    setLogs((prev) => {
      const entry = prev[idx] ?? { drillId: effective.id, drillName: effective.name, sets: [] as LoggedSet[] };
      const arr = [...entry.sets];
      while (arr.length <= setIdx) arr.push({});
      arr[setIdx] = { ...arr[setIdx], ...patch };
      return { ...prev, [idx]: { ...entry, drillId: effective.id, drillName: effective.name, sets: arr } };
    });

  const doSwap = () => {
    const alt = DRILLS.find(
      (d) =>
        d.category === effective.category &&
        TIER_ORDER.indexOf(d.tier) <= playerTierIdx &&
        d.equipment.every((eq) => eq === "none" || availableEquipment.includes(eq)) &&
        !d.regions.some((r) => r !== "none" && injuryRegions.includes(r)) &&
        !currentIds.has(d.id),
    );
    if (alt) {
      setSwap((prev) => ({ ...prev, [origDrill.id]: alt.id }));
      setLogs((prev) => { const next = { ...prev }; delete next[idx]; return next; });
    }
  };

  const applyHurt = (region: BodyRegion) => {
    setInjuryRegions((prev) => (prev.includes(region) ? prev : [...prev, region]));
    setIdx(0);
    setLogs({});
    setSwap({});
    setShowHurt(false);
  };

  const finish = () => {
    const entries: LoggedDrill[] = steps.map((s, i) => {
      const eff = swap[s.prescribed.drill.id] ? DRILLS.find((d) => d.id === swap[s.prescribed.drill.id])! : s.prescribed.drill;
      const l = logs[i];
      return { drillId: eff.id, drillName: eff.name, sets: l?.sets ?? [], rpe: l?.rpe, skipped: l?.skipped };
    });
    const record: SessionLogRecord = {
      id: `${Date.now()}`,
      dateISO: new Date().toISOString().slice(0, 10),
      focus: session.focus,
      title: session.title,
      recovery: readiness?.recovery,
      entries,
      completedAt: new Date().toISOString(),
    };
    logSession(record);
    setDone(true);
  };

  if (done) {
    const trained = steps.filter((_, i) => !logs[i]?.skipped).length;
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div className="animate-scale-in">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-readiness-green/30 to-readiness-green/10 text-readiness-green">
            <Check className="h-10 w-10" />
          </div>
          <h1 className="font-display text-3xl">SESSION LOGGED</h1>
          <p className="mt-2 text-white/60">{trained} drills in the bank. {session.title}.</p>
        </div>
        <div className="mt-8 w-full max-w-xs">
          <Button onClick={() => router.push("/today")}>Back to Today <ArrowRight className="h-5 w-5" /></Button>
        </div>
      </div>
    );
  }

  const isLast = idx === steps.length - 1;

  return (
    <div className="flex min-h-[92vh] flex-col pb-4">
      {/* header */}
      <header className="pt-2">
        <div className="flex items-center justify-between">
          <button onClick={() => { setPushupsLeft(10); setShowExitGate(true); }} className="text-sm font-semibold text-white/50 hover:text-white">Exit</button>
          <span className="text-xs font-medium text-white/40">{idx + 1} / {steps.length}</span>
        </div>
        <div className="mt-3 flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < idx ? "bg-amber-500" : i === idx ? "bg-amber-400" : "bg-court-800"}`} />
          ))}
        </div>
      </header>

      <div key={idx} className="mt-5 flex-1 animate-fade-up">
        <p className="eyebrow">{step.block}</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{effective.name}</h1>
          <TierChip tier={effective.tier} />
        </div>
        {step.prescribed.reason && (
          <span className="mt-2 inline-block rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-300">
            Targets a gap
          </span>
        )}

        {/* video demo — resolves a validated YouTube demo, or falls back to cues */}
        <div className="mt-4">
          <VideoDemo drillName={effective.name} />
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-white/70">{effective.description}</p>

        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-court-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Coaching cues</p>
          <ul className="mt-2 space-y-1.5">
            {effective.cues.map((c) => (
              <li key={c} className="flex gap-2 text-sm text-white/80"><span className="text-amber-500">›</span>{c}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="font-semibold text-white/50">Target</span>
          <span className="font-display text-lg text-amber-400">{step.prescribed.doseLabel}</span>
        </div>

        {/* logging */}
        <div className="mt-4">
          {sets > 0 ? (
            <div className="space-y-2">
              {Array.from({ length: sets }).map((_, si) => (
                <div key={si} className="flex items-center gap-2">
                  <span className="w-14 text-xs font-semibold text-white/40">Set {si + 1}</span>
                  <input
                    inputMode="numeric"
                    placeholder="reps"
                    value={log?.sets[si]?.reps ?? ""}
                    onChange={(e) => setSetValue(si, { reps: e.target.value })}
                    className="min-h-[46px] w-full rounded-xl border border-white/[0.08] bg-court-850 px-3 text-center text-sm text-white outline-none focus:border-amber-500/70"
                  />
                  <input
                    inputMode="numeric"
                    placeholder="load"
                    value={log?.sets[si]?.load ?? ""}
                    onChange={(e) => setSetValue(si, { load: e.target.value })}
                    className="min-h-[46px] w-full rounded-xl border border-white/[0.08] bg-court-850 px-3 text-center text-sm text-white outline-none focus:border-amber-500/70"
                  />
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setLog({ skipped: false, sets: [{ reps: "done" }] })}
              className={`pressable flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border text-sm font-bold transition-colors ${
                log?.sets[0]?.reps === "done"
                  ? "border-readiness-green/50 bg-readiness-green/10 text-readiness-green"
                  : "border-white/[0.1] bg-court-850 text-white/70"
              }`}
            >
              <Check className="h-4 w-4" /> {log?.sets[0]?.reps === "done" ? "Completed" : "Mark complete"}
            </button>
          )}
        </div>

        {/* RPE */}
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">How hard? (RPE)</p>
          <div className="mt-2 grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }).map((_, i) => {
              const n = i + 1;
              const active = log?.rpe === n;
              return (
                <button
                  key={n}
                  onClick={() => setLog({ rpe: n })}
                  className={`pressable flex min-h-[40px] items-center justify-center rounded-lg border text-sm font-bold ${
                    active ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-white/[0.06] bg-court-850 text-white/40"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* actions */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={doSwap} className="pressable flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-court-850 text-sm font-semibold text-white/70 hover:text-white">
            <ArrowRight className="h-4 w-4 rotate-90" /> Swap drill
          </button>
          <button onClick={() => setShowHurt((v) => !v)} className="pressable flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-readiness-red/25 bg-readiness-red/[0.06] text-sm font-semibold text-readiness-red">
            <Shield className="h-4 w-4" /> I&apos;m hurt
          </button>
        </div>

        {showHurt && (
          <Card className="mt-3">
            <p className="text-sm font-bold text-white/85">Where does it hurt?</p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              We&apos;ll rebuild today&apos;s session to route around it. Sharp pain, swelling, or numbness — stop and see a professional. This isn&apos;t medical advice.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {REGIONS.map((r) => (
                <button key={r.value} onClick={() => applyHurt(r.value)} className="pressable min-h-[44px] rounded-xl border border-white/[0.08] bg-court-850 text-xs font-semibold text-white/70 hover:border-readiness-red/40">
                  {r.label}
                </button>
              ))}
            </div>
            {injuryRegions.length > 0 && (
              <p className="mt-3 text-xs text-readiness-yellow">Avoiding: {injuryRegions.join(", ")}. Session rebuilt.</p>
            )}
          </Card>
        )}
      </div>

      {/* nav */}
      <div className="sticky bottom-0 -mx-5 mt-6 flex gap-3 bg-gradient-to-t from-court-950 via-court-950/95 to-transparent px-5 pb-6 pt-4">
        {idx > 0 && (
          <Button variant="ghost" className="w-16 !min-w-[64px] flex-none" onClick={() => setIdx((i) => i - 1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {isLast ? (
          <Button onClick={finish}><Check className="h-5 w-5" /> Finish &amp; log</Button>
        ) : (
          <Button onClick={() => setIdx((i) => i + 1)}>Next drill <ArrowRight className="h-5 w-5" /></Button>
        )}
      </div>

      {showExitGate && (
        <ExitGate
          pushupsLeft={pushupsLeft}
          onCount={() => setPushupsLeft((n) => Math.max(0, n - 1))}
          onStay={() => setShowExitGate(false)}
          onLeave={() => router.push("/today")}
        />
      )}
    </div>
  );
}

/** "Drop and give me 10." — the toll for bailing on a workout early. */
function ExitGate({
  pushupsLeft,
  onCount,
  onStay,
  onLeave,
}: {
  pushupsLeft: number;
  onCount: () => void;
  onStay: () => void;
  onLeave: () => void;
}) {
  const cleared = pushupsLeft === 0;
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-court-950/80 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-md animate-fade-up self-start rounded-b-3xl border border-t-0 border-white/10 bg-court-850 px-6 pb-7 pt-8 text-center shadow-2xl">
        {!cleared ? (
          <>
            <p className="eyebrow">Hold up</p>
            <h2 className="mt-2 font-display text-3xl uppercase tracking-tight">Drop and give me 10</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-white/55">
              Bailing early? Pay the toll. Tap once for every rep you knock out.
            </p>
            <div className="my-6 font-display text-[72px] leading-none text-amber-500">{pushupsLeft}</div>
            <Button onClick={onCount}>
              <Bolt className="h-5 w-5" /> Count it ({pushupsLeft} to go)
            </Button>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <button onClick={onStay} className="font-semibold text-white/60 hover:text-white">I&apos;ll stay and finish</button>
              <span className="text-white/15">·</span>
              <button onClick={onLeave} className="font-semibold text-readiness-red/70 hover:text-readiness-red">Hurt? Leave now</button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-readiness-green/15 text-readiness-green">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="font-display text-3xl uppercase tracking-tight">That&apos;s 10. Respect.</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-white/55">Go get water. The plan will be here tomorrow.</p>
            <div className="mt-6 space-y-2">
              <Button onClick={onLeave}>Leave workout <ArrowRight className="h-5 w-5" /></Button>
              <Button variant="ghost" onClick={onStay}>Actually, keep training</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TierChip({ tier }: { tier: string }) {
  return (
    <span className="shrink-0 rounded-full border border-white/[0.08] bg-court-850 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/50">
      {tier}
    </span>
  );
}
