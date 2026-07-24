/**
 * Soreness calibration (spec D.4 step 5) — the model fits the individual.
 *
 * Every morning the athlete reports soreness (0-3) on the muscles they tap. We
 * compare that to what the fatigue model PREDICTED and nudge that muscle's τ and
 * capacity toward the truth, with a bounded learning rate (±10% per adjustment)
 * and a hard clamp (±40% from default). Every adjustment is logged so it's
 * auditable. Pure and deterministic.
 */

import type { MuscleId } from "../strength/muscles";
import { CALIBRATION_HARD_CLAMP, CALIBRATION_MAX_WEEKLY_STEP } from "./constants";

export interface MuscleCal {
  tauMult: number;
  capMult: number;
}
export type MuscleCalibration = Partial<Record<MuscleId, MuscleCal>>;

export interface CalibrationAdjustment {
  muscle: MuscleId;
  dateISO: string;
  reportedSoreness: number; // 0-3
  predictedPct: number;
  tauFrom: number;
  tauTo: number;
  capFrom: number;
  capTo: number;
}

export interface CalibrationResult {
  calibration: MuscleCalibration;
  adjustments: CalibrationAdjustment[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Update calibration from a soreness check-in.
 * @param reported soreness 0-3 for the muscles the athlete tapped (others untouched)
 * @param predictedPct the model's current fatigue % per muscle
 */
export function calibrateFromSoreness(
  current: MuscleCalibration,
  reported: Partial<Record<MuscleId, number>>,
  predictedPct: Partial<Record<MuscleId, number>>,
  dateISO: string,
): CalibrationResult {
  const next: MuscleCalibration = { ...current };
  const adjustments: CalibrationAdjustment[] = [];

  for (const key of Object.keys(reported) as MuscleId[]) {
    const soreness = reported[key];
    if (soreness == null) continue;
    const predicted = predictedPct[key] ?? 0;
    const reportedEquivalent = (soreness / 3) * 100; // 0-3 → 0-100
    // Positive error → sorer than predicted → recovers slower → raise τ, lower capacity.
    const error = reportedEquivalent - predicted;
    const step = clamp((error / 100) * CALIBRATION_MAX_WEEKLY_STEP, -CALIBRATION_MAX_WEEKLY_STEP, CALIBRATION_MAX_WEEKLY_STEP);

    const cur = current[key] ?? { tauMult: 1, capMult: 1 };
    const tauTo = clamp(cur.tauMult * (1 + step), 1 - CALIBRATION_HARD_CLAMP, 1 + CALIBRATION_HARD_CLAMP);
    const capTo = clamp(cur.capMult * (1 - step * 0.5), 1 - CALIBRATION_HARD_CLAMP, 1 + CALIBRATION_HARD_CLAMP);

    next[key] = { tauMult: round(tauTo), capMult: round(capTo) };
    adjustments.push({
      muscle: key, dateISO, reportedSoreness: soreness, predictedPct: Math.round(predicted),
      tauFrom: round(cur.tauMult), tauTo: round(tauTo), capFrom: round(cur.capMult), capTo: round(capTo),
    });
  }

  return { calibration: next, adjustments };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
