"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ScoreRing, SegmentedControl } from "@/components/ui";
import { LineChart } from "@/components/LineChart";
import { RadarChart } from "@/components/RadarChart";
import { BodyMap2D } from "@/components/BodyMap2D";
import {
  computeAllMuscleFatigue, causeBreakdown, asymmetryReport, MUSCLES, PHASES,
  STRENGTH_EXERCISES, STRENGTH_EXERCISES_BY_ID, SUMMARY_CATEGORIES, summaryScores,
  type MuscleId,
} from "@/lib/core";
import {
  aggregateZones, bodyweightMA, bodyweightSeries, e1rmSeries, loggedExerciseIds,
  movingAverage, personalRecords, plyoContactsPerWeek, posteriorChainBalance,
  rankMovers, trendCaption, verticalSeries, weeklyVolumeByMuscle, strengthLogsCSV,
  buildExportBundle,
} from "@/lib/analytics";
import { fatigueColor, fatigueLabel } from "@/lib/fatigueColor";
import { SHOT_ZONES } from "@/lib/progress/types";
import { useBaselineStore } from "@/lib/store";

type Tab = "overview" | "strength" | "skill" | "body";

export default function ProgressPage() {
  const router = useRouter();
  const {
    strengthLogs, shootingLogs, bodyMetrics, demoDataLoaded, loadDemoHistory,
    phase, readiness, dna, sessionLogs,
  } = useBaselineStore();
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  useEffect(() => setHydrated(true), []);

  if (!hydrated) return <div className="pt-24 text-center text-white/40">Loading…</div>;

  const hasData = strengthLogs.length > 0 || shootingLogs.length > 0;

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Progress</h1>
        <span className="font-display text-base text-amber-500">BASELINE</span>
      </header>

      <div className="mt-4">
        <SegmentedControl
          columns={4}
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "strength", label: "Strength" },
            { value: "skill", label: "Skill" },
            { value: "body", label: "Body" },
          ]}
        />
      </div>

      {!hasData ? (
        <Card className="mt-6 text-center">
          <p className="text-sm font-bold text-white/85">No history yet</p>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-white/50">
            Log gym and court sessions and this fills in. Want to see it in action right now?
          </p>
          <div className="mt-4"><Button onClick={loadDemoHistory}>Load 4 weeks of demo history</Button></div>
        </Card>
      ) : (
        <div key={tab} className="mt-6 animate-fade-up">
          {tab === "overview" && <Overview {...{ strengthLogs, shootingLogs, bodyMetrics, phase, sessionLogs }} />}
          {tab === "strength" && <Strength strengthLogs={strengthLogs} />}
          {tab === "skill" && <Skill shootingLogs={shootingLogs} dnaVector={dna?.vector ?? null} />}
          {tab === "body" && <Body strengthLogs={strengthLogs} bodyMetrics={bodyMetrics} recovery={readiness?.recovery} onOpenSettings={() => router.push("/settings")} demoDataLoaded={demoDataLoaded} />}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Overview --------------------------------- */
function Overview({ strengthLogs, shootingLogs, bodyMetrics, phase, sessionLogs }: {
  strengthLogs: ReturnType<typeof useBaselineStore.getState>["strengthLogs"];
  shootingLogs: ReturnType<typeof useBaselineStore.getState>["shootingLogs"];
  bodyMetrics: ReturnType<typeof useBaselineStore.getState>["bodyMetrics"];
  phase: ReturnType<typeof useBaselineStore.getState>["phase"];
  sessionLogs: ReturnType<typeof useBaselineStore.getState>["sessionLogs"];
}) {
  const now = Date.now();
  const movers = useMemo(() => {
    const lifts = loggedExerciseIds(strengthLogs).slice(0, 6).map((id) => ({
      label: STRENGTH_EXERCISES_BY_ID[id]?.name ?? id,
      unit: "kg",
      series: e1rmSeries(strengthLogs, id),
    }));
    const bw = { label: "Bodyweight", unit: "kg", series: bodyweightMA(bodyMetrics) };
    const vert = { label: "Vertical", unit: "in", series: verticalSeries(bodyMetrics) };
    return rankMovers([...lifts, bw, vert]);
  }, [strengthLogs, bodyMetrics]);

  const up = movers.filter((m) => m.deltaPct > 0.5).slice(0, 3);
  const down = movers.filter((m) => m.deltaPct < -0.5).slice(-1);

  // consistency: distinct training days in last 28d vs a 12-session target (not a raw streak).
  const days = new Set<string>();
  for (const s of strengthLogs) if (now - s.timestamp < 28 * 86400000) days.add(new Date(s.timestamp).toISOString().slice(0, 10));
  for (const l of sessionLogs) days.add(l.dateISO);
  const consistency = Math.min(100, Math.round((days.size / 12) * 100));

  const exportData = (kind: "csv" | "json") => {
    const bundle = buildExportBundle(strengthLogs, shootingLogs, bodyMetrics);
    const content = kind === "json" ? JSON.stringify(bundle, null, 2) : strengthLogsCSV(strengthLogs);
    const blob = new Blob([content], { type: kind === "json" ? "application/json" : "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `baseline-export.${kind}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-5">
          <ScoreRing value={consistency} size={92} label="consistency" />
          <div>
            <p className="eyebrow">4-week block</p>
            <p className="mt-1 font-bold">{PHASES[phase].label}</p>
            <p className="mt-1 text-xs text-white/50">{days.size} training days logged · target 12</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-bold text-white/85">Trending up</p>
        <ul className="mt-2 space-y-1.5">
          {up.length ? up.map((m) => (
            <li key={m.label} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 text-readiness-green">▲</span>
              <span className="text-white/70">{m.caption}</span>
            </li>
          )) : <li className="text-xs text-white/40">Log a couple sessions to see trends.</li>}
        </ul>
        {down.length > 0 && (
          <>
            <p className="mt-4 text-sm font-bold text-white/85">Watch</p>
            <ul className="mt-2 space-y-1.5">
              {down.map((m) => (
                <li key={m.label} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-readiness-yellow">▼</span>
                  <span className="text-white/70">{m.caption}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => exportData("csv")}>Export CSV</Button>
        <Button variant="ghost" onClick={() => exportData("json")}>Export JSON</Button>
      </div>
    </div>
  );
}

/* --------------------------------- Strength --------------------------------- */
function Strength({ strengthLogs }: { strengthLogs: ReturnType<typeof useBaselineStore.getState>["strengthLogs"] }) {
  const ids = useMemo(() => loggedExerciseIds(strengthLogs).filter((id) => e1rmSeries(strengthLogs, id).length > 0), [strengthLogs]);
  const [exId, setExId] = useState(ids[0] ?? "");
  const activeId = ids.includes(exId) ? exId : ids[0] ?? "";
  const series = useMemo(() => e1rmSeries(strengthLogs, activeId), [strengthLogs, activeId]);
  const ma = useMemo(() => movingAverage(series, 4), [series]);
  const pr = useMemo(() => personalRecords(strengthLogs, activeId, Date.now()), [strengthLogs, activeId]);
  const name = STRENGTH_EXERCISES_BY_ID[activeId]?.name ?? activeId;
  const recentSets = strengthLogs.filter((s) => s.exerciseId === activeId).sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);

  if (ids.length === 0) return <Card><p className="text-sm text-white/50">No barbell/DB lifts with load logged yet.</p></Card>;

  return (
    <div className="space-y-4">
      <select value={activeId} onChange={(e) => setExId(e.target.value)} className="min-h-[52px] w-full rounded-2xl border border-white/[0.08] bg-court-850 px-4 text-base font-semibold text-white outline-none focus:border-amber-500/70">
        {ids.map((id) => <option key={id} value={id}>{STRENGTH_EXERCISES_BY_ID[id]?.name ?? id}</option>)}
      </select>

      <Card>
        <p className="eyebrow mb-1">Estimated 1RM · {name}</p>
        <LineChart points={series} ma={ma} unit="kg" />
        <p className="mt-2 text-xs text-white/55">{trendCaption(series, name, "kg")}</p>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <PRCard label="All-time" e1rm={pr.allTime?.e1rm} sub={pr.allTime ? `${pr.allTime.load}×${pr.allTime.reps}` : undefined} highlight={pr.isNewAllTime} />
        <PRCard label="90-day" e1rm={pr.d90?.e1rm} sub={pr.d90 ? `${pr.d90.load}×${pr.d90.reps}` : undefined} />
        <PRCard label="30-day" e1rm={pr.d30?.e1rm} sub={pr.d30 ? `${pr.d30.load}×${pr.d30.reps}` : undefined} />
      </div>
      {(pr.isNewAllTime || pr.repPRAtTopWeight) && (
        <p className="text-center text-xs font-semibold text-amber-400">
          {pr.isNewAllTime ? "New all-time estimated 1RM 🎯" : "Rep PR at your top weight — also worth celebrating."}
        </p>
      )}

      <Card>
        <p className="text-sm font-bold text-white/85">Recent sets</p>
        <div className="mt-2 divide-y divide-white/[0.05]">
          {recentSets.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="text-white/50">{new Date(s.timestamp).toLocaleDateString()}</span>
              <span className="font-semibold text-white/80">{s.load ? `${s.load}kg × ${s.reps}` : `${s.reps ?? s.groundContacts} reps`}{s.rir != null ? ` · RIR ${s.rir}` : ""}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PRCard({ label, e1rm, sub, highlight }: { label: string; e1rm?: number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`surface p-3 text-center ${highlight ? "!border-amber-500/50" : ""}`}>
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 font-display text-xl text-white">{e1rm != null ? e1rm : "—"}</p>
      <p className="text-[10px] text-white/40">{sub ?? "no data"}</p>
    </div>
  );
}

/* --------------------------------- Skill --------------------------------- */
function Skill({ shootingLogs, dnaVector }: { shootingLogs: ReturnType<typeof useBaselineStore.getState>["shootingLogs"]; dnaVector: Record<string, number> | null }) {
  const { byZone, overall } = useMemo(() => aggregateZones(shootingLogs), [shootingLogs]);
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white/85">Shooting by zone</p>
          {overall.pct != null && <p className="text-sm text-white/60">{Math.round(overall.pct * 100)}% overall ({overall.makes}/{overall.attempts})</p>}
        </div>
        <svg viewBox="0 0 300 240" width="100%" className="mt-3">
          <rect x={2} y={2} width={296} height={236} rx={8} fill="#141418" stroke="#26262e" />
          <circle cx={150} cy={22} r={9} fill="none" stroke="#3a3a44" strokeWidth={2} />
          <path d="M40,2 A150,150 0 0,0 260,2" fill="none" stroke="#26262e" strokeWidth={2} />
          <rect x={110} y={2} width={80} height={60} fill="none" stroke="#26262e" strokeWidth={2} />
          {SHOT_ZONES.map((z) => {
            const st = byZone[z.id];
            const pct = st?.pct ?? null;
            const color = pct == null ? "#3a3a44" : fatigueColor(100 - pct * 130); // green=good → invert
            return (
              <g key={z.id}>
                <circle cx={z.x} cy={z.y} r={16} fill={color} fillOpacity={pct == null ? 0.4 : 0.85} />
                <text x={z.x} y={z.y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0a0a0b">{pct == null ? "–" : `${Math.round(pct * 100)}`}</text>
              </g>
            );
          })}
        </svg>
        <p className="mt-1 text-[11px] text-white/40">Makes/attempts aggregated across sessions. Greener = higher clip.</p>
      </Card>

      {dnaVector && (
        <Card>
          <p className="text-sm font-bold text-white/85">Skill profile</p>
          <RadarChart axes={SUMMARY_CATEGORIES.map((c) => c.label)} series={[{ label: "You", color: "#f5a524", values: summaryScores(dnaVector as never).map((s) => s.value) }]} />
        </Card>
      )}
    </div>
  );
}

/* --------------------------------- Body --------------------------------- */
function Body({ strengthLogs, bodyMetrics, recovery, onOpenSettings, demoDataLoaded }: {
  strengthLogs: ReturnType<typeof useBaselineStore.getState>["strengthLogs"];
  bodyMetrics: ReturnType<typeof useBaselineStore.getState>["bodyMetrics"];
  recovery?: number;
  onOpenSettings: () => void;
  demoDataLoaded: boolean;
}) {
  const now = Date.now();
  const [view, setView] = useState<"front" | "back">("back");
  const [mode, setMode] = useState<"fatigue" | "neglect">("fatigue");
  const [selected, setSelected] = useState<MuscleId | null>(null);
  const calibration = useBaselineStore((s) => s.calibration);
  const calibrationLog = useBaselineStore((s) => s.calibrationLog);
  const applySorenessCheckIn = useBaselineStore((s) => s.applySorenessCheckIn);

  const fatigue = useMemo(
    () => computeAllMuscleFatigue({ sets: strengthLogs, now, calibration, systemic: recovery != null ? { recoveryScore: recovery } : undefined }),
    [strengthLogs, now, recovery, calibration],
  );
  const asymmetries = useMemo(() => asymmetryReport(strengthLogs, now).filter((a) => a.flagged), [strengthLogs, now]);
  const fatigueValues = useMemo(() => {
    const v: Partial<Record<MuscleId, number>> = {};
    for (const m of Object.keys(fatigue) as MuscleId[]) v[m] = fatigue[m].displayedPct;
    return v;
  }, [fatigue]);

  const neglectValues = useMemo(() => {
    const vol = weeklyVolumeByMuscle(strengthLogs, now, 4);
    const max = Math.max(1, ...Object.values(vol).map((x) => x ?? 0));
    const v: Partial<Record<MuscleId, number>> = {};
    for (const m of Object.keys(MUSCLES) as MuscleId[]) v[m] = Math.round(100 * (1 - (vol[m] ?? 0) / max));
    return v;
  }, [strengthLogs, now]);

  const values = mode === "fatigue" ? fatigueValues : neglectValues;

  const ranked = (Object.keys(fatigue) as MuscleId[]).map((m) => ({ m, pct: fatigue[m].displayedPct })).sort((a, b) => b.pct - a.pct);
  const most = ranked[0];
  const least = [...ranked].reverse().find((r) => r.pct >= 0) ?? ranked[ranked.length - 1];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-court-900/60 p-3 text-[11px] leading-relaxed text-white/50">
        This is <span className="font-semibold text-white/75">estimated training load</span>, modeled from what you logged — not measured from your tissue.
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SegmentedControl columns={2} value={view} onChange={setView} options={[{ value: "back", label: "Back" }, { value: "front", label: "Front" }]} />
        <SegmentedControl columns={2} value={mode} onChange={setMode} options={[{ value: "fatigue", label: "Fatigue" }, { value: "neglect", label: "Neglect" }]} />
      </div>

      {mode === "fatigue" && most && (
        <p className="text-center text-xs text-white/60">
          Most fatigued: <span className="font-semibold" style={{ color: fatigueColor(most.pct) }}>{MUSCLES[most.m].commonName} {Math.round(most.pct)}%</span>
          {least && <> · Freshest: <span className="font-semibold" style={{ color: fatigueColor(least.pct) }}>{MUSCLES[least.m].commonName} {Math.round(least.pct)}%</span></>}
        </p>
      )}

      <Card>
        <BodyMap2D view={view} values={values} mode={mode} selected={selected} onSelect={setSelected} />
        <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-white/50">
          <span>{mode === "fatigue" ? "Fresh" : "Well-trained"}</span>
          <span className="h-2 w-28 rounded-full" style={{ background: "linear-gradient(90deg,#34d399,#facc15,#fb923c,#f87171)" }} />
          <span>{mode === "fatigue" ? "Maxed" : "Neglected"}</span>
        </div>
      </Card>

      {selected && (
        <MuscleDetail muscle={selected} fatigue={fatigue[selected]} strengthLogs={strengthLogs} now={now} onClose={() => setSelected(null)} onOpenSettings={onOpenSettings} />
      )}

      {!demoDataLoaded && strengthLogs.length === 0 && (
        <p className="text-xs text-readiness-yellow">Few sessions logged — the map is probably underestimating.</p>
      )}

      {asymmetries.length > 0 && (
        <Card className="border-readiness-yellow/25">
          <p className="text-sm font-bold text-readiness-yellow">Worth watching · left/right</p>
          <ul className="mt-2 space-y-1.5">
            {asymmetries.slice(0, 3).map((a) => (
              <li key={a.muscle} className="flex items-center justify-between text-sm">
                <span className="text-white/75">{MUSCLES[a.muscle].commonName}</span>
                <span className="text-white/45">{a.deltaPct}% ({a.weakerSide === "l" ? "left" : "right"} lagging)</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-white/40">A compensation pattern shows up here before it shows up as an injury.</p>
        </Card>
      )}

      <SorenessCheckIn fatigue={fatigue} onSubmit={applySorenessCheckIn} adjustmentCount={calibrationLog.length} />

      <Card>
        <p className="eyebrow mb-1">Bodyweight (7-day average)</p>
        <LineChart points={bodyweightSeries(bodyMetrics)} ma={bodyweightMA(bodyMetrics)} unit="kg" emptyMessage="Log bodyweight to see the trend." />
      </Card>
      <Card>
        <p className="eyebrow mb-1">Vertical jump</p>
        <LineChart points={verticalSeries(bodyMetrics)} unit="in" emptyMessage="Log a jump test to start." />
      </Card>
    </div>
  );
}

function SorenessCheckIn({ fatigue, onSubmit, adjustmentCount }: {
  fatigue: ReturnType<typeof computeAllMuscleFatigue>;
  onSubmit: (reported: Partial<Record<MuscleId, number>>) => number;
  adjustmentCount: number;
}) {
  const top = (Object.keys(fatigue) as MuscleId[])
    .map((m) => ({ m, pct: fatigue[m].displayedPct }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);
  const [reported, setReported] = useState<Partial<Record<MuscleId, number>>>({});
  const [saved, setSaved] = useState<number | null>(null);

  const submit = () => {
    const n = onSubmit(reported);
    setSaved(n);
    setReported({});
    setTimeout(() => setSaved(null), 2600);
  };

  return (
    <Card>
      <p className="text-sm font-bold text-white/85">Morning check-in · anything sore?</p>
      <p className="mt-1 text-xs leading-relaxed text-white/50">
        Rate what&apos;s actually sore, 0–3. We compare it to the model&apos;s guess and quietly fit it to you — bounded, and every nudge is logged.
      </p>
      <div className="mt-3 space-y-2.5">
        {top.map(({ m }) => (
          <div key={m} className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/75">{MUSCLES[m].commonName}</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((n) => {
                const active = reported[m] === n;
                return (
                  <button
                    key={n}
                    onClick={() => setReported((r) => ({ ...r, [m]: n }))}
                    className={`pressable h-9 w-9 rounded-lg border text-sm font-bold ${active ? "border-amber-500/60 bg-amber-500/15 text-amber-300" : "border-white/[0.07] bg-court-850 text-white/45"}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Button variant={saved != null ? "ghost" : "primary"} disabled={Object.keys(reported).length === 0 && saved == null} onClick={submit}>
          {saved != null ? `Calibrated · ${saved} adjustment${saved === 1 ? "" : "s"}` : "Calibrate the model"}
        </Button>
      </div>
      {adjustmentCount > 0 && <p className="mt-2 text-[11px] text-white/35">{adjustmentCount} calibration adjustments logged (auditable).</p>}
    </Card>
  );
}

function MuscleDetail({ muscle, fatigue, strengthLogs, now, onClose, onOpenSettings }: {
  muscle: MuscleId;
  fatigue: ReturnType<typeof computeAllMuscleFatigue>[MuscleId];
  strengthLogs: ReturnType<typeof useBaselineStore.getState>["strengthLogs"];
  now: number;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const def = MUSCLES[muscle];
  const causes = causeBreakdown(muscle, strengthLogs, now, STRENGTH_EXERCISES_BY_ID);
  const targets = STRENGTH_EXERCISES.filter((e) => (e.muscleContributions[muscle] ?? 0) >= 0.25)
    .sort((a, b) => (b.muscleContributions[muscle] ?? 0) - (a.muscleContributions[muscle] ?? 0));
  const eta = fatigue.etaHours;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-bold">{def.displayName}</p>
          <p className="text-xs text-white/40">{def.commonName}</p>
        </div>
        <button onClick={onClose} className="text-sm font-semibold text-white/40 hover:text-white">Close</button>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <ScoreRing value={fatigue.displayedPct} size={88} color={fatigueColor(fatigue.displayedPct)} label={fatigueLabel(fatigue.displayedPct)} />
        <div className="text-sm">
          <p className="text-white/70">Estimated recovery</p>
          <p className="font-semibold">{eta == null ? "over a week out" : eta <= 0 ? "recovered" : eta < 24 ? `~${eta}h (${etaClock(now, eta)})` : `~${Math.round(eta / 24)} days`}</p>
          {fatigue.lowConfidence && <p className="mt-1 text-[11px] text-readiness-yellow">Low confidence — some sets logged without effort (RIR).</p>}
        </div>
      </div>

      {causes.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">What caused this</p>
          <ul className="mt-1.5 space-y-1">
            {causes.map((c) => (
              <li key={c.dateISO} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{new Date(c.dateISO + "T00:00:00").toLocaleDateString()} · {c.exercises[0]}{c.exercises.length > 1 ? ` +${c.exercises.length - 1}` : ""}</span>
                <span className="text-white/40">{Math.round(c.contributionPct)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">What targets this</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {targets.map((t) => (
            <span key={t.id} className="rounded-full border border-white/[0.08] bg-court-850 px-2.5 py-1 text-xs text-white/70">
              {t.name} · {Math.round((t.muscleContributions[muscle] ?? 0) * 100)}%
            </span>
          ))}
          {targets.length === 0 && <span className="text-xs text-white/40">No seeded drill isolates this yet.</span>}
        </div>
      </div>

      <button onClick={onOpenSettings} className="mt-4 text-xs font-semibold text-amber-400/80 hover:text-amber-300">
        Recovery uses your readiness source — change it in Settings →
      </button>
    </Card>
  );
}

function etaClock(now: number, hours: number): string {
  const d = new Date(now + hours * 3600000);
  return d.toLocaleString("en-US", { weekday: "short", hour: "numeric" });
}
