/**
 * Gap report (spec Part 2.3): the 5 largest deltas between the user and their
 * aspirational archetype. This is the DIRECT input to the training engine
 * (Phase 2), so it must be deterministic and use raw component deltas — NOT
 * cosine, which would hide magnitude (see vector.ts for why).
 *
 * Only trainable dimensions are eligible: you don't emit "you're shorter than
 * Curly" as a training gap. Style tendencies are excluded for the same reason.
 */

import {
  DIMENSIONS_BY_KEY,
  TRAINABLE_KEYS,
  type DimensionKey,
} from "../dna/dimensions";
import type { DNAVector } from "../dna/vector";
import type { Archetype } from "./types";

export interface Gap {
  dimension: DimensionKey;
  label: string;
  userValue: number;
  archetypeValue: number;
  /** archetypeValue - userValue, positive means the archetype is ahead (a gap to close). */
  delta: number;
  /** True if this dimension is one the archetype is DEFINED by — prioritize it. */
  isDefining: boolean;
}

export interface GapReport {
  archetypeId: string;
  archetypeName: string;
  gaps: Gap[];
}

/**
 * Compute the top-N training gaps toward an aspirational archetype.
 *
 * Ranking: primarily by raw positive delta, but a defining skill of the
 * archetype gets a priority bump so "the thing that makes this archetype work"
 * surfaces even if a couple of non-defining deltas are marginally larger.
 */
export function computeGapReport(
  user: DNAVector,
  archetype: Archetype,
  topN = 5,
): GapReport {
  const defining = new Set<DimensionKey>(archetype.definingSkills);

  const gaps: Gap[] = TRAINABLE_KEYS.map((key) => {
    const userValue = user[key];
    const archetypeValue = archetype.dna[key];
    return {
      dimension: key,
      label: DIMENSIONS_BY_KEY[key].label,
      userValue,
      archetypeValue,
      delta: archetypeValue - userValue,
      isDefining: defining.has(key),
    };
  })
    // Only gaps where the archetype is actually ahead are worth training toward.
    .filter((g) => g.delta > 0)
    .sort((a, b) => rankScore(b) - rankScore(a))
    .slice(0, topN);

  return {
    archetypeId: archetype.id,
    archetypeName: archetype.name,
    gaps,
  };
}

/** Defining-skill deltas are weighted 1.35x so the archetype's identity leads. */
function rankScore(g: Gap): number {
  return g.delta * (g.isDefining ? 1.35 : 1);
}
