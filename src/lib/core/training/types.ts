/**
 * Training-domain shared types (spec Part 3).
 * Pure data — no I/O. The session generator (generateSession.ts) is the only
 * place these are assembled, and it is deterministic.
 */

import type { DimensionKey } from "../dna/dimensions";
import type { PlayerLevel } from "../profile/types";

/** Equipment a drill can require; a player declares what they have access to. */
export type Equipment =
  | "none"
  | "ball"
  | "hoop"
  | "court"
  | "cones"
  | "wall"
  | "partner"
  | "barbell"
  | "trap_bar"
  | "dumbbells"
  | "kettlebell"
  | "rack"
  | "bench"
  | "bands"
  | "box"
  | "med_ball"
  | "sled";

export const ALL_EQUIPMENT: Equipment[] = [
  "none", "ball", "hoop", "court", "cones", "wall", "partner",
  "barbell", "trap_bar", "dumbbells", "kettlebell", "rack", "bench",
  "bands", "box", "med_ball", "sled",
];

export type Tier = "beginner" | "intermediate" | "advanced" | "elite";
export const TIER_ORDER: Tier[] = ["beginner", "intermediate", "advanced", "elite"];

/** Map a competition level to a default training tier / entry point. */
export function tierForLevel(level: PlayerLevel): Tier {
  switch (level) {
    case "middle_school":
    case "jv":
      return "beginner";
    case "varsity":
    case "aau":
    case "juco":
      return "intermediate";
    case "d2":
    case "d1":
      return "advanced";
    case "semi_pro":
    case "pro":
      return "elite";
  }
}

export type Domain = "gym" | "court";

export type DrillCategory =
  // gym
  | "lower_strength"
  | "upper_push_pull"
  | "power_plyo"
  | "speed_cod"
  | "core"
  | "prehab"
  | "conditioning"
  // court
  | "shooting"
  | "ball_handling"
  | "finishing"
  | "footwork"
  | "decision_making"
  | "defense"
  | "live_reps";

export const CATEGORY_DOMAIN: Record<DrillCategory, Domain> = {
  lower_strength: "gym",
  upper_push_pull: "gym",
  power_plyo: "gym",
  speed_cod: "gym",
  core: "gym",
  prehab: "gym",
  conditioning: "gym",
  shooting: "court",
  ball_handling: "court",
  finishing: "court",
  footwork: "court",
  decision_making: "court",
  defense: "court",
  live_reps: "court",
};

/** CNS demand — drives microcycle spacing (no two high-CNS lower days within 48h). */
export type CNSLoad = "low" | "moderate" | "high";

/** Body regions a drill loads — used to honor injury flags and spacing. */
export type BodyRegion = "ankle" | "knee" | "hip" | "lower_back" | "shoulder" | "none";

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  description: string;
  /** 2-3 coaching cues, max (spec 3.3). */
  cues: string[];
  equipment: Equipment[];
  tier: Tier;
  /** DNA dimensions this drill develops. */
  develops: DimensionKey[];
  cnsLoad: CNSLoad;
  /** Primary joints/regions loaded (for injury routing). */
  regions: BodyRegion[];
  /** Default dose label, e.g. "4 × 5", "3 × 8 / side", "10 min", "100 makes". */
  dose: string;
  /** How many working sets to log by default (0 = time/target based, no set logging). */
  defaultSets: number;
  progression: string;
  regression: string;
}

export function domainOf(category: DrillCategory): Domain {
  return CATEGORY_DOMAIN[category];
}
