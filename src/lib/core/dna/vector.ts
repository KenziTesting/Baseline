/**
 * DNA vector type + pure vector math.
 *
 * A DNAVector is a full 0-100 value for every dimension. All math here is pure
 * and deterministic — no I/O, no randomness — which is what makes an archetype
 * match reproducible from inputs alone (spec Part 6).
 */

import { DIMENSION_KEYS, type DimensionKey } from "./dimensions";

export type DNAVector = Record<DimensionKey, number>;

/** Clamp a raw value into the 0-100 domain. */
export function clamp01to100(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/**
 * Build a full vector from a partial one, filling unspecified dimensions with
 * `fill` (default 50 = "average"). Used heavily by the archetype library so a
 * definition only lists its salient dimensions.
 */
export function vec(overrides: Partial<Record<DimensionKey, number>>, fill = 50): DNAVector {
  const out = {} as DNAVector;
  for (const key of DIMENSION_KEYS) {
    const v = overrides[key];
    out[key] = clamp01to100(v ?? fill);
  }
  return out;
}

/** Extract a sub-vector (ordered) for a given set of dimension keys. */
export function subVector(v: DNAVector, keys: DimensionKey[]): number[] {
  return keys.map((k) => v[k]);
}

/**
 * Cosine similarity between two equal-length numeric vectors, returned in
 * [0, 100] for display. Because all values are non-negative (0-100), cosine
 * lives in [0, 1]; we scale to a percentage.
 *
 * IMPORTANT (spec Part 2.3 trap): cosine ignores magnitude, so it measures
 * SHAPE, not level. That's intentional for the style/"who do I play like"
 * comp — but it is the wrong tool for the gap report, which uses raw deltas
 * (see gapReport.ts). Callers should mean-center or otherwise pre-process if
 * they want variance to matter; here we cosine the raw sub-vectors so a player
 * whose emphasis profile matches an archetype scores high regardless of level.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`cosineSimilarity: length mismatch ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }
  if (magA === 0 || magB === 0) return 0;
  const cos = dot / (Math.sqrt(magA) * Math.sqrt(magB));
  return clamp01to100(cos * 100);
}

/**
 * Mean-centered cosine (Pearson-like) — subtracts each vector's own mean before
 * cosine, so it rewards matching the *pattern of strengths and weaknesses*
 * rather than overall busy-ness. Used for the game comp, where two players can
 * be at different absolute levels but share a profile shape.
 */
export function patternSimilarity(a: number[], b: number[]): number {
  const meanA = mean(a);
  const meanB = mean(b);
  const ca = a.map((x) => x - meanA);
  const cb = b.map((x) => x - meanB);
  // Re-map cosine of centered vectors from [-1, 1] to [0, 100].
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < ca.length; i++) {
    const ai = ca[i] ?? 0;
    const bi = cb[i] ?? 0;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }
  if (magA === 0 || magB === 0) return 50; // no variance → neutral
  const cos = dot / (Math.sqrt(magA) * Math.sqrt(magB));
  return clamp01to100(((cos + 1) / 2) * 100);
}

/**
 * Euclidean distance between two sub-vectors, normalized to [0, 100] where 0 =
 * identical and 100 = maximally far (every dim 0 vs 100). Used to turn physical
 * distance into a build-plausibility factor.
 */
export function normalizedDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`normalizedDistance: length mismatch ${a.length} vs ${b.length}`);
  }
  if (a.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    sumSq += d * d;
  }
  const rms = Math.sqrt(sumSq / a.length); // per-dimension RMS, already in 0-100
  return clamp01to100(rms);
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
