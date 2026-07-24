"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, ScoreRing, SegmentedControl } from "@/components/ui";
import { ArrowRight, Bolt, Gear } from "@/components/icons";
import {
  autoregulate,
  formatHours,
  PHASES,
  type SeasonPhase,
} from "@/lib/core";
import { selectTodaySession } from "@/lib/today";
import { useBaselineStore } from "@/lib/store";

const ZONE_COLOR = { green: "#34d399", yellow: "#fbbf24", red: "#f87171" } as const;
const ZONE_LABEL = { green: "Recovered", yellow: "Moderate", red: "Depleted" } as const;
const SOURCE_LABEL = { mock: "Demo data", self: "Self-report", whoop: "WHOOP" } as const;

export default function TodayPage() {
  const router = useRouter();
  const {
    profile, gapReport, aspirationalArchetypeId, phase, availableEquipment,
    readiness, readinessLoaded, loadReadiness, setPhase, sessionLogs, wearableMode,
    alterEgo, subscription,
  } = useBaselineStore();
  const [hydrated, setHydrated] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !gapReport) router.replace("/onboarding");
  }, [hydrated, gapReport, router]);
  useEffect(() => {
    if (hydrated && !readinessLoaded) void loadReadiness();
  }, [hydrated, readinessLoaded, loadReadiness]);

  const today = useMemo(() => {
    if (!profile || !gapReport || !aspirationalArchetypeId || !readiness) return null;
    return selectTodaySession({
      profile, gapReport, aspirationalArchetypeId, phase, availableEquipment, readiness,
    });
  }, [profile, gapReport, aspirationalArchetypeId, phase, availableEquipment, readiness]);

  if (!hydrated || !gapReport || !profile) {
    return <div className="pt-24 text-center text-white/40">Loading…</div>;
  }

  const autoreg = readiness ? autoregulate(readiness) : null;
  const drillCount = today?.session?.blocks.reduce((n, b) => n + b.drills.length, 0) ?? 0;

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="eyebrow">Today{today ? ` · ${today.dayLabel}` : ""}</p>
          {alterEgo ? (
            <h1 className="mt-1 font-display text-3xl uppercase tracking-tight text-amber-500">{alterEgo.name}.</h1>
          ) : (
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
              {profile.displayName ? `Let's work, ${profile.displayName}.` : "Let's work."}
            </h1>
          )}
        </div>
        <Link href="/settings" aria-label="Settings" className="pressable rounded-xl p-1.5 text-white/40 hover:text-white">
          <Gear className="h-6 w-6" />
        </Link>
      </header>

      {/* READINESS */}
      <section className="mt-6 animate-fade-up">
        {readiness && autoreg ? (
          <Card>
            <div className="flex items-center gap-5">
              <ScoreRing value={readiness.recovery} size={104} label="recovery" color={ZONE_COLOR[autoreg.zone]} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ZONE_COLOR[autoreg.zone] }} />
                  <span className="text-sm font-bold" style={{ color: ZONE_COLOR[autoreg.zone] }}>
                    {ZONE_LABEL[autoreg.zone]}
                  </span>
                  <span className="ml-auto rounded bg-court-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/40">
                    {SOURCE_LABEL[readiness.source]}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{autoreg.message}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat label="Sleep" value={formatHours(readiness.sleepHours)} />
              {readiness.source === "self" ? (
                <Stat label="Source" value="You" />
              ) : (
                <Stat label="HRV" value={`${readiness.hrvMs}ms`} />
              )}
              <Stat label={readiness.source === "self" ? "Strain" : "Day strain"} value={readiness.source === "self" ? "—" : readiness.dayStrain.toFixed(1)} />
            </div>
            <button onClick={() => setShowWhy((v) => !v)} className="mt-3 text-xs font-semibold text-amber-400/80 hover:text-amber-300">
              {showWhy ? "Hide" : "Why this number?"}
            </button>
            {showWhy && (
              <ul className="mt-2 space-y-1">
                {autoreg.reasons.map((r) => (
                  <li key={r} className="text-xs leading-relaxed text-white/50">• {r}</li>
                ))}
              </ul>
            )}
          </Card>
        ) : !readinessLoaded ? (
          <Card><p className="text-sm text-white/50">Reading your recovery…</p></Card>
        ) : (
          <Card>
            <p className="text-sm font-bold text-white/85">
              {wearableMode === "whoop" ? "WHOOP has no reading yet" : "No check-in yet"}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-white/50">
              {wearableMode === "whoop"
                ? "Connect WHOOP or switch source in Settings. We won't fake a recovery score."
                : "Log this morning's sleep and how you feel, and we'll autoregulate off it."}
            </p>
            <button onClick={() => router.push("/settings")} className="mt-3 text-sm font-semibold text-amber-400 hover:text-amber-300">
              Open Settings →
            </button>
          </Card>
        )}
      </section>

      {/* THE WEEK — mentality module entry */}
      <section className="mt-6 animate-fade-up" style={{ animationDelay: "40ms" }}>
        <button
          onClick={() => router.push(subscription.active ? "/week" : "/paywall")}
          className="pressable surface flex w-full items-center gap-4 p-4 text-left"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 to-orange-500/10 font-display text-lg text-amber-400">W</span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">The Week{subscription.active ? "" : " · Premium"}</p>
            <p className="mt-0.5 font-bold leading-tight">{alterEgo ? "Train the thing holding you back." : "Meet the version who takes the last shot."}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-white/30" />
        </button>
      </section>

      {/* TODAY'S SESSION — needs a readiness reading to autoregulate */}
      {readiness && (
      <section className="mt-6 animate-fade-up" style={{ animationDelay: "80ms" }}>
        {today?.isRest ? (
          <Card className="text-center">
            <p className="font-display text-2xl text-amber-500">REST DAY</p>
            <p className="mt-2 text-sm text-white/55">Your plan has you off today. Recovery is training too — stay loose, hydrate, sleep.</p>
          </Card>
        ) : today?.session ? (
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{today.session.phaseLabel} · {today.session.domain === "gym" ? "Gym" : "Court"}</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight">{today.session.title}</h2>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-2xl leading-none text-white">{today.session.estimatedMinutes}</p>
                <p className="text-[10px] text-white/40">min</p>
              </div>
            </div>

            {today.session.downgradedFrom && (
              <p className="mt-3 rounded-xl border border-readiness-yellow/25 bg-readiness-yellow/[0.08] p-3 text-xs leading-relaxed text-readiness-yellow">
                Recovery&apos;s low, so we swapped your gym day for skill &amp; mobility. Grind another day — today you bank technique.
              </p>
            )}

            <div className="mt-4 space-y-1.5">
              {today.session.blocks.map((b) => (
                <div key={b.name} className="flex items-center justify-between text-sm">
                  <span className="text-white/75">{b.name}</span>
                  <span className="text-white/35">{b.drills.length} {b.drills.length === 1 ? "drill" : "drills"}</span>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <Button onClick={() => router.push("/session")}>
                <Bolt className="h-5 w-5" /> Start session · {drillCount} drills
              </Button>
            </div>
          </Card>
        ) : (
          <Card><p className="text-sm text-white/50">Building today&apos;s session…</p></Card>
        )}
      </section>
      )}

      {/* WHAT WE'RE ATTACKING */}
      <section className="mt-6 animate-fade-up" style={{ animationDelay: "160ms" }}>
        <p className="eyebrow mb-2">What we&apos;re building toward</p>
        <div className="flex flex-wrap gap-2">
          {gapReport.gaps.map((g) => (
            <span key={g.dimension} className="rounded-full border border-white/[0.08] bg-court-850 px-3 py-1.5 text-xs font-semibold text-white/70">
              {g.label}
            </span>
          ))}
        </div>
      </section>

      {/* PHASE CONTROL */}
      <section className="mt-6 animate-fade-up" style={{ animationDelay: "240ms" }}>
        <Card>
          <p className="text-sm font-bold text-white/85">Season phase</p>
          <p className="mt-1 text-xs leading-relaxed text-white/45">{PHASES[phase].description}</p>
          <div className="mt-3">
            <SegmentedControl
              columns={2}
              value={phase}
              onChange={(p) => setPhase(p)}
              options={(Object.keys(PHASES) as SeasonPhase[]).map((p) => ({ value: p, label: PHASES[p].label }))}
            />
          </div>
          <p className="mt-2 text-[11px] text-white/30">Auto-detected from your calendar in Phase 4. For now, set it here.</p>
        </Card>
      </section>

      {sessionLogs.length > 0 && (
        <section className="mt-6 animate-fade-up" style={{ animationDelay: "320ms" }}>
          <p className="eyebrow mb-2">Recent sessions</p>
          <div className="space-y-2">
            {sessionLogs.slice(0, 3).map((log) => (
              <div key={log.id} className="surface flex items-center justify-between p-3.5">
                <div>
                  <p className="text-sm font-semibold">{log.title}</p>
                  <p className="text-xs text-white/40">{new Date(log.completedAt).toLocaleDateString()} · {log.entries.filter((e) => !e.skipped).length} drills</p>
                </div>
                <ArrowRight className="h-4 w-4 text-white/25" />
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-court-800 py-2">
      <p className="font-display text-base leading-none text-white">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-white/40">{label}</p>
    </div>
  );
}
