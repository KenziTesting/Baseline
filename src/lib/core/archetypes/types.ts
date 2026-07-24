import type { DimensionKey } from "../dna/dimensions";
import type { DNAVector } from "../dna/vector";

/** Training emphasis weights (0-1) per broad focus, feed the training engine (Phase 2+). */
export interface TrainingEmphasis {
  shooting: number;
  finishing: number;
  ballhandling: number;
  playmaking: number;
  perimeterDefense: number;
  interiorDefense: number;
  strength: number;
  power: number;
  speedAgility: number;
  conditioning: number;
}

export interface Archetype {
  id: string;
  name: string;
  /** e.g. "Movement shooter / gravity guard". */
  blurb: string;
  nbaReference: string;
  collegeReference: string;
  /** Human-readable build range, e.g. "6'0\"-6'4\", lean, elite conditioning". */
  buildRange: string;
  /** The full DNA vector for this archetype (0-100 per dimension). */
  dna: DNAVector;
  /** The 5 dimensions that define this mold. */
  definingSkills: DimensionKey[];
  /** The 5 most common weaknesses of players who fit the mold. */
  commonWeaknesses: DimensionKey[];
  trainingEmphasis: TrainingEmphasis;
  /**
   * Honesty flag (spec 2.2): archetypes that are explicit about the level —
   * e.g. "undersized rim attacker who must develop a pull-up to survive at D1".
   */
  developmental?: boolean;
}
