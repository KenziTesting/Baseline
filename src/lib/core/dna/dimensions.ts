/**
 * DNA dimensions (spec Part 2.1).
 *
 * Every player — the user and every reference archetype — is modeled as a
 * normalized vector (0-100) across these dimensions. This file is the single
 * source of truth for what the dimensions ARE. Everything else (vector math,
 * archetypes, matching, gap report) derives from this list, so adding a
 * dimension here is the only place a new dimension needs to be declared.
 *
 * Groups:
 *  - physical: how the athlete is built and moves (drives the "build comp")
 *  - offensive / defensive: learnable skills (the training engine's targets)
 *  - style: descriptive tendencies, NOT better/worse (drive the "game comp"
 *    shape but are excluded from the gap report — you don't "train toward"
 *    a pace preference the way you train toward a stronger pull-up).
 *
 * `trainable` marks dimensions the training engine can move. Physical dims are
 * partially trainable (vertical, strength, quickness) and partially fixed
 * (height, wingspan, standing reach) — the fixed ones anchor the build comp
 * but are never emitted as a "gap to close".
 */

export type DimensionGroup = "physical" | "offensive" | "defensive" | "style";

export interface DimensionDef {
  key: string;
  label: string;
  group: DimensionGroup;
  /** Can the training engine meaningfully change this? Height cannot; vertical can. */
  trainable: boolean;
}

export const DIMENSIONS = [
  // ---- Physical (8) ----
  { key: "height_percentile", label: "Height (percentile for position)", group: "physical", trainable: false },
  { key: "wingspan_ratio", label: "Wingspan-to-height ratio", group: "physical", trainable: false },
  { key: "standing_reach", label: "Standing reach", group: "physical", trainable: false },
  { key: "vertical_explosiveness", label: "Lower-body explosiveness (vertical)", group: "physical", trainable: true },
  { key: "lateral_quickness", label: "Lateral quickness", group: "physical", trainable: true },
  { key: "first_step_burst", label: "First-step burst", group: "physical", trainable: true },
  { key: "strength_mass", label: "Strength / mass index", group: "physical", trainable: true },
  { key: "endurance", label: "Endurance capacity", group: "physical", trainable: true },

  // ---- Offensive skill (10) ----
  { key: "catch_and_shoot", label: "Catch-and-shoot", group: "offensive", trainable: true },
  { key: "off_dribble_shooting", label: "Off-dribble shooting", group: "offensive", trainable: true },
  { key: "movement_shooting", label: "Movement shooting (off screens/relocation)", group: "offensive", trainable: true },
  { key: "rim_finishing", label: "Rim finishing (both hands)", group: "offensive", trainable: true },
  { key: "floater_short_mid", label: "Floater / short-mid game", group: "offensive", trainable: true },
  { key: "post_scoring", label: "Post scoring", group: "offensive", trainable: true },
  { key: "handle_under_pressure", label: "Handle under pressure", group: "offensive", trainable: true },
  { key: "passing_vision", label: "Passing vision", group: "offensive", trainable: true },
  { key: "off_screen_navigation", label: "Screen navigation (coming off screens)", group: "offensive", trainable: true },
  { key: "off_ball_iq", label: "Off-ball movement IQ", group: "offensive", trainable: true },

  // ---- Defensive skill (7) ----
  { key: "poa_containment", label: "Point-of-attack containment", group: "defensive", trainable: true },
  { key: "lateral_slides", label: "Lateral slides", group: "defensive", trainable: true },
  { key: "def_screen_navigation", label: "Screen navigation (fighting over/under)", group: "defensive", trainable: true },
  { key: "rim_protection", label: "Rim protection", group: "defensive", trainable: true },
  { key: "help_rotations", label: "Help rotations / tagging", group: "defensive", trainable: true },
  { key: "rebounding", label: "Rebounding (contested + box-out)", group: "defensive", trainable: true },
  { key: "steal_deflection", label: "Steal / deflection instinct", group: "defensive", trainable: true },

  // ---- Style tendencies (5) — descriptive, not skill ----
  { key: "pace_preference", label: "Pace preference (0 = deliberate, 100 = frantic)", group: "style", trainable: false },
  { key: "shot_location", label: "Shot-location distribution (0 = rim, 100 = perimeter)", group: "style", trainable: false },
  { key: "on_off_ball", label: "On-ball vs off-ball usage (0 = off-ball, 100 = on-ball)", group: "style", trainable: false },
  { key: "iso_vs_system", label: "Isolation vs system reliance (0 = system, 100 = iso)", group: "style", trainable: false },
  { key: "physicality_tolerance", label: "Physicality tolerance", group: "style", trainable: false },
] as const satisfies readonly DimensionDef[];

export type DimensionKey = (typeof DIMENSIONS)[number]["key"];

export const DIMENSION_KEYS: DimensionKey[] = DIMENSIONS.map((d) => d.key);

export const DIMENSIONS_BY_KEY: Record<DimensionKey, DimensionDef> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d]),
) as Record<DimensionKey, DimensionDef>;

export function keysInGroup(group: DimensionGroup): DimensionKey[] {
  return DIMENSIONS.filter((d) => d.group === group).map((d) => d.key);
}

/** Physical dims → the "build comp". */
export const BUILD_KEYS: DimensionKey[] = keysInGroup("physical");

/** Skill + style dims → the "game comp". Build and game are compared separately. */
export const GAME_KEYS: DimensionKey[] = [
  ...keysInGroup("offensive"),
  ...keysInGroup("defensive"),
  ...keysInGroup("style"),
];

/** Dimensions the gap report may emit as a training target (excludes fixed + style). */
export const TRAINABLE_KEYS: DimensionKey[] = DIMENSIONS.filter((d) => d.trainable).map((d) => d.key);
