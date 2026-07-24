import { describe, expect, it } from "vitest";
import { computeBaselines, type DailyReading } from "./baseline";
import { readinessFromSelfReport } from "./selfReport";
import { mockReadingForDate } from "./mock";

function readings(n: number, hrv = 60, rhr = 54): DailyReading[] {
  return Array.from({ length: n }, (_, i) => ({
    dateISO: `2026-06-${String(i + 1).padStart(2, "0")}`,
    hrvMs: hrv,
    rhrBpm: rhr,
  }));
}

describe("computeBaselines", () => {
  it("returns unreliable with no data", () => {
    const b = computeBaselines([]);
    expect(b.sampleSize).toBe(0);
    expect(b.reliable).toBe(false);
  });

  it("is unreliable below the minimum sample size (cold start)", () => {
    expect(computeBaselines(readings(3)).reliable).toBe(false);
  });

  it("is reliable with a week-plus of data and averages correctly", () => {
    const b = computeBaselines(readings(10, 64, 52));
    expect(b.reliable).toBe(true);
    expect(b.hrvBaselineMs).toBe(64);
    expect(b.rhrBaselineBpm).toBe(52);
    expect(b.sampleSize).toBe(10);
  });

  it("caps the window at 30 days", () => {
    expect(computeBaselines(readings(45)).sampleSize).toBe(30);
  });

  it("ignores invalid (zero) samples", () => {
    const mixed: DailyReading[] = [...readings(8, 60, 54), { dateISO: "2026-06-20", hrvMs: 0, rhrBpm: 0 }];
    expect(computeBaselines(mixed).sampleSize).toBe(8);
  });
});

describe("readinessFromSelfReport", () => {
  it("never fabricates HRV/RHR and marks the source", () => {
    const r = readinessFromSelfReport({ sleepHours: 8, subjectiveReadiness: 4, soreness: 2 });
    expect(r.source).toBe("self");
    expect(r.hrvMs).toBe(0);
    expect(r.rhrBpm).toBe(0);
  });

  it("scores a good night higher than a bad one", () => {
    const good = readinessFromSelfReport({ sleepHours: 8.5, subjectiveReadiness: 5, soreness: 1 });
    const bad = readinessFromSelfReport({ sleepHours: 4.5, subjectiveReadiness: 1, soreness: 5 });
    expect(good.recovery).toBeGreaterThan(bad.recovery);
    expect(good.recovery).toBeGreaterThan(75);
    expect(bad.recovery).toBeLessThan(30);
  });

  it("penalizes soreness", () => {
    const fresh = readinessFromSelfReport({ sleepHours: 7, subjectiveReadiness: 3, soreness: 1 });
    const sore = readinessFromSelfReport({ sleepHours: 7, subjectiveReadiness: 3, soreness: 5 });
    expect(fresh.recovery).toBeGreaterThan(sore.recovery);
  });
});

describe("MockWearableProvider fixtures", () => {
  it("is deterministic per calendar day", () => {
    const d = new Date("2026-07-15T09:00:00Z");
    expect(mockReadingForDate(d)).toEqual(mockReadingForDate(new Date("2026-07-15T20:00:00Z")));
  });

  it("produces in-range, self-consistent values", () => {
    const r = mockReadingForDate(new Date("2026-07-15T09:00:00Z"));
    expect(r.recovery).toBeGreaterThanOrEqual(28);
    expect(r.recovery).toBeLessThanOrEqual(92);
    expect(r.source).toBe("mock");
    expect(r.hrvMs).toBeGreaterThan(0);
  });
});
