/**
 * Deterministic profile → DNA vector computation (spec Part 6: this lives in a
 * pure function, not a prompt, so the same profile always yields the same
 * vector). No LLM, no I/O, no randomness.
 *
 * Design notes:
 *  - Fixed physical dims (height, wingspan, reach) are computed from
 *    measurements against position norms.
 *  - Trainable physical dims + all skills come from the self-assessment,
 *    anchored to a level baseline so a "4/5" from a beginner and a pro are not
 *    treated as identical absolute skill (spec's honesty requirement).
 *  - Style dims are passed straight through — they are descriptive.
 */

import {
  DIMENSIONS,
  type DimensionKey,
} from "./dimensions";
import { clamp01to100, mean, vec, type DNAVector } from "./vector";
import type { PlayerLevel, PlayerProfile, Position } from "../profile/types";

/** Absolute-skill anchor per level (0-100), before per-skill self-rating adjustment. */
const LEVEL_BASELINE: Record<PlayerLevel, number> = {
  middle_school: 30,
  jv: 42,
  varsity: 52,
  aau: 55,
  juco: 58,
  d2: 63,
  d1: 72,
  semi_pro: 76,
  pro: 85,
};

/** Position height norms (inches): [mean, stdev] for percentile estimation. */
const POSITION_HEIGHT_NORM: Record<Position, [number, number]> = {
  pg: [74, 2.2], // ~6'2"
  sg: [77, 2.2], // ~6'5"
  sf: [79, 2.2], // ~6'7"
  pf: [81, 2.2], // ~6'9"
  c: [83, 2.4], // ~6'11"
};

/** Standard-normal CDF (Abramowitz-Stegun approximation) → percentile 0-100. */
function normalPercentile(x: number, mean: number, stdev: number): number {
  const z = (x - mean) / stdev;
  // logistic approximation of the normal CDF, good to ~1%
  const cdf = 1 / (1 + Math.exp(-1.702 * z));
  return clamp01to100(cdf * 100);
}

/** Map a 1-5 self-rating to an absolute 0-100 value anchored at the level baseline. */
function ratingToValue(rating: number | undefined, baseline: number): number {
  if (rating == null) return baseline;
  const spread = 11; // each rating step ≈ 11 points
  return clamp01to100(baseline + (rating - 3) * spread);
}

export interface DNAComputationResult {
  vector: DNAVector;
  /** Human-readable notes on how derived (non-rated) values were inferred. */
  notes: string[];
}

export function computeDNAVector(profile: PlayerProfile): DNAComputationResult {
  const notes: string[] = [];
  const baseline = LEVEL_BASELINE[profile.level];
  const { anthropometrics: a } = profile;

  // Blend the height norm across every position the player lists (a PG/SG combo
  // guard is judged against a norm between the two).
  const positions = profile.positions.length > 0 ? profile.positions : (["sg"] as const);
  const meanH = mean(positions.map((p) => POSITION_HEIGHT_NORM[p][0]));
  const sdH = mean(positions.map((p) => POSITION_HEIGHT_NORM[p][1]));
  const heightPercentile = normalPercentile(a.heightIn, meanH, sdH);

  // Wingspan: estimate as ≈ height (ape index 0) when not measured.
  let wingspanIn = a.wingspanIn;
  if (wingspanIn == null) {
    wingspanIn = a.heightIn;
    notes.push("Wingspan not measured — assumed roughly equal to height (average length).");
  }
  // Wingspan ratio: 1.0 is average; elite length ~1.06+. Map [0.95, 1.10] → [20, 92].
  const ratio = wingspanIn / a.heightIn;
  const wingspanScore = clamp01to100(((ratio - 0.95) / (1.1 - 0.95)) * (92 - 20) + 20);

  // Standing reach: estimate if not measured. Reach ≈ 1.32×height, plus a length bonus.
  let reachIn = a.standingReachIn;
  if (reachIn == null) {
    reachIn = a.heightIn * 1.32 + (wingspanIn - a.heightIn) * 0.5;
    notes.push(
      `Standing reach not measured — estimated at ${reachIn.toFixed(1)}" from height + wingspan.`,
    );
  }
  // Position reach norm scales with height norm (reach ≈ 1.32×height mean).
  const reachScore = normalPercentile(reachIn, meanH * 1.32, sdH * 1.32);

  // Vertical: measured value if present, else self-rating, else baseline.
  let verticalScore: number;
  if (a.verticalIn != null) {
    // Map 20" → 30, 32" → 62, 40"+ → 95.
    verticalScore = clamp01to100(((a.verticalIn - 20) / (40 - 20)) * (95 - 30) + 30);
  } else {
    verticalScore = ratingToValue(profile.skillRatings["vertical_explosiveness"], baseline);
    notes.push("Vertical not measured — using self-assessment.");
  }

  // Strength/mass: body mass relative to height (a crude lean-mass proxy) blended
  // with training age and self-rating. Heavier-for-height + more training → higher.
  const bmiProxy = (a.weightLb / (a.heightIn * a.heightIn)) * 703; // BMI
  const massComponent = clamp01to100(((bmiProxy - 20) / (28 - 20)) * 55 + 25);
  const trainingComponent = clamp01to100(Math.min(profile.trainingAge, 8) * 6 + 25);
  const ratedStrength = profile.skillRatings["strength_mass"];
  const strengthScore =
    ratedStrength != null
      ? ratingToValue(ratedStrength, baseline)
      : clamp01to100(0.5 * massComponent + 0.5 * trainingComponent);

  // Assemble. Fixed physical dims are computed above; everything else falls back
  // to the self-rating (anchored to baseline), and style passes through.
  const overrides: Partial<Record<DimensionKey, number>> = {
    height_percentile: heightPercentile,
    wingspan_ratio: wingspanScore,
    standing_reach: reachScore,
    vertical_explosiveness: verticalScore,
    strength_mass: strengthScore,
    // style tendencies pass through directly
    pace_preference: clamp01to100(profile.style.pacePreference),
    shot_location: clamp01to100(profile.style.shotLocation),
    on_off_ball: clamp01to100(profile.style.onOffBall),
    iso_vs_system: clamp01to100(profile.style.isoVsSystem),
    physicality_tolerance: clamp01to100(profile.style.physicalityTolerance),
  };

  // All remaining trainable skill/athletic dims come from self-ratings.
  for (const d of DIMENSIONS) {
    if (d.key in overrides) continue;
    if (d.group === "style") continue;
    overrides[d.key] = ratingToValue(profile.skillRatings[d.key], baseline);
  }

  return { vector: vec(overrides, baseline), notes };
}
