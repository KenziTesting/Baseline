/**
 * Session generator (spec Part 3.1) — the deterministic training engine.
 *
 * Pure function: same inputs → same session, every time. The LLM never shapes
 * the plan; it only explains it (Phase 7). Inputs are the gap report, the
 * archetype's training emphasis, available equipment, the season phase, today's
 * readiness (autoregulation), and injury flags.
 */

import type { DimensionKey } from "../dna/dimensions";
import type { TrainingEmphasis } from "../archetypes/types";
import { DRILLS } from "./library";
import { autoregulate, type Readiness, type Autoregulation } from "./readiness";
import { FOCUS_LABEL, PHASES, type SeasonPhase, type SessionFocus } from "./phase";
import {
  domainOf,
  TIER_ORDER,
  type BodyRegion,
  type Domain,
  type Drill,
  type DrillCategory,
  type Equipment,
  type Tier,
} from "./types";

export interface GenerateInput {
  focus: SessionFocus;
  tier: Tier;
  /** Dimensions from the gap report — drills that develop these are prioritized. */
  gapDimensions: DimensionKey[];
  emphasis: TrainingEmphasis;
  availableEquipment: Equipment[];
  phase: SeasonPhase;
  readiness: Readiness;
  /** Regions to avoid loading (from "I'm hurt — modify" or injury flags). */
  injuryRegions?: BodyRegion[];
  youth?: boolean;
}

export interface PrescribedDrill {
  drill: Drill;
  /** Working sets to log; 0 = time/target based (no per-set logging). */
  sets: number;
  doseLabel: string;
  reason?: string;
}

export interface SessionBlock {
  name: string;
  drills: PrescribedDrill[];
}

export interface GeneratedSession {
  focus: SessionFocus;
  title: string;
  domain: Domain;
  phaseLabel: string;
  estimatedMinutes: number;
  autoreg: Autoregulation;
  /** Set when readiness downgraded a gym day into skill/recovery work. */
  downgradedFrom?: SessionFocus;
  blocks: SessionBlock[];
}

interface BlockSpec {
  name: string;
  categories: DrillCategory[];
  count: number;
}

const FOCUS_BLOCKS: Record<SessionFocus, BlockSpec[]> = {
  lower_power: [
    { name: "Prep & Prehab", categories: ["prehab"], count: 1 },
    { name: "Power / Plyometrics", categories: ["power_plyo"], count: 2 },
    { name: "Lower Strength", categories: ["lower_strength"], count: 2 },
    { name: "Core", categories: ["core"], count: 1 },
  ],
  upper: [
    { name: "Push & Pull", categories: ["upper_push_pull"], count: 3 },
    { name: "Core", categories: ["core"], count: 1 },
    { name: "Shoulder Prehab", categories: ["prehab"], count: 1 },
  ],
  speed_agility: [
    { name: "Prep & Prehab", categories: ["prehab"], count: 1 },
    { name: "Plyometrics", categories: ["power_plyo"], count: 1 },
    { name: "Speed & Change of Direction", categories: ["speed_cod"], count: 3 },
  ],
  court_skill: [
    { name: "Warm-Up Shooting", categories: ["shooting"], count: 1 },
    { name: "Ball-Handling", categories: ["ball_handling"], count: 1 },
    { name: "Shooting", categories: ["shooting"], count: 2 },
    { name: "Finishing", categories: ["finishing"], count: 1 },
    { name: "Footwork", categories: ["footwork"], count: 1 },
  ],
  court_decisions: [
    { name: "Ball-Handling", categories: ["ball_handling"], count: 1 },
    { name: "Decision-Making", categories: ["decision_making"], count: 2 },
    { name: "Defense", categories: ["defense"], count: 1 },
    { name: "Live Reps", categories: ["live_reps"], count: 1 },
  ],
  conditioning: [
    { name: "Prep & Prehab", categories: ["prehab"], count: 1 },
    { name: "Conditioning", categories: ["conditioning"], count: 2 },
  ],
  recovery: [
    { name: "Mobility & Prehab", categories: ["prehab"], count: 3 },
    { name: "Technical Shooting", categories: ["shooting"], count: 2 },
    { name: "Light Ball-Handling", categories: ["ball_handling"], count: 1 },
  ],
};

const GYM_FOCUSES: SessionFocus[] = ["lower_power", "upper", "speed_agility", "conditioning"];

