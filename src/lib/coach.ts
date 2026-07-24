import {
  ARCHETYPES_BY_ID, autoregulate, computeAllMuscleFatigue, MUSCLES,
  type MuscleId,
} from "./core";
import { selectTodaySession } from "./today";
import { getWeek } from "./mental";
import type { useBaselineStore } from "./store";

type State = ReturnType<typeof useBaselineStore.getState>;

/** Assemble the athlete's context for the coach — from logged data only, never fabricated. */
export function buildCoachContext(s: State): string {
  const lines: string[] = [];
  const now = Date.now();

  if (s.profile) {
    lines.push(`Athlete: ${s.profile.displayName}, age ${s.profile.age}, ${s.profile.level.toUpperCase()}, positions ${s.profile.positions.join("/")}.`);
  }
  if (s.alterEgo) lines.push(`Alter ego (use this name): ${s.alterEgo.name}.`);

  if (s.match) {
    lines.push(`Archetype — plays like ${s.match.bestGameComp.archetype.name} (${s.match.bestGameComp.archetype.nbaReference}); built like ${s.match.bestBuildComp.archetype.name}.`);
  }
  if (s.gapReport) {
    lines.push(`Gaps to close: ${s.gapReport.gaps.map((g) => g.label).join(", ")}.`);
  }

  if (s.readiness) {
    const a = autoregulate(s.readiness);
    lines.push(`Readiness: ${s.readiness.recovery}% (${a.zone}), source ${s.readiness.source}. ${a.message}`);
  } else {
    lines.push("Readiness: none logged yet.");
  }

  if (s.profile && s.gapReport && s.aspirationalArchetypeId && s.readiness) {
    const today = selectTodaySession({
      profile: s.profile, gapReport: s.gapReport, aspirationalArchetypeId: s.aspirationalArchetypeId,
      phase: s.phase, availableEquipment: s.availableEquipment, readiness: s.readiness,
    });
    lines.push(`Today (${today.dayLabel}): ${today.isRest ? "REST DAY" : today.session?.title + " · " + today.session?.estimatedMinutes + " min"}.`);
  }

  if (s.strengthLogs.length > 0) {
    const fatigue = computeAllMuscleFatigue({ sets: s.strengthLogs, now, calibration: s.calibration, systemic: s.readiness ? { recoveryScore: s.readiness.recovery } : undefined });
    const top = (Object.keys(fatigue) as MuscleId[]).map((m) => ({ m, pct: fatigue[m].displayedPct })).sort((a, b) => b.pct - a.pct)[0];
    if (top) lines.push(`Most fatigued muscle: ${MUSCLES[top.m].commonName} at ${Math.round(top.pct)}% estimated training load.`);
  }

  if (s.subscription.active) {
    const week = getWeek(s.currentWeekIndex);
    if (week) lines.push(`Mental module — Week ${week.index}: ${week.name} (${week.theme}).`);
  }

  const aspirational = s.aspirationalArchetypeId ? ARCHETYPES_BY_ID[s.aspirationalArchetypeId] : undefined;
  if (aspirational) lines.push(`Training toward: ${aspirational.name}.`);

  return lines.join("\n");
}
