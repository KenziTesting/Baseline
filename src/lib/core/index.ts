/**
 * Baseline core domain — pure, deterministic, framework-free (spec Part 6).
 * Nothing here imports React, Next, or any I/O. This is the reproducibility
 * boundary: given the same inputs, these functions always produce the same plan.
 */

export * from "./dna/dimensions";
export * from "./dna/vector";
export * from "./dna/summary";
export * from "./dna/fromProfile";
export * from "./profile/types";
export * from "./archetypes/types";
export { ARCHETYPES, ARCHETYPES_BY_ID } from "./archetypes/library";
export * from "./archetypes/matching";
export * from "./archetypes/gapReport";
export * from "./training";
export * from "./strength/muscles";
export * from "./strength/exercise";
export { STRENGTH_EXERCISES, STRENGTH_EXERCISES_BY_ID } from "./strength/library";
export * from "./fatigue/constants";
export * from "./fatigue/engine";
export * from "./fatigue/calibration";
export * from "./fatigue/asymmetry";