function emphasisForCategory(e: TrainingEmphasis, c: DrillCategory): number {
  switch (c) {
    case "shooting": return e.shooting;
    case "finishing": return e.finishing;
    case "ball_handling": return e.ballhandling;
    case "footwork": return e.ballhandling;
    case "decision_making": return e.playmaking;
    case "live_reps": return (e.playmaking + e.perimeterDefense) / 2;
    case "defense": return Math.max(e.perimeterDefense, e.interiorDefense);
    case "lower_strength": return e.strength;
    case "upper_push_pull": return e.strength * 0.7;
    case "power_plyo": return e.power;
    case "speed_cod": return e.speedAgility;
    case "conditioning": return e.conditioning;
    case "core": return 0.4;
    case "prehab": return 0.3;
  }
}

function hasEquipment(drill: Drill, available: Equipment[]): boolean {
  return drill.equipment.every((eq) => eq === "none" || available.includes(eq));
}

function regionBlocked(drill: Drill, injury: BodyRegion[]): boolean {
  if (injury.length === 0) return false;
  return drill.regions.some((r) => r !== "none" && injury.includes(r));
}

function repsPart(dose: string): string {
  const idx = dose.indexOf("×");
  return idx >= 0 ? dose.slice(idx + 1).trim() : dose;
}

export function generateSession(input: GenerateInput): GeneratedSession {
  const injury = input.injuryRegions ?? [];
  const autoreg = autoregulate(input.readiness);
  const phaseCfg = PHASES[input.phase];
  const playerTierIdx = TIER_ORDER.indexOf(input.tier);
  const gap = new Set(input.gapDimensions);

  // Readiness can downgrade a gym day into skill/recovery work (spec 3.4 red rule).
  let focus = input.focus;
  let downgradedFrom: SessionFocus | undefined;
  if (autoreg.skillOnly && GYM_FOCUSES.includes(focus)) {
    downgradedFrom = focus;
    focus = "recovery";
  }

  const isGymDay = GYM_FOCUSES.includes(focus);
  const volumeBase = autoreg.volumeMultiplier * (isGymDay ? phaseCfg.gymVolume : phaseCfg.courtVolume) * (input.youth ? 0.8 : 1);

  const usedIds = new Set<string>();
  const blocks: SessionBlock[] = [];

  for (const spec of FOCUS_BLOCKS[focus]) {
    const candidates = DRILLS.filter((drill) => {
      if (!spec.categories.includes(drill.category)) return false;
      if (TIER_ORDER.indexOf(drill.tier) > playerTierIdx) return false;
      if (!hasEquipment(drill, input.availableEquipment)) return false;
      if (regionBlocked(drill, injury)) return false;
      if (usedIds.has(drill.id)) return false;
      // Plyo gating: no plyo when readiness forbids; no high-CNS plyo when the phase forbids max plyo.
      if (drill.category === "power_plyo") {
        if (!autoreg.allowPlyo) return false;
        if (!phaseCfg.allowMaxPlyo && drill.cnsLoad === "high") return false;
      }
      return true;
    });

    const scored = candidates
      .map((drill) => {
        const developsGap = drill.develops.some((dim) => gap.has(dim));
        const score =
          (developsGap ? 3 : 0) +
          emphasisForCategory(input.emphasis, drill.category) * 2 +
          // small deterministic tiebreaker so ordering is stable
          (playerTierIdx - TIER_ORDER.indexOf(drill.tier)) * 0.01;
        return { drill, score, developsGap };
      })
      .sort((a, b) => b.score - a.score || a.drill.id.localeCompare(b.drill.id));

    const picked = scored.slice(0, spec.count);
    if (picked.length === 0) continue;

    const drills: PrescribedDrill[] = picked.map(({ drill, developsGap }) => {
      const sets = drill.defaultSets > 0 ? Math.max(1, Math.round(drill.defaultSets * volumeBase)) : 0;
      const doseLabel = sets > 0 ? `${sets} × ${repsPart(drill.dose)}` : drill.dose;
      const gapDim = developsGap ? drill.develops.find((dim) => gap.has(dim)) : undefined;
      return {
        drill,
        sets,
        doseLabel,
        reason: gapDim ? `Targets your gap` : undefined,
      };
    });

    for (const p of drills) usedIds.add(p.drill.id);
    blocks.push({ name: spec.name, drills });
  }

  const estimatedMinutes =
    Math.round(
      blocks.reduce(
        (sum, b) => sum + b.drills.reduce((s, p) => s + (p.sets > 0 ? p.sets * 3 : 8), 0),
        0,
      ) / 5,
    ) * 5;

  return {
    focus,
    title: FOCUS_LABEL[focus],
    domain: domainOf(FOCUS_BLOCKS[focus][0]!.categories[0]!),
    phaseLabel: phaseCfg.label,
    estimatedMinutes,
    autoreg,
    downgradedFrom,
    blocks,
  };
}
