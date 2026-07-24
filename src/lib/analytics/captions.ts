/**
 * Plain-language chart captions generated FROM THE DATA (spec A.3) — never from
 * an LLM. Deterministic strings a developer can trace to the numbers.
 */

import type { SeriesPoint } from "./strength";

function niceDate(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** e.g. "Up 12.5 kg on Trap-Bar Deadlift since Apr 2." */
export function trendCaption(series: SeriesPoint[], label: string, unit: string): string {
  if (series.length === 0) return `No ${label} logged yet — log a session to start the trend.`;
  if (series.length === 1) return `First ${label} data point logged ${niceDate(series[0]!.dateISO)}. One more makes a trend.`;
  const first = series[0]!;
  const last = series[series.length - 1]!;
  const delta = Math.round((last.value - first.value) * 10) / 10;
  const since = niceDate(first.dateISO);
  if (Math.abs(delta) < 0.05) return `${label} flat at ${last.value} ${unit} since ${since}.`;
  return `${delta > 0 ? "Up" : "Down"} ${Math.abs(delta)} ${unit} on ${label} since ${since}.`;
}

export interface Mover {
  label: string;
  deltaPct: number;
  caption: string;
}

/** Rank series by % change; used for the Overview "trending up / down" summary. */
export function rankMovers(entries: { label: string; unit: string; series: SeriesPoint[] }[]): Mover[] {
  return entries
    .filter((e) => e.series.length >= 2)
    .map((e) => {
      const first = e.series[0]!.value || 1;
      const last = e.series[e.series.length - 1]!.value;
      return { label: e.label, deltaPct: ((last - first) / Math.abs(first)) * 100, caption: trendCaption(e.series, e.label, e.unit) };
    })
    .sort((a, b) => b.deltaPct - a.deltaPct);
}
