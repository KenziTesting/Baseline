import { describe, expect, it } from "vitest";
import { calibrateFromSoreness } from "./calibration";
import { asymmetryReport } from "./asymmetry";
import { computeMuscleFatigue, type LoggedSet } from "./engine";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 6, 24, 12, 0, 0);

describe("soreness calibration (F9)", () => {
  it("raises τ and lowers capacity when the athlete is sorer than predicted", () => {
    // Predicted 20% but reported very sore (3/3 → 100 equiv).
    const { calibration, adjustments } = calibrateFromSoreness({}, { hamstring: 3 }, { hamstring: 20 }, "2026-07-24");
    expect(adjustments).toHaveLength(1);
    expect(calibration.hamstring!.tauMult).toBeGreaterThan(1); // slower decay
    expect(calibration.hamstring!.capMult).toBeLessThan(1); // more sensitive
  });

  it("lowers τ when less sore than predicted", () => {
    const { calibration } = calibrateFromSoreness({}, { quad: 0 }, { quad: 80 }, "2026-07-24");
    expect(calibration.quad!.tauMult).toBeLessThan(1);
  });

  it("respects the bounded step (±10% per adjustment)", () => {
    const { calibration } = calibrateFromSoreness({}, { glute_max: 3 }, { glute_max: 0 }, "2026-07-24");
    expect(calibration.glute_max!.tauMult).toBeLessThanOrEqual(1.1 + 1e-9);
  });

  it("changes the fatigue reading once applied", () => {
    const sets: LoggedSet[] = [{ exerciseId: "nordic-hamstring-curl", timestamp: NOW - DAY, reps: 5, rir: 1 }];
    const before = computeMuscleFatigue("hamstring", { sets, now: NOW });
    const { calibration } = calibrateFromSoreness({}, { hamstring: 3 }, { hamstring: before.displayedPct }, "2026-07-24");
    const after = computeMuscleFatigue("hamstring", { sets, now: NOW, calibration });
    // Slower decay → higher residual fatigue after 24h.
    expect(after.localPct).toBeGreaterThan(before.localPct);
  });
});

describe("asymmetry detection (F9)", () => {
  it("flags a left/right imbalance over 15% and names the weaker side", () => {
    const sets: LoggedSet[] = [
      { exerciseId: "rfe-split-squat", timestamp: NOW - DAY, load: 48, reps: 8, rir: 1, side: "r" },
      { exerciseId: "rfe-split-squat", timestamp: NOW - DAY, load: 48, reps: 8, rir: 1, side: "r" },
      { exerciseId: "rfe-split-squat", timestamp: NOW - DAY, load: 30, reps: 5, rir: 2, side: "l" },
    ];
    const report = asymmetryReport(sets, NOW);
    const quad = report.find((r) => r.muscle === "quad")!;
    expect(quad.flagged).toBe(true);
    expect(quad.weakerSide).toBe("l");
  });

  it("returns nothing when no sided data is logged", () => {
    const sets: LoggedSet[] = [{ exerciseId: "rfe-split-squat", timestamp: NOW - DAY, load: 48, reps: 8, rir: 1 }];
    expect(asymmetryReport(sets, NOW)).toHaveLength(0);
  });
});
