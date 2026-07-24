/**
 * Advanced gym exercise schema (spec Part B.1). This is a RICHER, parallel model
 * to the Phase-2 on-court `Drill` — it carries the muscleContributions that drive
 * the fatigue map (Part D). The two libraries stay separate so the Phase-2
 * session generator keeps working; they can be reconciled later.
 *
 * The single most important invariant: `muscleContributions` sums to 1.0. A test
 * asserts it for every exercise and fails the build on a typo (spec B.1).
 */

import type { Equipment } from "../training/types";
import type { MuscleId } from "./muscles";

export type MovementPattern =
  | "squat" | "hinge" | "lunge"
  | "horizontal_push" | "vertical_push" | "horizontal_pull" | "vertical_pull"
  | "carry" | "rotation" | "plyo" | "sprint" | "lateral" | "core" | "isolation";

export type ExerciseCategory =
  | "max_strength" | "speed_strength" | "plyometric" | "hypertrophy"
  | "isometric" | "eccentric" | "mobility" | "prehab" | "conditioning";

export type ExerciseLevel = 1 | 2 | 3 | 4 | 5;
export type RecoveryClass = "fast" | "normal" | "slow";

export interface PrescriptionBlock {
  goal: "strength" | "power" | "hypertrophy" | "endurance" | "prehab";
  sets: [number, number];
  reps: [number, number];
  restSeconds: [number, number];
  rirTarget: number;
}

export type LoadMethod =
  | "percent_1rm" | "bodyweight_ratio" | "band" | "plyo_contacts" | "rpe" | "isometric_time";

export interface LoadGuidance {
  method: LoadMethod;
  beginner: string;
  intermediate: string;
  advanced: string;
  /**
   * Relative-intensity stand-in (0-1) used by the fatigue engine when a true
   * load/1RM ratio isn't available (bodyweight, band, plyo). HEURISTIC.
   */
  intensityProxy?: number;
  notes?: string;
}

export interface VideoRef {
  provider: "youtube";
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  startSeconds?: number;
  endSeconds?: number;
  embeddable: boolean;
  durationSeconds: number;
  lastValidatedAt: string;
  curatedBy: "admin" | "auto";
  role?: "demo" | "coaching" | "fault_fix";
}

export interface Exercise {
  id: string;
  name: string;
  aliases: string[];
  pattern: MovementPattern;
  category: ExerciseCategory;
  level: ExerciseLevel;
  equipment: Equipment[];
  unilateral: boolean;

  /** THE KEY FIELD — must sum to 1.0 (±0.01). Drives the fatigue map. */
  muscleContributions: Partial<Record<MuscleId, number>>;

  fatigueMultiplier: number;
  recoveryClass: RecoveryClass;

  setup: string[];
  execution: string[];
  cues: string[];
  commonFaults: { fault: string; fix: string }[];
  tempo: string;
  breathing: string;

  prescription: PrescriptionBlock[];
  loadGuidance: LoadGuidance;
  progressions: string[];
  regressions: string[];
  contraindications: string[];
  videoRefs: VideoRef[];

  /** True → plyometric ground contacts are counted, not reps (spec A.1 / D.4). */
  countsPlyoContacts?: boolean;
  /** Hidden for athletes < 16 (loaded jumps, depth drops, weighted pull-ups). */
  youthRestricted?: boolean;
}
