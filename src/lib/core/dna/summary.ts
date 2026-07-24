/**
 * Summary category scores — a human-readable rollup of the 30-dim vector into 8
 * buckets for the radar chart (spec Part 7.5). Pure and deterministic.
 *
 * The full vector drives matching; these rollups are purely for display so a
 * player can read their profile at a glance instead of parsing 30 axes.
 */

import type { DimensionKey } from "./dimensions";
import type { DNAVector } from "./vector";

export interface SummaryCategory {
  key: string;
  label: string;
  dims: DimensionKey[];
}

export const SUMMARY_CATEGORIES: SummaryCategory[] = [
  { key: "athleticism", label: "Athleticism", dims: ["vertical_explosiveness", "lateral_quickness", "first_step_burst", "endurance"] },
  { key: "shooting", label: "Shooting", dims: ["catch_and_shoot", "off_dribble_shooting", "movement_shooting"] },
  { key: "finishing", label: "Finishing", dims: ["rim_finishing", "floater_short_mid", "post_scoring"] },
  { key: "playmaking", label: "Playmaking", dims: ["passing_vision", "off_ball_iq"] },
  { key: "handle", label: "Handle", dims: ["handle_under_pressure", "off_screen_navigation"] },
  { key: "perimeter_d", label: "Perimeter D", dims: ["poa_containment", "lateral_slides", "def_screen_navigation", "steal_deflection"] },
  { key: "interior_d", label: "Interior D", dims: ["rim_protection", "help_rotations"] },
  { key: "rebounding", label: "Rebounding", dims: ["rebounding", "strength_mass"] },
];

export function summaryScores(v: DNAVector): { key: string; label: string; value: number }[] {
  return SUMMARY_CATEGORIES.map((cat) => {
    const sum = cat.dims.reduce((acc, d) => acc + v[d], 0);
    return { key: cat.key, label: cat.label, value: Math.round(sum / cat.dims.length) };
  });
}
