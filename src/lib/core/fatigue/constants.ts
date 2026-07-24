/**
 * Fatigue-engine tunable constants (spec D.4). EVERY heuristic lives here — one
 * place to open, one place to tune. Nothing downstream invents a number.
 *
 * These are DESIGNED HEURISTICS, not measured physiology. The whole point of the
 * fatigue map is traceability: given these constants and the logged sets, one
 * pure function reproduces every percentage the user sees.
 */

import type { RecoveryClass } from "../strength/exercise";

/** effortFactor = exp(-EFFORT_DECAY × RIR). Near-failure sets cost disproportionately more. */
export const EFFORT_DECAY = 0.25;

/** Used when RIR/RPE weren't logged. Estimate is flagged low-confidence. */
export const DEFAULT_RIR = 2;

/** Drill recoveryClass scales the muscle's base τ (spec D.4 step 2). */
export const RECOVERY_CLASS_TAU_SCALE: Record<RecoveryClass, number> = {
  fast: 0.7,
  normal: 1.0,
  slow: 1.5,
};

/**
 * Capacity floor = capacityWeight × CAPACITY_UNIT (stimulus units). Keeps a
 * brand-new user off 100% on their first session; individualized capacity (rolling
 * 4-week peak weekly SU) overrides it once it climbs above the floor.
 */
export const CAPACITY_UNIT = 14;

/** Rolling window (days) for the individualized capacity. */
export const CAPACITY_WINDOW_DAYS = 28;

/** Recovery is "recovered" below this displayed %. Drives the ETA solve. */
export const RECOVERY_THRESHOLD_PCT = 30;

/** displayed = LOCAL_BLEND × localFatigue + SYSTEMIC_BLEND × systemicFatigue. */
export const LOCAL_BLEND = 0.75;
export const SYSTEMIC_BLEND = 0.25;

/**
 * Reference weekly whole-body SU that maps to "fully taxed" systemic load when no
 * wearable is connected. Heuristic; blended with recovery score when available.
 */
export const SYSTEMIC_SU_REFERENCE = 220;

/** Epley 1RM is only trusted at or below this rep count (spec A.1). */
export const ONE_RM_MAX_TRUSTED_REPS = 8;

/** Clamp on relative intensity so a mis-logged load can't blow up a stimulus. */
export const MAX_RELATIVE_INTENSITY = 1.2;

/** ETA solver caps out here (hours) → "more than a few days". */
export const MAX_ETA_HOURS = 336; // 14 days

/** Soreness calibration (spec D.4 step 5): bounded learning rate + hard clamp. */
export const CALIBRATION_MAX_WEEKLY_STEP = 0.1; // ±10% per adjustment
export const CALIBRATION_HARD_CLAMP = 0.4; // never more than ±40% from default

/** Left/right delta above this is flagged "worth watching" (spec D.3). */
export const ASYMMETRY_FLAG_PCT = 15;
