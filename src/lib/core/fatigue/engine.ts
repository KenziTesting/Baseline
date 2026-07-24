/**
 * Fatigue engine (spec Part D.4) — pure, deterministic, fully traceable.
 *
 * ARCHITECTURAL REQUIREMENT (spec, top of doc): every number the user sees must
 * be reproducible from one pure function + the logged sets. `computeMuscleFatigue`
 * is that function. No randomness, no I/O, no LLM.
 *
 *   SU(set,muscle) = relativeIntensity × repsOrContacts × contribution
 *                    × effortFactor × fatigueMultiplier            (step 1)
 *   F(muscle,t)    = Σ SU_i × exp(-(t - t_i) / τ_i)                (step 2)
 *   fatiguePct     = 100 × min(1, F / capacity)                    (step 3)
 *   displayed      = 0.75·local + 0.25·systemic                    (step 4)
 *   ETA            = solve fatiguePct < 30%                        (step 6)
 */

import { MUSCLES, type MuscleId } from "../strength/muscles";
import type { MuscleCalibration } from "./calibration";
import type { Exercise } from "../strength/exercise";
import { STRENGTH_EXERCISES_BY_ID } from "../strength/library";
import {
  CAPACITY_UNIT,
  CAPACITY_WINDOW_DAYS,
  DEFAULT_RIR,
  EFFORT_DECAY,
  LOCAL_BLEND,
  MAX_ETA_HOURS,
  MAX_RELATIVE_INTENSITY,
  ONE_RM_MAX_TRUSTED_REPS,
  RECOVERY_CLASS_TAU_SCALE,
  RECOVERY_THRESHOLD_PCT,
  SYSTEMIC_BLEND,
  SYSTEMIC_SU_REFERENCE,
} from "./constants";

const HOUR = 3_600_000;

export interface LoggedSet {
  exerciseId: string;
  /** Epoch ms when the set was performed. */
  timestamp: number;
  load?: number;
  reps?: number;
  groundContacts?: number;
  rir?: number;
  rpe?: number;
  /** Known estimated 1RM for this exercise; else derived from history. */
  e1RM?: number;
  /** Which side a unilateral set trained — enables asymmetry detection (F9). */
  side?: "l" | "r";
}

export interface SystemicInput {
  /** WHOOP recovery 0-100 (higher = fresher). */
  recoveryScore?: number;
  sleepDebtHours?: number;
}

export interface FatigueInput {
  sets: LoggedSet[];
  now: number;
  exercises?: Record<string, Exercise>;
  systemic?: SystemicInput;
  /** Per-muscle τ / capacity multipliers learned from soreness check-ins (F9). */
  calibration?: MuscleCalibration;
}

/** Epley (spec A.1): only trusted at ≤8 reps. */
export function epleyOneRepMax(load: number, reps: number): number {
  return load * (1 + reps / 30);
}

/** Best trustworthy estimated 1RM for an exercise from the logs, or null. */
export function estimateExerciseOneRM(sets: LoggedSet[], exerciseId: string): number | null {
  let best: number | null = null;
  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue;
    if (s.e1RM != null) best = Math.max(best ?? 0, s.e1RM);
    else if (s.load != null && s.reps != null && s.reps <= ONE_RM_MAX_TRUSTED_REPS) {
      best = Math.max(best ?? 0, epleyOneRepMax(s.load, s.reps));
    }
  }
  return best;
}

function effortFactor(set: LoggedSet): number {
  const rir = set.rir ?? (set.rpe != null ? Math.max(0, 10 - set.rpe) : DEFAULT_RIR);
  return Math.exp(-EFFORT_DECAY * rir);
}

function relativeIntensity(set: LoggedSet, ex: Exercise, e1RM: number | null): number {
  if (set.load != null && e1RM != null && e1RM > 0) {
    return Math.min(MAX_RELATIVE_INTENSITY, set.load / e1RM);
  }
  // bodyweight / band / plyo → configured proxy (heuristic), else neutral 0.5
  return ex.loadGuidance.intensityProxy ?? 0.5;
}

