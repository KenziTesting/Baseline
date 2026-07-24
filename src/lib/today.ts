import {
  buildMicrocycle,
  generateSession,
  tierForLevel,
  ARCHETYPES_BY_ID,
  type BodyRegion,
  type GeneratedSession,
  type SeasonPhase,
  type Equipment,
  type GapReport,
  type PlayerProfile,
  type Readiness,
} from "./core";

export interface TodayResult {
  isRest: boolean;
  dayLabel: string;
  session: GeneratedSession | null;
}

/** Map JS weekday (0=Sun) to the microcycle index (0=Mon). */
function microcycleIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export interface TodayInputs {
  profile: PlayerProfile;
  gapReport: GapReport;
  aspirationalArchetypeId: string;
  phase: SeasonPhase;
  availableEquipment: Equipment[];
  readiness: Readiness;
  injuryRegions?: BodyRegion[];
  date?: Date;
}

export function selectTodaySession(inputs: TodayInputs): TodayResult {
  const date = inputs.date ?? new Date();
  const tier = tierForLevel(inputs.profile.level);
  const week = buildMicrocycle(inputs.phase, tier);
  const day = week[microcycleIndex(date)]!;

  if (day.focus === "rest") {
    return { isRest: true, dayLabel: day.label, session: null };
  }

  const archetype = ARCHETYPES_BY_ID[inputs.aspirationalArchetypeId];
  const emphasis = archetype?.trainingEmphasis ?? {
    shooting: 0.5, finishing: 0.5, ballhandling: 0.5, playmaking: 0.5,
    perimeterDefense: 0.5, interiorDefense: 0.5, strength: 0.5, power: 0.5,
    speedAgility: 0.5, conditioning: 0.5,
  };

  const session = generateSession({
    focus: day.focus,
    tier,
    gapDimensions: inputs.gapReport.gaps.map((g) => g.dimension),
    emphasis,
    availableEquipment: inputs.availableEquipment,
    phase: inputs.phase,
    readiness: inputs.readiness,
    injuryRegions: inputs.injuryRegions,
    youth: inputs.profile.age < 16,
  });

  return { isRest: false, dayLabel: day.label, session };
}
