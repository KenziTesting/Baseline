/**
 * Left/right asymmetry detection (spec D.3). Fatigue tells you what to rest;
 * asymmetry catches a compensation pattern early. Pure. Only unilateral sets that
 * carry a `side` contribute; a muscle with no sided data is simply not reported.
 */

import type { Exercise } from "../strength/exercise";
import { STRENGTH_EXERCISES_BY_ID } from "../strength/library";
import type { MuscleId } from "../strength/muscles";
import { ASYMMETRY_FLAG_PCT } from "./constants";
import { estimateExerciseOneRM, setBaseStimulus, type LoggedSet } from "./engine";

export interface Asymmetry {
  muscle: MuscleId;
  left: number;
  right: number;
  /** |left − right| / max(left, right) × 100. */
  deltaPct: number;
  /** The under-trained side, or null when balanced. */
  weakerSide: "l" | "r" | null;
  flagged: boolean;
}

export function asymmetryReport(
  logs: LoggedSet[],
  now: number,
  windowDays = 28,
  lib: Record<string, Exercise> = STRENGTH_EXERCISES_BY_ID,
): Asymmetry[] {
  const acc = new Map<MuscleId, { l: number; r: number }>();
  for (const s of logs) {
    if (!s.side) continue;
    const ex = lib[s.exerciseId];
    if (!ex || (now - s.timestamp) / 86_400_000 >= windowDays || s.timestamp > now) continue;
    const su = setBaseStimulus(s, ex, s.e1RM ?? estimateExerciseOneRM(logs, s.exerciseId));
    for (const [m, c] of Object.entries(ex.muscleContributions)) {
      const id = m as MuscleId;
      const cur = acc.get(id) ?? { l: 0, r: 0 };
      cur[s.side] += su * (c ?? 0);
      acc.set(id, cur);
    }
  }

  const out: Asymmetry[] = [];
  for (const [muscle, v] of acc.entries()) {
    const max = Math.max(v.l, v.r);
    if (max === 0) continue;
    const deltaPct = Math.round((Math.abs(v.l - v.r) / max) * 100);
    out.push({
      muscle,
      left: Math.round(v.l * 10) / 10,
      right: Math.round(v.r * 10) / 10,
      deltaPct,
      weakerSide: deltaPct <= ASYMMETRY_FLAG_PCT ? null : v.l < v.r ? "l" : "r",
      flagged: deltaPct > ASYMMETRY_FLAG_PCT,
    });
  }
  return out.sort((a, b) => b.deltaPct - a.deltaPct);
}
