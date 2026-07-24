import { describe, expect, it } from "vitest";
import {
  computeMuscleFatigue,
  epleyOneRepMax,
  estimateExerciseOneRM,
  muscleCapacity,
  setBaseStimulus,
  type LoggedSet,
} from "./engine";
import { STRENGTH_EXERCISES_BY_ID } from "../strength/library";

const HOUR = 3_600_000;
const MONDAY = Date.UTC(2026, 6, 20, 17, 0, 0); // 2026-07-20 is a Monday
const lib = STRENGTH_EXERCISES_BY_ID;

/** Spec F3 mandated scenario: 4×8 hip thrust @100 kg on Monday → glute on Wednesday. */
const hipThrustMonday: LoggedSet[] = Array.from({ length: 4 }, () => ({
  exerciseId: "barbell-hip-thrust",
  timestamp: MONDAY,
  load: 100,
  reps: 8,
  rir: 2,
}));

describe("epley / 1RM", () => {
  it("computes Epley 1RM", () => {
    expect(epleyOneRepMax(100, 8)).toBeCloseTo(126.667, 2);
  });
  it("estimates exercise 1RM from the best trustworthy set", () => {
    expect(estimateExerciseOneRM(hipThrustMonday, "barbell-hip-thrust")).toBeCloseTo(126.667, 2);
  });
});

describe("hip thrust worked example (hand-computed)", () => {
  const ex = lib["barbell-hip-thrust"]!;
  const e1RM = estimateExerciseOneRM(hipThrustMonday, "barbell-hip-thrust");

  it("per-set base stimulus ≈ 3.83", () => {
    // relInt 100/126.667=0.7895 × reps 8 × effort e^-0.5=0.6065 × mult 1.0
    expect(setBaseStimulus(hipThrustMonday[0]!, ex, e1RM)).toBeCloseTo(3.831, 2);
  });

  it("glute capacity floors at 14 for a new athlete", () => {
    expect(muscleCapacity("glute_max", hipThrustMonday, MONDAY, lib)).toBeCloseTo(14, 5);
  });

  it("glutes read ~60% right after Monday's session", () => {
    const r = computeMuscleFatigue("glute_max", { sets: hipThrustMonday, now: MONDAY });
    expect(r.localPct).toBeCloseTo(60.2, 0);
  });

  it("glutes read ~13% by Wednesday (48h later) — the mandated check", () => {
    const r = computeMuscleFatigue("glute_max", { sets: hipThrustMonday, now: MONDAY + 48 * HOUR });
    expect(r.localPct).toBeCloseTo(13.4, 0);
  });

  it("estimates recovery (<30%) at roughly 22h out", () => {
    const r = computeMuscleFatigue("glute_max", { sets: hipThrustMonday, now: MONDAY });
    expect(r.etaHours).toBeGreaterThan(20);
    expect(r.etaHours).toBeLessThan(24);
  });

  it("a muscle the drill doesn't touch reads 0", () => {
    const r = computeMuscleFatigue("biceps", { sets: hipThrustMonday, now: MONDAY });
    expect(r.localPct).toBe(0);
  });
});

describe("recovery class + fatigue multiplier behavior", () => {
  it("Nordic curls linger far longer than hip thrusts (slow class × 1.8 multiplier)", () => {
    const nordic: LoggedSet[] = Array.from({ length: 3 }, () => ({
      exerciseId: "nordic-hamstring-curl",
      timestamp: MONDAY,
      reps: 5,
      rir: 1,
    }));
    const day2 = computeMuscleFatigue("hamstring", { sets: nordic, now: MONDAY + 48 * HOUR });
    const gluteDay2 = computeMuscleFatigue("glute_max", { sets: hipThrustMonday, now: MONDAY + 48 * HOUR });
    // 48h out, hamstrings from Nordics are still well elevated; glutes are nearly fresh.
    expect(day2.localPct).toBeGreaterThan(45);
    expect(day2.localPct).toBeGreaterThan(gluteDay2.localPct * 3);
  });

  it("marks low-confidence when RIR/RPE weren't logged", () => {
    const noEffort: LoggedSet[] = [{ exerciseId: "barbell-hip-thrust", timestamp: MONDAY, load: 100, reps: 8 }];
    expect(computeMuscleFatigue("glute_max", { sets: noEffort, now: MONDAY }).lowConfidence).toBe(true);
  });
});

describe("plyometric ground contacts", () => {
  it("uses groundContacts (not reps) for plyo drills", () => {
    const depthDrop: LoggedSet[] = [
      { exerciseId: "depth-drop-rebound-jump", timestamp: MONDAY, groundContacts: 3, rir: 4 },
    ];
    const r = computeMuscleFatigue("quad", { sets: depthDrop, now: MONDAY });
    expect(r.localPct).toBeGreaterThan(0);
  });
});
