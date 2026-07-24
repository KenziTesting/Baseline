/**
 * Volume & load distribution (spec A.1). Muscle volume reuses the fatigue
 * engine's stimulus units so "volume by muscle" and "fatigue" share one source
 * of truth (the contribution weights). Pure.
 */

import {
  estimateExerciseOneRM,
  setBaseStimulus,
  STRENGTH_EXERCISES_BY_ID,
  MUSCLES,
  type Exercise,
  type LoggedSet,
  type MovementPattern,
  type MuscleId,
} from "@/lib/core";

const WEEK = 7 * 86_400_000;

function weekIndex(ts: number, now: number): number {
  return Math.floor((now - ts) / WEEK);
}

/** Weekly stimulus by movement pattern for the last `weeks` weeks. */
export function weeklyVolumeByPattern(
  logs: LoggedSet[],
  now: number,
  weeks = 4,
  lib: Record<string, Exercise> = STRENGTH_EXERCISES_BY_ID,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const s of logs) {
    const ex = lib[s.exerciseId];
    if (!ex) continue;
    if (weekIndex(s.timestamp, now) >= weeks || s.timestamp > now) continue;
    const su = setBaseStimulus(s, ex, s.e1RM ?? estimateExerciseOneRM(logs, s.exerciseId));
    totals[ex.pattern] = (totals[ex.pattern] ?? 0) + su;
  }
  return round(totals) as Record<MovementPattern, number>;
}

/** Weekly stimulus by muscle group for the last `weeks` weeks (uses contributions). */
export function weeklyVolumeByMuscle(
  logs: LoggedSet[],
  now: number,
  weeks = 4,
  lib: Record<string, Exercise> = STRENGTH_EXERCISES_BY_ID,
): Partial<Record<MuscleId, number>> {
  const totals: Partial<Record<MuscleId, number>> = {};
  for (const s of logs) {
    const ex = lib[s.exerciseId];
    if (!ex) continue;
    if (weekIndex(s.timestamp, now) >= weeks || s.timestamp > now) continue;
    const su = setBaseStimulus(s, ex, s.e1RM ?? estimateExerciseOneRM(logs, s.exerciseId));
    for (const [m, c] of Object.entries(ex.muscleContributions)) {
      const id = m as MuscleId;
      totals[id] = (totals[id] ?? 0) + su * (c ?? 0);
    }
  }
  for (const k of Object.keys(totals) as MuscleId[]) totals[k] = Math.round((totals[k] ?? 0) * 10) / 10;
  return totals;
}

/** Plyometric ground contacts per week — tracked separately (spec A.1). */
export function plyoContactsPerWeek(logs: LoggedSet[], now: number, weeks = 6, lib: Record<string, Exercise> = STRENGTH_EXERCISES_BY_ID): number[] {
  const bins = new Array<number>(weeks).fill(0);
  for (const s of logs) {
    const ex = lib[s.exerciseId];
    if (!ex?.countsPlyoContacts || s.timestamp > now) continue;
    const w = weekIndex(s.timestamp, now);
    if (w >= weeks) continue;
    bins[w]! += s.groundContacts ?? s.reps ?? 0;
  }
  return bins; // index 0 = this week
}

export interface ImbalanceReport {
  posterior: number;
  quad: number;
  ratio: number;
  message: string;
}

/** Posterior chain vs quad volume over 4 weeks (spec A.1 example). */
export function posteriorChainBalance(logs: LoggedSet[], now: number, lib: Record<string, Exercise> = STRENGTH_EXERCISES_BY_ID): ImbalanceReport {
  const byMuscle = weeklyVolumeByMuscle(logs, now, 4, lib);
  const posterior = (byMuscle.glute_max ?? 0) + (byMuscle.glute_med ?? 0) + (byMuscle.hamstring ?? 0) + (byMuscle.erector_spinae ?? 0);
  const quad = byMuscle.quad ?? 0;
  const ratio = quad > 0 ? posterior / quad : 0;
  const pct = Math.round(ratio * 100);
  let message: string;
  if (quad === 0) message = "Not enough lower-body volume logged yet to assess balance.";
  else if (ratio >= 0.9) message = `Posterior chain is ${pct}% of your quad volume — well balanced for a jumper (target ~1:1).`;
  else message = `Posterior chain volume is ${pct}% of your quad volume over 4 weeks. Target for a jumper is closer to 1:1 — add hinge and hamstring work.`;
  return { posterior: Math.round(posterior), quad: Math.round(quad), ratio: Math.round(ratio * 100) / 100, message };
}

function round(obj: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = Math.round(v * 10) / 10;
  return out;
}