function repsOrContacts(set: LoggedSet, ex: Exercise): number {
  if (ex.countsPlyoContacts) return set.groundContacts ?? set.reps ?? 0;
  return set.reps ?? 0;
}

/** Base stimulus for a set (before splitting across muscles). */
export function setBaseStimulus(set: LoggedSet, ex: Exercise, e1RM: number | null): number {
  return relativeIntensity(set, ex, e1RM) * repsOrContacts(set, ex) * effortFactor(set) * ex.fatigueMultiplier;
}

function tauHours(muscle: MuscleId, ex: Exercise, cal?: MuscleCalibration): number {
  const base = MUSCLES[muscle].recoveryTauHours * RECOVERY_CLASS_TAU_SCALE[ex.recoveryClass];
  return base * (cal?.[muscle]?.tauMult ?? 1);
}

/** Individualized capacity: max(floor, rolling 4-week peak weekly SU). */
export function muscleCapacity(muscle: MuscleId, sets: LoggedSet[], now: number, lib: Record<string, Exercise>, cal?: MuscleCalibration): number {
  const floor = MUSCLES[muscle].capacityWeight * CAPACITY_UNIT * (cal?.[muscle]?.capMult ?? 1);
  const weekBins = Math.ceil(CAPACITY_WINDOW_DAYS / 7);
  const bins = new Array<number>(weekBins).fill(0);
  for (const s of sets) {
    const ex = lib[s.exerciseId];
    if (!ex) continue;
    const contribution = ex.muscleContributions[muscle];
    if (!contribution) continue;
    const ageDays = (now - s.timestamp) / (24 * HOUR);
    if (ageDays < 0 || ageDays >= CAPACITY_WINDOW_DAYS) continue;
    const bin = Math.min(weekBins - 1, Math.floor(ageDays / 7));
    const e1RM = s.e1RM ?? estimateExerciseOneRM(sets, s.exerciseId);
    bins[bin]! += setBaseStimulus(s, ex, e1RM) * contribution;
  }
  const peakWeekly = Math.max(0, ...bins);
  return Math.max(floor, peakWeekly);
}

/** Decayed fatigue F for a muscle at time t. */
export function fatigueAt(muscle: MuscleId, sets: LoggedSet[], t: number, lib: Record<string, Exercise>, cal?: MuscleCalibration): number {
  let f = 0;
  for (const s of sets) {
    const ex = lib[s.exerciseId];
    if (!ex) continue;
    const contribution = ex.muscleContributions[muscle];
    if (!contribution || s.timestamp > t) continue;
    const e1RM = s.e1RM ?? estimateExerciseOneRM(sets, s.exerciseId);
    const su = setBaseStimulus(s, ex, e1RM) * contribution;
    const tau = tauHours(muscle, ex, cal);
    f += su * Math.exp(-((t - s.timestamp) / HOUR) / tau);
  }
  return f;
}

/** Whole-body systemic load 0-100 (spec D.4 step 4). Heuristic; labeled in the UI. */
export function systemicFatigue(sets: LoggedSet[], now: number, lib: Record<string, Exercise>, systemic?: SystemicInput): number {
  // 7-day total SU across all muscles.
  let weekSU = 0;
  for (const s of sets) {
    const ex = lib[s.exerciseId];
    if (!ex) continue;
    const ageDays = (now - s.timestamp) / (24 * HOUR);
    if (ageDays < 0 || ageDays >= 7) continue;
    const e1RM = s.e1RM ?? estimateExerciseOneRM(sets, s.exerciseId);
    weekSU += setBaseStimulus(s, ex, e1RM); // full base, summed once per set
  }
  const loadComponent = Math.min(100, (weekSU / SYSTEMIC_SU_REFERENCE) * 100);
  if (systemic?.recoveryScore != null) {
    // WHOOP: low recovery → high systemic fatigue. Blend with accumulated load.
    return clamp(0.5 * (100 - systemic.recoveryScore) + 0.5 * loadComponent, 0, 100);
  }
  return clamp(loadComponent, 0, 100);
}

