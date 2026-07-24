import type { DimensionKey } from "@/lib/core";

/**
 * Self-assessment survey — deliberately SHORT. Six composite ratings, each
 * fanning out to several underlying DNA dimensions, instead of asking the player
 * to grade 17 micro-skills. Unmapped dimensions fall back to the level baseline.
 */
export interface SurveyItem {
  key: string;
  label: string;
  cue: string;
  /** DNA dimensions this one rating writes to. */
  dims: DimensionKey[];
}

export const GAME_SURVEY: SurveyItem[] = [
  {
    key: "shooting",
    label: "Shooting",
    cue: "Catch-and-shoot, pull-ups, range",
    dims: ["catch_and_shoot", "off_dribble_shooting", "movement_shooting"],
  },
  {
    key: "inside_scoring",
    label: "Scoring inside",
    cue: "Finishing at the rim, floaters",
    dims: ["rim_finishing", "floater_short_mid"],
  },
  {
    key: "playmaking",
    label: "Handle & passing",
    cue: "Creating off the dribble, setting up others",
    dims: ["handle_under_pressure", "passing_vision", "off_ball_iq"],
  },
  {
    key: "athleticism",
    label: "Athleticism",
    cue: "Burst, vertical, lateral quickness",
    dims: ["vertical_explosiveness", "first_step_burst", "lateral_quickness"],
  },
  {
    key: "defense",
    label: "Defense",
    cue: "On-ball, sliding, active hands",
    dims: ["poa_containment", "lateral_slides", "steal_deflection"],
  },
  {
    key: "rebounding",
    label: "Rebounding & strength",
    cue: "Boxing out, physicality, rim protection",
    dims: ["rebounding", "rim_protection", "strength_mass"],
  },
];

export const RATING_LABELS: Record<number, string> = {
  1: "Weak",
  2: "Below",
  3: "Solid",
  4: "Strong",
  5: "Elite",
};
