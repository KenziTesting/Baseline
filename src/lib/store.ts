"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  computeDNAVector,
  computeGapReport,
  matchArchetypes,
  ARCHETYPES_BY_ID,
  ALL_EQUIPMENT,
  calibrateFromSoreness,
  computeAllMuscleFatigue,
  type CalibrationAdjustment,
  type DNAVector,
  type Equipment,
  type GapReport,
  type LoggedSet as StrengthSet,
  type MatchResult,
  type MuscleCalibration,
  type MuscleId,
  type PlayerProfile,
  type Readiness,
  type SeasonPhase,
} from "./core";
import { ENGINE_VERSION, hashProfileInputs } from "./engine";
import { MockWearableProvider } from "./providers/wearable/mock";
import { readinessFromSelfReport, type SelfReport } from "./providers/wearable/selfReport";
import { buildDemoHistory } from "./demo/seed";
import type { BodyMetric, ShotLog } from "./progress/types";
import type {
  AlterEgo, FocusRating, Intention, MSIResult, PressureFT, ResetTimeLog, TensionAudit,
} from "./mental/types";

export type SubscriptionPlan = "free" | "intro" | "monthly" | "annual";
export interface Subscription {
  active: boolean;
  plan: SubscriptionPlan;
}

export type WearableMode = "demo" | "self" | "whoop";
export interface WhoopStatus {
  configured: boolean;
  connected: boolean;
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DNASnapshot {
  vector: DNAVector;
  notes: string[];
  engineVersion: string;
  inputHash: string;
  computedAt: string;
}

export interface LoggedSet {
  reps?: string;
  load?: string;
}
export interface LoggedDrill {
  drillId: string;
  drillName: string;
  sets: LoggedSet[];
  rpe?: number;
  skipped?: boolean;
}
export interface SessionLogRecord {
  id: string;
  dateISO: string;
  focus: string;
  title: string;
  recovery?: number;
  entries: LoggedDrill[];
  completedAt: string;
}

interface BaselineState {
  profile: PlayerProfile | null;
  dna: DNASnapshot | null;
  match: MatchResult | null;
  aspirationalArchetypeId: string | null;
  isUserOverride: boolean;
  gapReport: GapReport | null;

  // ---- Phase 2: training ----
  phase: SeasonPhase;
  availableEquipment: Equipment[];
  readiness: Readiness | null;
  readinessLoaded: boolean;
  sessionLogs: SessionLogRecord[];

  // ---- Phase 3: wearable source ----
  wearableMode: WearableMode;
  selfReportByDate: Record<string, SelfReport>;
  whoopStatus: WhoopStatus | null;

  // ---- Expansion: progress + fatigue data ----
  strengthLogs: StrengthSet[];
  shootingLogs: ShotLog[];
  bodyMetrics: BodyMetric[];
  demoDataLoaded: boolean;

  // ---- THE WEEK: mentality module ----
  subscription: Subscription;
  alterEgo: AlterEgo | null;
  currentWeekIndex: number;
  blockCompletions: Record<string, boolean>; // `${weekIndex}:${day}` -> done
  intentions: Intention[];
  pressureFTs: PressureFT[];
  tensionAudits: TensionAudit[];
  resetTimes: ResetTimeLog[];
  focusRatings: FocusRating[];
  msiResults: MSIResult[];
  /** Wednesday's 85%-vs-100% set result (makes). */
  quietHands: { at85Makes: number; at100Makes: number } | null;

  // ---- F9: soreness calibration ----
  calibration: MuscleCalibration;
  calibrationLog: CalibrationAdjustment[];

