/**
 * Periodization (spec Part 3.2). Macrocycle season phases carry a strength focus,
 * volume/intensity multipliers, and a plyo allowance. A weekly microcycle template
 * lays sessions out respecting 48h between high-CNS lower-body days and never
 * stacking max plyos on a heavy squat day.
 *
 * Phase detection from calendar season dates is Phase 4; here the phase is an
 * explicit setting (default off-season).
 */

import type { Tier } from "./types";

export type SeasonPhase = "offseason" | "preseason" | "inseason" | "postseason";

export type StrengthFocus =
  | "hypertrophy"
  | "max_strength"
  | "power"
  | "maintenance"
  | "restoration";

export interface PhaseConfig {
  phase: SeasonPhase;
  label: string;
  strengthFocus: StrengthFocus;
  /** Gym volume multiplier applied to set counts. */
  gymVolume: number;
  /** Court volume multiplier. */
  courtVolume: number;
  /** 0-1 ceiling on max-effort intensity. */
  intensityCap: number;
  allowMaxPlyo: boolean;
  description: string;
}

export const PHASES: Record<SeasonPhase, PhaseConfig> = {
  offseason: {
    phase: "offseason",
    label: "Off-Season",
    strengthFocus: "max_strength",
    gymVolume: 1.0,
    courtVolume: 1.0,
    intensityCap: 1.0,
    allowMaxPlyo: true,
    description: "Build the engine: hypertrophy → max strength → power. Highest gym volume of the year.",
  },
  preseason: {
    phase: "preseason",
    label: "Pre-Season",
    strengthFocus: "power",
    gymVolume: 0.8,
    courtVolume: 1.1,
    intensityCap: 0.95,
    allowMaxPlyo: true,
    description: "Convert strength to power and speed. Gym volume drops, court work climbs.",
  },
  inseason: {
    phase: "inseason",
    label: "In-Season",
    strengthFocus: "maintenance",
    gymVolume: 0.55,
    courtVolume: 0.9,
    intensityCap: 0.85,
    allowMaxPlyo: false,
    description: "Maintain, don't build. Low fatigue, high skill, load management is the priority.",
  },
  postseason: {
    phase: "postseason",
    label: "Post-Season",
    strengthFocus: "restoration",
    gymVolume: 0.5,
    courtVolume: 0.6,
    intensityCap: 0.7,
    allowMaxPlyo: false,
    description: "Deload and restore. Movement quality, mobility, and staying fresh.",
  },
};

/** The named focus of a single day's session. */
export type SessionFocus =
  | "lower_power"
  | "upper"
  | "speed_agility"
  | "court_skill"
  | "court_decisions"
  | "conditioning"
  | "recovery";

export const FOCUS_LABEL: Record<SessionFocus, string> = {
  lower_power: "Lower Strength & Power",
  upper: "Upper Body",
  speed_agility: "Speed & Change of Direction",
  court_skill: "Court — Skill Development",
  court_decisions: "Court — Decisions & Live",
  conditioning: "Conditioning",
  recovery: "Recovery & Prehab",
};

export interface DayPlan {
  /** 0 = today (relative), used to lay out the week. */
  dayIndex: number;
  label: string;
  focus: SessionFocus | "rest";
}

/**
 * A 7-day microcycle. High-CNS lower-body days (lower_power) are spaced ≥48h and
 * never adjacent to a max-plyo/speed day. In-season trims to fewer, lighter days.
 */
export function buildMicrocycle(phase: SeasonPhase, _tier: Tier): DayPlan[] {
  const days = (focuses: (SessionFocus | "rest")[]): DayPlan[] =>
    focuses.map((focus, i) => ({
      dayIndex: i,
      label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]!,
      focus,
    }));

  switch (phase) {
    case "offseason":
      return days([
        "lower_power", "court_skill", "upper", "court_skill", "lower_power", "court_decisions", "rest",
      ]);
    case "preseason":
      return days([
        "lower_power", "court_skill", "speed_agility", "court_decisions", "upper", "conditioning", "rest",
      ]);
    case "inseason":
      return days([
        "court_skill", "lower_power", "court_skill", "recovery", "court_decisions", "rest", "recovery",
      ]);
    case "postseason":
      return days([
        "recovery", "court_skill", "rest", "upper", "recovery", "court_skill", "rest",
      ]);
  }
}
