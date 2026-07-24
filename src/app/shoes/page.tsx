"use client";

import { useMemo, useState } from "react";
import { Button, Card, SegmentedControl } from "@/components/ui";
import { ArrowRight } from "@/components/icons";
import {
  matchShoes, PLAYSTYLE_LABELS, SHOE_CATALOG, SHOE_DATA_SOURCE,
  type Playstyle, type ShoeMatch, type ShoeQuiz,
} from "@/lib/shoes";
import { useBaselineStore } from "@/lib/store";

export default function ShoesPage() {
  const profile = useBaselineStore((s) => s.profile);
  const defaultWeight: ShoeQuiz["playerWeight"] = useMemo(() => {
    const lb = profile?.anthropometrics.weightLb ?? 185;
    return lb < 175 ? "light" : lb > 210 ? "heavy" : "mid";
  }, [profile]);

  const [q, setQ] = useState<ShoeQuiz>({
    footWidth: "standard", playerWeight: defaultWeight, playstyle: "all_around",
    injuries: [], surface: "indoor", cutPref: "any", budget: "any", brandPref: null,
  });
  const [results, setResults] = useState<ShoeMatch[] | null>(null);
  const set = (patch: Partial<ShoeQuiz>) => setQ((cur) => ({ ...cur, ...patch }));
  const toggleInjury = (i: "ankle" | "knee" | "plantar") =>
    set({ injuries: q.injuries.includes(i) ? q.injuries.filter((x) => x !== i) : [...q.injuries, i] });

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Shoe Finder</h1>
        <span className="font-display text-base text-amber-500">BASELINE</span>
      </header>

      {!results ? (
        <div className="mt-5 space-y-5 animate-fade-up">
          <Q label="Foot width">
            <SegmentedControl columns={4} value={q.footWidth} onChange={(v) => set({ footWidth: v })}
              options={[{ value: "narrow", label: "Narrow" }, { value: "standard", label: "Std" }, { value: "wide", label: "Wide" }, { value: "xwide", label: "X-Wide" }]} />
          </Q>
          <Q label="Your build">
            <SegmentedControl columns={3} value={q.playerWeight} onChange={(v) => set({ playerWeight: v })}
              options={[{ value: "light", label: "Light" }, { value: "mid", label: "Mid" }, { value: "heavy", label: "Heavy" }]} />
          </Q>
          <Q label="Playstyle">
            <SegmentedControl columns={2} value={q.playstyle} onChange={(v) => set({ playstyle: v })}
              options={(Object.keys(PLAYSTYLE_LABELS) as Playstyle[]).map((p) => ({ value: p, label: PLAYSTYLE_LABELS[p] }))} />
          </Q>
          <Q label="Surface">
            <SegmentedControl columns={3} value={q.surface} onChange={(v) => set({ surface: v })}
              options={[{ value: "indoor", label: "Indoor" }, { value: "outdoor", label: "Blacktop" }, { value: "both", label: "Both" }]} />
          </Q>
          <Q label="Injury history">
            <div className="grid grid-cols-3 gap-2">
              {(["ankle", "knee", "plantar"] as const).map((i) => (
                <button key={i} onClick={() => toggleInjury(i)}
                  className={`pressable min-h-[48px] rounded-xl border text-sm font-semibold capitalize ${q.injuries.includes(i) ? "border-amber-500/60 bg-amber-500/[0.14] text-amber-300" : "border-white/[0.07] bg-court-850 text-white/60"}`}>
                  {i}
                </button>
              ))}
            </div>
          </Q>
          <Q label="Cut preference" hint="Heads up: research doesn't show high-tops meaningfully prevent ankle sprains — fit, proprioception, and ankle strength matter more.">
            <SegmentedControl columns={4} value={q.cutPref} onChange={(v) => set({ cutPref: v })}
              options={[{ value: "low", label: "Low" }, { value: "mid", label: "Mid" }, { value: "high", label: "High" }, { value: "any", label: "Any" }]} />
          </Q>
          <Q label="Budget">
            <SegmentedControl columns={4} value={q.budget} onChange={(v) => set({ budget: v })}
              options={[{ value: "$", label: "$" }, { value: "$$", label: "$$" }, { value: "$$$", label: "$$$" }, { value: "any", label: "Any" }]} />
          </Q>
          <Button onClick={() => setResults(matchShoes(q))}>Find my shoes <ArrowRight className="h-5 w-5" /></Button>
        </div>
      ) : (
        <div className="mt-5 space-y-3 animate-fade-up">
          <button onClick={() => setResults(null)} className="text-sm font-semibold text-amber-400 hover:text-amber-300">← Adjust answers</button>
          {results.map((m, i) => (
            <Card key={m.shoe.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-500">#{i + 1} · {m.shoe.brand}</p>
                  <p className="mt-0.5 text-lg font-bold leading-tight">{m.shoe.name}</p>
                  <p className="text-xs text-white/40">{m.shoe.cut}-cut · {m.shoe.fit} fit · {m.shoe.priceBand} · {m.shoe.approxMSRP}</p>
                </div>
                <span className="rounded-full bg-court-800 px-2.5 py-1 text-xs font-bold text-white/70">{m.score}</span>
              </div>
              <ul className="mt-3 space-y-1">
                {m.reasons.map((r) => <li key={r} className="flex gap-2 text-sm text-white/75"><span className="text-readiness-green">✓</span>{r}</li>)}
              </ul>
              <p className="mt-2 text-xs text-readiness-yellow">Tradeoff: {m.tradeoff}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                {m.budgetAlt && <span className="rounded-full border border-white/[0.08] bg-court-850 px-2.5 py-1 text-white/60">Budget pick: {m.budgetAlt.name}</span>}
                {m.alsoTry.map((s) => <span key={s.id} className="rounded-full border border-white/[0.08] bg-court-850 px-2.5 py-1 text-white/60">Also try: {s.name}</span>)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-[11px] leading-relaxed text-white/35">
        Ratings are Baseline&apos;s editorial estimates; prices are list-price bands — verify current retail.
        <br />Reviews &amp; data reference: <a href={SHOE_DATA_SOURCE.url} target="_blank" rel="noreferrer" className="underline hover:text-white/60">{SHOE_DATA_SOURCE.name} ↗</a> · Catalog last updated {SHOE_CATALOG.lastUpdated}.
      </p>
    </div>
  );
}

function Q({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-white/80">{label}</p>
      {children}
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">{hint}</p>}
    </div>
  );
}