  completeOnboarding: (profile: PlayerProfile) => void;
  setAspirational: (archetypeId: string, isOverride: boolean) => void;
  setPhase: (phase: SeasonPhase) => void;
  setEquipment: (equipment: Equipment[]) => void;
  loadReadiness: () => Promise<void>;
  logSession: (record: SessionLogRecord) => void;
  setWearableMode: (mode: WearableMode) => void;
  saveSelfReport: (dateISO: string, report: SelfReport) => void;
  refreshWhoopStatus: () => Promise<void>;
  loadDemoHistory: () => void;
  clearDemoHistory: () => void;
  // mentality actions
  setSubscription: (plan: SubscriptionPlan, active: boolean) => void;
  setAlterEgo: (ego: AlterEgo) => void;
  setCurrentWeek: (index: number) => void;
  toggleBlock: (weekIndex: number, day: number) => void;
  saveIntention: (weekIndex: number, text: string) => void;
  gradeIntention: (weekIndex: number, grade: number) => void;
  logTensionAudit: (audit: TensionAudit) => void;
  logPressureFT: (ft: PressureFT) => void;
  saveMSI: (result: MSIResult) => void;
  loadDemoMental: () => void;
  applySorenessCheckIn: (reported: Partial<Record<MuscleId, number>>) => number;
  reset: () => void;
}

export const useBaselineStore = create<BaselineState>()(
  persist(
    (set, get) => ({
      profile: null,
      dna: null,
      match: null,
      aspirationalArchetypeId: null,
      isUserOverride: false,
      gapReport: null,

      phase: "offseason",
      availableEquipment: ALL_EQUIPMENT,
      readiness: null,
      readinessLoaded: false,
      sessionLogs: [],

      wearableMode: "demo",
      selfReportByDate: {},
      whoopStatus: null,

      strengthLogs: [],
      shootingLogs: [],
      bodyMetrics: [],
      demoDataLoaded: false,

      subscription: { active: false, plan: "free" },
      alterEgo: null,
      currentWeekIndex: 3,
      blockCompletions: {},
      intentions: [],
      pressureFTs: [],
      tensionAudits: [],
      resetTimes: [],
      focusRatings: [],
      msiResults: [],
      quietHands: null,

      calibration: {},
      calibrationLog: [],

      completeOnboarding: (profile) => {
        const { vector, notes } = computeDNAVector(profile);
        const match = matchArchetypes(vector);
        const aspirationalId = match.bestGameComp.archetype.id;
        const aspirational = ARCHETYPES_BY_ID[aspirationalId]!;
        const gapReport = computeGapReport(vector, aspirational);

        set({
          profile,
          dna: {
            vector,
            notes,
            engineVersion: ENGINE_VERSION,
            inputHash: hashProfileInputs(profile),
            computedAt: new Date().toISOString(),
          },
          match,
          aspirationalArchetypeId: aspirationalId,
          isUserOverride: false,
          gapReport,
        });
      },

      setAspirational: (archetypeId, isOverride) => {
        const { dna } = get();
        if (!dna) return;
        const archetype = ARCHETYPES_BY_ID[archetypeId];
        if (!archetype) return;
        set({
          aspirationalArchetypeId: archetypeId,
          isUserOverride: isOverride,
          gapReport: computeGapReport(dna.vector, archetype),
        });
      },

      setPhase: (phase) => set({ phase }),
      setEquipment: (availableEquipment) => set({ availableEquipment }),

      loadReadiness: async () => {
        const { wearableMode, selfReportByDate } = get();

        if (wearableMode === "whoop") {
          // Real WHOOP data via the server route (secrets stay server-side).
          // Returns null when not connected / no reading yet — never fabricated.
          try {
            const res = await fetch("/api/whoop/readiness");
            const json = (await res.json()) as { readiness: Readiness | null };
            set({ readiness: json.readiness ?? null, readinessLoaded: true });
          } catch {
            set({ readiness: null, readinessLoaded: true });
          }
          return;
        }

        if (wearableMode === "self") {
          const report = selfReportByDate[todayISO()];
          set({ readiness: report ? readinessFromSelfReport(report) : null, readinessLoaded: true });
          return;
        }

        // Demo mode: mock provider, clearly labeled as demo data in the UI.
        const readiness = await new MockWearableProvider().getTodayReadiness();
        set({ readiness, readinessLoaded: true });
      },

      logSession: (record) =>
        set((s) => ({ sessionLogs: [record, ...s.sessionLogs].slice(0, 100) })),

      setWearableMode: (wearableMode) => {
        set({ wearableMode, readinessLoaded: false });
        void get().loadReadiness();
      },

      saveSelfReport: (dateISO, report) => {
        set((s) => ({ selfReportByDate: { ...s.selfReportByDate, [dateISO]: report } }));
        if (get().wearableMode === "self") void get().loadReadiness();
      },

      refreshWhoopStatus: async () => {
        try {
          const res = await fetch("/api/whoop/status");
          const whoopStatus = (await res.json()) as WhoopStatus;
          set({ whoopStatus });
        } catch {
          set({ whoopStatus: { configured: false, connected: false } });
        }
      },

      loadDemoHistory: () => {
        const { strengthLogs, shootingLogs, bodyMetrics } = buildDemoHistory(Date.now());
        set({ strengthLogs, shootingLogs, bodyMetrics, demoDataLoaded: true });
      },

      clearDemoHistory: () => set({ strengthLogs: [], shootingLogs: [], bodyMetrics: [], demoDataLoaded: false }),

      setSubscription: (plan, active) => set({ subscription: { plan, active } }),
      setAlterEgo: (alterEgo) => set({ alterEgo }),
      setCurrentWeek: (currentWeekIndex) => set({ currentWeekIndex }),
      toggleBlock: (weekIndex, day) =>
        set((s) => {
          const key = `${weekIndex}:${day}`;
          return { blockCompletions: { ...s.blockCompletions, [key]: !s.blockCompletions[key] } };
        }),
      saveIntention: (weekIndex, text) =>
        set((s) => {
          const rest = s.intentions.filter((i) => i.weekIndex !== weekIndex);
          const existing = s.intentions.find((i) => i.weekIndex === weekIndex);
          return { intentions: [...rest, { weekIndex, text, grade: existing?.grade }] };
        }),
      gradeIntention: (weekIndex, grade) =>
        set((s) => ({
          intentions: s.intentions.map((i) => (i.weekIndex === weekIndex ? { ...i, grade } : i)),
        })),
      logTensionAudit: (audit) => set((s) => ({ tensionAudits: [...s.tensionAudits, audit] })),
      logPressureFT: (ft) => set((s) => ({ pressureFTs: [...s.pressureFTs, ft] })),
      saveMSI: (result) => set((s) => ({ msiResults: [...s.msiResults, result] })),

      applySorenessCheckIn: (reported) => {
        const { strengthLogs, calibration, readiness, calibrationLog } = get();
        const now = Date.now();
        const predicted = computeAllMuscleFatigue({
          sets: strengthLogs, now, calibration,
          systemic: readiness ? { recoveryScore: readiness.recovery } : undefined,
        });
        const predictedPct: Partial<Record<MuscleId, number>> = {};
        for (const m of Object.keys(reported) as MuscleId[]) predictedPct[m] = predicted[m]?.displayedPct ?? 0;
        const { calibration: next, adjustments } = calibrateFromSoreness(
          calibration, reported, predictedPct, new Date(now).toISOString().slice(0, 10),
        );
        set({ calibration: next, calibrationLog: [...adjustments, ...calibrationLog].slice(0, 200) });
        return adjustments.length;
      },

      loadDemoMental: () => {
        const iso = (offset: number) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);
        set({
          subscription: { active: true, plan: "annual" },
          alterEgo: {
            name: "MAMBA-LITE",
            threeWordsOffCourt: "quiet, careful, kind",
            holdsBackFrom: "taking the last shot",
            doesNotCareLook: "calm, loud, unbothered by the miss",
            trigger: "Tape the wrists",
            totem: "A word on my tape",
            createdAt: new Date().toISOString(),
          },
          currentWeekIndex: 3,
          // Week 3 done except Thursday (The Mirror) — the report calls it out.
          blockCompletions: { "3:0": true, "3:1": true, "3:2": true, "3:4": true, "3:5": true, "3:6": true },
          intentions: [{ weekIndex: 3, text: "Stop gripping the ball on the catch.", grade: 2 }],
          // pressure-FT gap closing: 21 → 18 → 12 over three weeks
          pressureFTs: [
            { dateISO: iso(21), unpressuredMakes: 8, unpressuredAttempts: 10, pressuredMakes: 6, pressuredAttempts: 10 },
            { dateISO: iso(11), unpressuredMakes: 9, unpressuredAttempts: 10, pressuredMakes: 7, pressuredAttempts: 10 },
            { dateISO: iso(2), unpressuredMakes: 9, unpressuredAttempts: 10, pressuredMakes: 8, pressuredAttempts: 10 },
          ],
          // shoulder/jaw tension dropping over the month
          tensionAudits: [
            { dateISO: iso(21), jaw: 4, shoulders: 4.5, hands: 4, breath: 3.5, forehead: 4 },
            { dateISO: iso(9), jaw: 3.5, shoulders: 4.2, hands: 3.5, breath: 3, forehead: 3.5 },
            { dateISO: iso(2), jaw: 3, shoulders: 3.1, hands: 3, breath: 2.5, forehead: 3 },
          ],
          quietHands: { at85Makes: 12, at100Makes: 9 },
          resetTimes: [{ dateISO: iso(2), rating: 1 }, { dateISO: iso(9), rating: 2 }],
          focusRatings: [
            { dateISO: iso(6), rating: 3, sleepHours: 5.4 }, { dateISO: iso(5), rating: 3, sleepHours: 5.6 },
            { dateISO: iso(4), rating: 4, sleepHours: 7.8 }, { dateISO: iso(3), rating: 5, sleepHours: 8.1 },
          ],
          msiResults: [
            { dateISO: iso(28), scores: { confidence: 55, focus: 50, resilience: 45, competitiveness: 60, pressure_tolerance: 42 } },
            { dateISO: iso(1), scores: { confidence: 68, focus: 64, resilience: 61, competitiveness: 72, pressure_tolerance: 58 } },
          ],
        });
      },

      reset: () =>
        set({
          profile: null,
          dna: null,
          match: null,
          aspirationalArchetypeId: null,
          isUserOverride: false,
          gapReport: null,
          readiness: null,
          readinessLoaded: false,
          sessionLogs: [],
          wearableMode: "demo",
          selfReportByDate: {},
          whoopStatus: null,
          strengthLogs: [],
          shootingLogs: [],
          bodyMetrics: [],
          demoDataLoaded: false,
          subscription: { active: false, plan: "free" },
          alterEgo: null,
          currentWeekIndex: 3,
          blockCompletions: {},
          intentions: [],
          pressureFTs: [],
          tensionAudits: [],
          resetTimes: [],
          focusRatings: [],
          msiResults: [],
          quietHands: null,
          calibration: {},
          calibrationLog: [],
        }),
    }),
    { name: "baseline-store-v1" },
  ),
);