/** Numeric ETA (hours) until local fatigue drops below the recovery threshold. */
export function recoveryEtaHours(muscle: MuscleId, sets: LoggedSet[], now: number, capacity: number, lib: Record<string, Exercise>, cal?: MuscleCalibration): number | null {
  const target = (RECOVERY_THRESHOLD_PCT / 100) * capacity;
  if (fatigueAt(muscle, sets, now, lib, cal) <= target) return 0;
  for (let dt = 1; dt <= MAX_ETA_HOURS; dt++) {
    if (fatigueAt(muscle, sets, now + dt * HOUR, lib, cal) <= target) return dt;
  }
  return null; // longer than the cap
}

export interface SessionCause {
  dateISO: string;
  contributionSU: number;
  contributionPct: number;
  exercises: string[];
}

/** "What caused this" — decayed contribution of each past day's session to today's F. */
export function causeBreakdown(muscle: MuscleId, sets: LoggedSet[], now: number, lib: Record<string, Exercise>, topN = 3): SessionCause[] {
  const byDay = new Map<string, { su: number; exercises: Set<string> }>();
  for (const s of sets) {
    const ex = lib[s.exerciseId];
    if (!ex) continue;
    const contribution = ex.muscleContributions[muscle];
    if (!contribution || s.timestamp > now) continue;
    const e1RM = s.e1RM ?? estimateExerciseOneRM(sets, s.exerciseId);
    const su = setBaseStimulus(s, ex, e1RM) * contribution * Math.exp(-((now - s.timestamp) / HOUR) / tauHours(muscle, ex));
    const day = new Date(s.timestamp).toISOString().slice(0, 10);
    const entry = byDay.get(day) ?? { su: 0, exercises: new Set<string>() };
    entry.su += su;
    entry.exercises.add(ex.name);
    byDay.set(day, entry);
  }
  const total = [...byDay.values()].reduce((sum, e) => sum + e.su, 0) || 1;
  return [...byDay.entries()]
    .map(([dateISO, e]) => ({ dateISO, contributionSU: e.su, contributionPct: (e.su / total) * 100, exercises: [...e.exercises] }))
    .sort((a, b) => b.contributionSU - a.contributionSU)
    .slice(0, topN);
}

export interface MuscleFatigue {
  muscle: MuscleId;
  fatigue: number;          // decayed F value
  capacity: number;
  localPct: number;         // 0-100 before systemic blend
  displayedPct: number;     // 0-100 after systemic blend
  etaHours: number | null;
  lowConfidence: boolean;   // any contributing set lacked RIR/RPE
}

/** THE traceable function. Given logs → this muscle's fatigue, fully derivable. */
export function computeMuscleFatigue(muscle: MuscleId, input: FatigueInput): MuscleFatigue {
  const lib = input.exercises ?? STRENGTH_EXERCISES_BY_ID;
  const { sets, now, calibration: cal } = input;
  const f = fatigueAt(muscle, sets, now, lib, cal);
  const capacity = muscleCapacity(muscle, sets, now, lib, cal);
  const localPct = 100 * Math.min(1, f / capacity);
  const systemic = systemicFatigue(sets, now, lib, input.systemic);
  const displayedPct = clamp(LOCAL_BLEND * localPct + SYSTEMIC_BLEND * systemic, 0, 100);
  const contributes = sets.some((s) => lib[s.exerciseId]?.muscleContributions[muscle]);
  const lowConfidence = sets.some(
    (s) => lib[s.exerciseId]?.muscleContributions[muscle] && s.rir == null && s.rpe == null,
  );
  return {
    muscle,
    fatigue: f,
    capacity,
    localPct,
    displayedPct,
    etaHours: contributes ? recoveryEtaHours(muscle, sets, now, capacity, lib, cal) : 0,
    lowConfidence,
  };
}

/** Compute fatigue for every muscle in the taxonomy. */
export function computeAllMuscleFatigue(input: FatigueInput): Record<MuscleId, MuscleFatigue> {
  const out = {} as Record<MuscleId, MuscleFatigue>;
  for (const muscle of Object.keys(MUSCLES) as MuscleId[]) {
    out[muscle] = computeMuscleFatigue(muscle, input);
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
