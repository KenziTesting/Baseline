/**
 * Archetype matching (spec Part 2.3).
 *
 * Two similarities are computed separately and never conflated:
 *  - BUILD comp: how similar the physical frame is (Euclidean closeness on the
 *    physical sub-vector).
 *  - GAME comp: how similar the skill+style PROFILE SHAPE is (mean-centered
 *    cosine on the game sub-vector) — level-agnostic, so a 6'0" player can match
 *    Curry's game even with a totally different frame.
 *
 * The overall ranking is game-led but physically down-weighted, NOT blocked: an
 * implausible frame reduces the score toward a floor (65% of the game score) but
 * never zeroes it. That's the spec's explicit requirement.
 */

import { BUILD_KEYS, GAME_KEYS } from "../dna/dimensions";
import {
  normalizedDistance,
  patternSimilarity,
  subVector,
  type DNAVector,
} from "../dna/vector";
import { ARCHETYPES, ARCHETYPES_BY_ID } from "./library";
import type { Archetype } from "./types";

export interface ArchetypeMatch {
  archetype: Archetype;
  /** 0-100: physical-frame similarity. */
  buildComp: number;
  /** 0-100: skill+style profile-shape similarity (level-agnostic). */
  gameComp: number;
  /** 0-100: game-led score with physical plausibility applied (ranking key). */
  overall: number;
}

/** Fraction of the game score retained when the build is maximally implausible. */
const BUILD_FLOOR = 0.65;

function scoreAgainst(user: DNAVector, archetype: Archetype): ArchetypeMatch {
  const buildComp = clampScore(
    100 - normalizedDistance(subVector(user, BUILD_KEYS), subVector(archetype.dna, BUILD_KEYS)),
  );
  const gameComp = clampScore(
    patternSimilarity(subVector(user, GAME_KEYS), subVector(archetype.dna, GAME_KEYS)),
  );
  const plausibility = BUILD_FLOOR + (1 - BUILD_FLOOR) * (buildComp / 100);
  const overall = clampScore(gameComp * plausibility);
  return { archetype, buildComp, gameComp, overall };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

export interface MatchResult {
  /** Top 3 by overall (game-led, build-adjusted). */
  top: ArchetypeMatch[];
  /** Best pure build comp — "your frame is built like…". */
  bestBuildComp: ArchetypeMatch;
  /** Best pure game comp — "your game most resembles…". */
  bestGameComp: ArchetypeMatch;
}

export function matchArchetypes(user: DNAVector): MatchResult {
  const scored = ARCHETYPES.map((a) => scoreAgainst(user, a));

  const byOverall = [...scored].sort((a, b) => b.overall - a.overall);
  const byBuild = [...scored].sort((a, b) => b.buildComp - a.buildComp);
  const byGame = [...scored].sort((a, b) => b.gameComp - a.gameComp);

  return {
    top: byOverall.slice(0, 3),
    // These are guaranteed to exist: the archetype library is non-empty (enforced at import).
    bestBuildComp: byBuild[0]!,
    bestGameComp: byGame[0]!,
  };
}

/** Score the user against a single named archetype (used for user overrides). */
export function scoreArchetypeById(user: DNAVector, archetypeId: string): ArchetypeMatch {
  const archetype = ARCHETYPES_BY_ID[archetypeId];
  if (!archetype) throw new Error(`Unknown archetype id: ${archetypeId}`);
  return scoreAgainst(user, archetype);
}
