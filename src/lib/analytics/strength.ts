/**
 * Strength analytics (spec A.1). Pure — no components, no I/O. Every function is
 * safe with 0, 1, 2, or 400 data points.
 */

import { epleyOneRepMax, ONE_RM_MAX_TRUSTED_REPS, type LoggedSet } from "@/lib/core";

export interface SeriesPoint {
  dateISO: string;
  value: number;
}

export function dayISO(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Exercise ids present in the logs, most-logged first. */
export function loggedExerciseIds(logs: LoggedSet[]): string[] {
  const counts = new Map<string, number>();
  for (const s of logs) counts.set(s.exerciseId, (counts.get(s.exerciseId) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** Best estimated-1RM set per day for an exercise (trusted at ≤8 reps). */
export function e1rmSeries(logs: LoggedSet[], exerciseId: string): SeriesPoint[] {
  const byDay = new Map<string, number>();
  for (const s of logs) {
    if (s.exerciseId !== exerciseId || s.load == null || s.reps == null) continue;
    if (s.reps > ONE_RM_MAX_TRUSTED_REPS) continue;
    const e = epleyOneRepMax(s.load, s.reps);
    const d = dayISO(s.timestamp);
    byDay.set(d, Math.max(byDay.get(d) ?? 0, e));
  }
  return [...byDay.entries()]
    .map(([dateISO, value]) => ({ dateISO, value: Math.round(value * 10) / 10 }))
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
}

/** Total volume load (Σ reps × load) per day for an exercise. */
export function volumeLoadSeries(logs: LoggedSet[], exerciseId: string): SeriesPoint[] {
  const byDay = new Map<string, number>();
  for (const s of logs) {
    if (s.exerciseId !== exerciseId || s.load == null || s.reps == null) continue;
    const d = dayISO(s.timestamp);
    byDay.set(d, (byDay.get(d) ?? 0) + s.reps * s.load);
  }
  return [...byDay.entries()]
    .map(([dateISO, value]) => ({ dateISO, value: Math.round(value) }))
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
}

export interface PRRecord {
  e1rm: number;
  load: number;
  reps: number;
  dateISO: string;
}
export interface PRSummary {
  allTime: PRRecord | null;
  d90: PRRecord | null;
  d30: PRRecord | null;
  /** True if the most recent session set a new all-time estimated-1RM. */
  isNewAllTime: boolean;
  /** A rep PR at the all-time top weight (more reps than before at that load). */
  repPRAtTopWeight: boolean;
}

export function personalRecords(logs: LoggedSet[], exerciseId: string, now: number): PRSummary {
  const sets = logs
    .filter((s) => s.exerciseId === exerciseId && s.load != null && s.reps != null && s.reps <= ONE_RM_MAX_TRUSTED_REPS)
    .map((s) => ({ e1rm: epleyOneRepMax(s.load!, s.reps!), load: s.load!, reps: s.reps!, ts: s.timestamp }))
    .sort((a, b) => a.ts - b.ts);

  if (sets.length === 0) {
    return { allTime: null, d90: null, d30: null, isNewAllTime: false, repPRAtTopWeight: false };
  }

  const bestIn = (windowDays: number): PRRecord | null => {
    const cutoff = now - windowDays * 86_400_000;
    const inWin = sets.filter((s) => s.ts >= cutoff);
    if (inWin.length === 0) return null;
    const best = inWin.reduce((a, b) => (b.e1rm > a.e1rm ? b : a));
    return { e1rm: Math.round(best.e1rm * 10) / 10, load: best.load, reps: best.reps, dateISO: dayISO(best.ts) };
  };

  const allTimeBest = sets.reduce((a, b) => (b.e1rm > a.e1rm ? b : a));
  const last = sets[sets.length - 1]!;
  const priorBestE1rm = Math.max(0, ...sets.slice(0, -1).map((s) => s.e1rm));
  const topWeight = Math.max(...sets.map((s) => s.load));
  const priorMaxRepsAtTop = Math.max(0, ...sets.slice(0, -1).filter((s) => s.load === topWeight).map((s) => s.reps));

  return {
    allTime: { e1rm: Math.round(allTimeBest.e1rm * 10) / 10, load: allTimeBest.load, reps: allTimeBest.reps, dateISO: dayISO(allTimeBest.ts) },
    d90: bestIn(90),
    d30: bestIn(30),
    isNewAllTime: last.e1rm >= priorBestE1rm && last.e1rm === allTimeBest.e1rm,
    repPRAtTopWeight: last.load === topWeight && last.reps > priorMaxRepsAtTop,
  };
}

/** Simple trailing moving average over a series. Returns aligned MA points. */
export function movingAverage(points: SeriesPoint[], window: number): SeriesPoint[] {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((s, x) => s + x.value, 0) / slice.length;
    return { dateISO: p.dateISO, value: Math.round(avg * 10) / 10 };
  });
}
