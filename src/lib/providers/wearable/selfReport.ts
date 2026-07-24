/**
 * Self-report degrade path (spec Part 4.1 + Part 8).
 *
 * When no wearable is connected the app must still work — it degrades to a
 * simple sleep + subjective self-report. Crucially it does NOT fabricate HRV or
 * RHR: those fields are left at 0 and the readiness `source` is `self`, so the
 * autoregulation "why" never claims a biometric it doesn't have.
 */

import type { Readiness } from "@/lib/core";
import { clamp01to100 } from "@/lib/core";

export interface SelfReport {
  /** Hours slept last night. */
  sleepHours: number;
  /** How ready you feel, 1 (wrecked) – 5 (springy). */
  subjectiveReadiness: number;
  /** Muscle soreness, 1 (none) – 5 (very sore). */
  soreness: number;
}

/**
 * Derive a recovery score from a self-report. Weighted blend of sleep, subjective
 * readiness, and (inverse) soreness. No HRV/RHR — those stay 0.
 */
export function readinessFromSelfReport(r: SelfReport): Readiness {
  const sleepScore = clamp01to100(((r.sleepHours - 4) / (9 - 4)) * 100);
  const subjectiveScore = clamp01to100(((r.subjectiveReadiness - 1) / 4) * 100);
  const sorenessScore = clamp01to100(((5 - r.soreness) / 4) * 100);
  const recovery = Math.round(0.4 * sleepScore + 0.4 * subjectiveScore + 0.2 * sorenessScore);

  return {
    recovery,
    sleepHours: r.sleepHours,
    hrvMs: 0,
    hrvBaselineMs: 0,
    rhrBpm: 0,
    rhrBaselineBpm: 0,
    dayStrain: 0,
    source: "self",
  };
}
