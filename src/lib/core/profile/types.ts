/**
 * Player profile types — the raw onboarding inputs (spec Part 7.1).
 * These are what the user enters; the DNA vector is DERIVED from them
 * (see dna/fromProfile.ts), never stored as the source of truth on its own.
 */

export type PlayerLevel =
  | "middle_school"
  | "jv"
  | "varsity"
  | "aau"
  | "juco"
  | "d2"
  | "d1"
  | "semi_pro"
  | "pro";

/** Ordered from youngest/entry tier up to pro — drives the onboarding chip order. */
export const PLAYER_LEVELS: PlayerLevel[] = [
  "middle_school",
  "jv",
  "varsity",
  "aau",
  "juco",
  "d2",
  "d1",
  "semi_pro",
  "pro",
];

export type Position = "pg" | "sg" | "sf" | "pf" | "c";

export const POSITION_LABELS: Record<Position, string> = {
  pg: "Point guard",
  sg: "Shooting guard",
  sf: "Small forward",
  pf: "Power forward",
  c: "Center",
};

export const LEVEL_LABELS: Record<PlayerLevel, string> = {
  middle_school: "Middle School",
  jv: "JV",
  varsity: "Varsity",
  aau: "AAU / Club",
  juco: "JUCO",
  d2: "NCAA D2",
  d1: "NCAA D1",
  semi_pro: "Semi-Pro",
  pro: "Pro",
};

export interface Anthropometrics {
  /** Inches. */
  heightIn: number;
  /** Pounds. */
  weightLb: number;
  /** Inches. Optional — estimated as ≈ height (ape index 0) when not measured. */
  wingspanIn?: number;
  /** Inches. Optional — estimated from height + wingspan if omitted. */
  standingReachIn?: number;
  /** Measured or self-reported max vertical, inches. Optional. */
  verticalIn?: number;
}

/** Display unit system. Core math is always canonical imperial (inches / lb). */
export type UnitSystem = "imperial" | "metric";

/**
 * Skill self-assessment: a 1-5 rating per skill dimension (video-free, spec
 * Part 7.1). We keep the survey in the skill dimensions' own vocabulary so the
 * mapping to the DNA vector is 1:1 and auditable.
 */
export type SkillRating = 1 | 2 | 3 | 4 | 5;

/**
 * Playstyle quiz answers → style tendencies, each 0-100.
 * These are descriptive, not "good/bad".
 */
export interface StyleAnswers {
  pacePreference: number;
  shotLocation: number;
  onOffBall: number;
  isoVsSystem: number;
  physicalityTolerance: number;
}

export interface PlayerProfile {
  displayName: string;
  age: number;
  /** Years of serious lifting. */
  trainingAge: number;
  level: PlayerLevel;
  /** One or more positions. The first is treated as primary for build norms. */
  positions: Position[];
  units?: UnitSystem;
  selfDescribedPlaystyle?: string;
  anthropometrics: Anthropometrics;
  /** Sparse map: dimensionKey -> 1-5. Missing skills default to the level baseline. */
  skillRatings: Record<string, SkillRating>;
  style: StyleAnswers;
  injuryHistory?: string;
  currentLimitations?: string;
}
