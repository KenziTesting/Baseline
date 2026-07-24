/**
 * Mental metrics (spec Part D). Pure. The headline metric is the pressure-FT GAP
 * (pressured % vs unpressured %) — watch it close. Every value here is logged by
 * the athlete; nothing is invented.
 */

import type { SeriesPoint } from "@/lib/analytics";
import type {
  FocusRating, MSIDimension, MSIResult, PressureFT, ResetTimeLog, TensionAudit,
} from "./types";

export function pct(makes: number, attempts: number): number | null {
  return attempts > 0 ? Math.round((makes / attempts) * 100) : null;
}

export interface PressureGap {
  unpressured: number | null;
  pressured: number | null;
  /** unpressured − pressured. The mental metric. Positive = pressure still costs you. */
  gap: number | null;
}
export function pressureGap(ft: PressureFT): PressureGap {
  const u = pct(ft.unpressuredMakes, ft.unpressuredAttempts);
  const p = pct(ft.pressuredMakes, ft.pressuredAttempts);
  return { unpressured: u, pressured: p, gap: u != null && p != null ? u - p : null };
}
export function pressureGapSeries(fts: PressureFT[]): SeriesPoint[] {
  return fts
    .map((f) => ({ dateISO: f.dateISO, value: pressureGap(f).gap ?? 0 }))
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
}

export function tensionAverage(a: TensionAudit): number {
  return Math.round(((a.jaw + a.shoulders + a.hands + a.breath + a.forehead) / 5) * 10) / 10;
}
export function tensionSeries(audits: TensionAudit[], key?: keyof Omit<TensionAudit, "dateISO">): SeriesPoint[] {
  return audits
    .map((a) => ({ dateISO: a.dateISO, value: key ? a[key] : tensionAverage(a) }))
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
}

export function resetTimeAverage(logs: ResetTimeLog[]): number | null {
  if (logs.length === 0) return null;
  return Math.round((logs.reduce((s, l) => s + l.rating, 0) / logs.length) * 10) / 10;
}

export function intentionCompletionRate(grades: number[]): number | null {
  if (grades.length === 0) return null;
  return Math.round((grades.reduce((s, g) => s + g, 0) / (grades.length * 3)) * 100);
}

/** Focus-vs-sleep insight from the athlete's OWN data (spec D.5). Null until enough paired data. */
export function focusSleepInsight(ratings: FocusRating[]): { under: number; over: number; delta: number } | null {
  const withSleep = ratings.filter((r) => r.sleepHours != null);
  const under = withSleep.filter((r) => (r.sleepHours ?? 0) < 6);
  const over = withSleep.filter((r) => (r.sleepHours ?? 0) >= 6);
  if (under.length < 2 || over.length < 2) return null;
  const avg = (xs: FocusRating[]) => xs.reduce((s, r) => s + r.rating, 0) / xs.length;
  const u = avg(under);
  const o = avg(over);
  return { under: Math.round(u * 10) / 10, over: Math.round(o * 10) / 10, delta: Math.round((o - u) * 10) / 10 };
}

/* ------------------------- Mental Skills Inventory ------------------------- */

export interface MSIItem {
  id: string;
  dimension: MSIDimension;
  text: string;
}

export const MSI_DIMENSIONS: MSIDimension[] = ["confidence", "focus", "resilience", "competitiveness", "pressure_tolerance"];

/** 20-item inventory, 4 per dimension. 1 (never) – 5 (always). */
export const MSI_ITEMS: MSIItem[] = [
  { id: "c1", dimension: "confidence", text: "I expect to make the next shot even after missing three." },
  { id: "c2", dimension: "confidence", text: "I want the ball in the final minute." },
  { id: "c3", dimension: "confidence", text: "I play my game regardless of who's guarding me." },
  { id: "c4", dimension: "confidence", text: "A bad first quarter doesn't shrink me." },
  { id: "f1", dimension: "focus", text: "I stay locked in when the crowd or bench gets loud." },
  { id: "f2", dimension: "focus", text: "I let go of a bad call within one possession." },
  { id: "f3", dimension: "focus", text: "I know my job on every possession before it starts." },
  { id: "f4", dimension: "focus", text: "My mind is quiet at the free-throw line." },
  { id: "r1", dimension: "resilience", text: "I compete just as hard when we're down 20." },
  { id: "r2", dimension: "resilience", text: "A turnover doesn't lead to another turnover." },
  { id: "r3", dimension: "resilience", text: "I recover fast after a mistake." },
  { id: "r4", dimension: "resilience", text: "Setbacks make me more deliberate, not more frantic." },
  { id: "k1", dimension: "competitiveness", text: "I do the unglamorous work nobody's watching." },
  { id: "k2", dimension: "competitiveness", text: "I hate losing more than I like winning." },
  { id: "k3", dimension: "competitiveness", text: "I sprint back on defense in a scrimmage." },
  { id: "k4", dimension: "competitiveness", text: "I finish the last rep as clean as the first." },
  { id: "p1", dimension: "pressure_tolerance", text: "My skills hold up when it matters most." },
  { id: "p2", dimension: "pressure_tolerance", text: "I breathe on purpose before a big possession." },
  { id: "p3", dimension: "pressure_tolerance", text: "Pressure feels like fuel, not a threat." },
  { id: "p4", dimension: "pressure_tolerance", text: "I trust my preparation when the game is close." },
];

/** Score 20 answers (1-5) → 0-100 per dimension. */
export function scoreMSI(answers: Record<string, number>, dateISO: string): MSIResult {
  const scores = {} as Record<MSIDimension, number>;
  for (const dim of MSI_DIMENSIONS) {
    const items = MSI_ITEMS.filter((i) => i.dimension === dim);
    const vals = items.map((i) => answers[i.id]).filter((v): v is number => v != null);
    scores[dim] = vals.length ? Math.round(((vals.reduce((s, v) => s + v, 0) / vals.length - 1) / 4) * 100) : 0;
  }
  return { dateISO, scores };
}
