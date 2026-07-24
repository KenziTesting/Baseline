"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ScoreRing } from "@/components/ui";
import { ArrowRight } from "@/components/icons";
import { RadarChart } from "@/components/RadarChart";
import {
  ARCHETYPES,
  ARCHETYPES_BY_ID,
  DIMENSIONS_BY_KEY,
  SUMMARY_CATEGORIES,
  summaryScores,
} from "@/lib/core";
import { useBaselineStore } from "@/lib/store";

export default function RevealPage() {
  const router = useRouter();
  const { dna, match, aspirationalArchetypeId, isUserOverride, gapReport, setAspirational } =
    useBaselineStore();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (hydrated && !dna) router.replace("/onboarding");
  }, [hydrated, dna, router]);

  const radar = useMemo(() => {
    if (!dna || !aspirationalArchetypeId) return null;
    const aspirational = ARCHETYPES_BY_ID[aspirationalArchetypeId]!;
    return {
      axes: SUMMARY_CATEGORIES.map((c) => c.label),
      you: summaryScores(dna.vector).map((s) => s.value),
      them: summaryScores(aspirational.dna).map((s) => s.value),
    };
  }, [dna, aspirationalArchetypeId]);

  if (!hydrated || !dna || !match || !gapReport) {
    return <div className="pt-24 text-center text-white/40">Loading your profile…</div>;
  }

  const gameComp = match.bestGameComp;
  const buildComp = match.bestBuildComp;
  const aspirational = ARCHETYPES_BY_ID[aspirationalArchetypeId ?? gameComp.archetype.id]!;

  return (
    <div className="pb-28">
      {/* HERO */}
      <section className="relative animate-scale-in pt-4 text-center">
        <div className="pointer-events-none absolute inset-x-0 -top-8 mx-auto h-52 w-52 animate-glow-pulse rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 blur-3xl" />
        <p className="eyebrow relative">Your game most resembles</p>
        <h1 className="relative mt-3 font-display text-[42px] uppercase leading-[0.92] tracking-tight">
          <span className="bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
            {gameComp.archetype.name}
          </span>
        </h1>
        <p className="relative mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-white/60">
          {gameComp.archetype.blurb}
        </p>

        <div className="relative mt-6 flex items-center justify-center gap-6">
          <ScoreRing value={gameComp.gameComp} label="game match" />
        </div>

        <div className="relative mt-5 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-white/[0.07] bg-court-850/80 px-4 py-2.5 text-sm">
          <span className="text-white/40">NBA</span>
          <span className="font-bold">{gameComp.archetype.nbaReference}</span>
          <span className="text-white/15">•</span>
          <span className="text-white/40">NCAA</span>
          <span className="font-bold">{gameComp.archetype.collegeReference}</span>
        </div>
      </section>

      {/* BUILD vs GAME */}
      <section className="mt-8 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <p className="eyebrow mb-3">Build comp vs. game comp</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Built like</p>
            <p className="mt-1.5 font-bold leading-tight">{buildComp.archetype.name}</p>
            <p className="mt-2 font-display text-2xl text-white">{buildComp.buildComp}<span className="text-sm text-white/40">%</span></p>
            <p className="text-[11px] text-white/40">frame match</p>
          </div>
          <div className="surface p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Play like</p>
            <p className="mt-1.5 font-bold leading-tight">{gameComp.archetype.name}</p>
            <p className="mt-2 font-display text-2xl text-amber-400">{gameComp.gameComp}<span className="text-sm text-white/40">%</span></p>
            <p className="text-[11px] text-white/40">game match</p>
          </div>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-white/40">
          Your frame and your game aren&apos;t the same story — and that&apos;s fine. You train toward a game,
          not a body.
        </p>
      </section>

      {/* RADAR */}
      {radar && (
        <section className="mt-8 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <Card>
            <p className="text-sm font-bold text-white/85">You vs. {aspirational.name}</p>
            <div className="mt-2">
              <RadarChart
                axes={radar.axes}
                series={[
                  { label: "You", color: "#f5a524", values: radar.you },
                  { label: aspirational.name, color: "#4c9ffe", values: radar.them },
                ]}
              />
            </div>
            <div className="mt-1 flex justify-center gap-5 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> You</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-electric" /> {aspirational.name}</span>
            </div>
          </Card>
        </section>
      )}

      {/* TOP 3 */}
      <section className="mt-8 animate-fade-up" style={{ animationDelay: "240ms" }}>
        <p className="eyebrow mb-3">Your closest three</p>
        <div className="space-y-2.5">
          {match.top.map((m, i) => (
            <div key={m.archetype.id} className="surface flex items-center gap-3 p-4">
              <span className={`font-display text-xl ${i === 0 ? "text-amber-400" : "text-white/30"}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{m.archetype.name}</p>
                <p className="truncate text-xs text-white/40">{m.archetype.nbaReference}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl leading-none text-white">{m.overall}<span className="text-xs text-white/40">%</span></p>
                <p className="mt-1 text-[10px] text-white/35">build {m.buildComp} · game {m.gameComp}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GAP REPORT */}
      <section className="mt-8 animate-fade-up" style={{ animationDelay: "320ms" }}>
        <Card>
          <p className="text-sm font-bold text-white/85">
            What {aspirational.name} does that you don&apos;t — yet
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/45">
            Your five biggest gaps toward this game. This is exactly what your plan will attack.
          </p>
          <div className="mt-5 space-y-4">
            {gapReport.gaps.map((g) => (
              <div key={g.dimension}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="flex items-center gap-2 text-white/80">
                    {DIMENSIONS_BY_KEY[g.dimension].label}
                    {g.isDefining && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400">
                        Signature
                      </span>
                    )}
                  </span>
                  <span className="font-display text-sm text-white/45">+{Math.round(g.delta)}</span>
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full bg-court-800">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-court-500" style={{ width: `${g.userValue}%` }} />
                  <div className="absolute inset-y-0 rounded-full bg-gradient-to-r from-amber-500/70 to-amber-400" style={{ left: `${g.userValue}%`, width: `${g.archetypeValue - g.userValue}%` }} />
                </div>
              </div>
            ))}
            {gapReport.gaps.length === 0 && (
              <p className="text-sm text-white/50">
                You already meet or exceed this archetype across the board. Pick a tougher target below.
              </p>
            )}
          </div>
        </Card>
      </section>

      {/* OVERRIDE */}
      <section className="mt-8 animate-fade-up" style={{ animationDelay: "400ms" }}>
        <Card>
          <p className="text-sm font-bold text-white/85">Train toward someone else?</p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/45">
            The algorithm picked {gameComp.archetype.name}. You get the final say — the gaps update instantly.
          </p>
          <select
            value={aspirationalArchetypeId ?? ""}
            onChange={(e) => setAspirational(e.target.value, e.target.value !== gameComp.archetype.id)}
            className="mt-3 min-h-[56px] w-full rounded-2xl border border-white/[0.08] bg-court-850 px-4 text-base font-semibold text-white outline-none focus:border-amber-500/70"
          >
            {ARCHETYPES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.nbaReference}
              </option>
            ))}
          </select>
          {isUserOverride && (
            <p className="mt-2.5 text-xs text-amber-400/80">
              Training toward your pick, not the algorithm&apos;s. Bold. We&apos;ll hold you to it.
            </p>
          )}
        </Card>
      </section>

      <div className="mt-8">
        <Button onClick={() => router.push("/today")}>
          Build my plan <ArrowRight className="h-5 w-5" />
        </Button>
      </div>

      <p className="mt-4 text-center text-[11px] text-white/25">
        Engine v{dna.engineVersion} · inputs {dna.inputHash} · reproducible
      </p>
    </div>
  );
}
