import { describe, expect, it } from "vitest";
import { e1rmSeries, personalRecords, movingAverage, loggedExerciseIds } from "./strength";
import { weeklyVolumeByMuscle, posteriorChainBalance, plyoContactsPerWeek } from "./volume";
import { aggregateZones } from "./shooting";
import { bodyweightMA } from "./body";
import { trendCaption } from "./captions";
import { toCSV } from "./export";
import { buildDemoHistory } from "@/lib/demo/seed";
import type { LoggedSet } from "@/lib/core";
import type { ShotLog } from "@/lib/progress/types";

const NOW = Date.UTC(2026, 6, 24, 12, 0, 0);
const DAY = 86_400_000;

describe("strength analytics", () => {
  const logs: LoggedSet[] = [
    { exerciseId: "trap-bar-jump", timestamp: NOW - 10 * DAY, groundContacts: 3 }, // no e1RM
    { exerciseId: "barbell-hip-thrust", timestamp: NOW - 7 * DAY, load: 90, reps: 8, rir: 2 },
    { exerciseId: "barbell-hip-thrust", timestamp: NOW - 1 * DAY, load: 100, reps: 8, rir: 2 },
  ];

  it("builds an ascending e1RM series and skips sets without load/reps", () => {
    const s = e1rmSeries(logs, "barbell-hip-thrust");
    expect(s).toHaveLength(2);
    expect(s[1]!.value).toBeGreaterThan(s[0]!.value);
  });

  it("detects a new all-time PR on the most recent session", () => {
    const pr = personalRecords(logs, "barbell-hip-thrust", NOW);
    expect(pr.isNewAllTime).toBe(true);
    expect(pr.allTime?.load).toBe(100);
    expect(pr.d30).not.toBeNull();
  });

  it("is safe with empty and single-point data", () => {
    expect(e1rmSeries([], "x")).toEqual([]);
    expect(personalRecords([], "x", NOW).allTime).toBeNull();
    expect(movingAverage([{ dateISO: "2026-01-01", value: 5 }], 7)).toEqual([{ dateISO: "2026-01-01", value: 5 }]);
  });

  it("lists logged exercise ids by frequency", () => {
    expect(loggedExerciseIds(logs)).toContain("barbell-hip-thrust");
  });
});

describe("volume analytics", () => {
  it("attributes muscle volume via contributions and surfaces posterior:quad balance", () => {
    const { strengthLogs } = buildDemoHistory(NOW);
    const byMuscle = weeklyVolumeByMuscle(strengthLogs, NOW, 4);
    expect((byMuscle.glute_max ?? 0)).toBeGreaterThan(0);
    expect((byMuscle.hamstring ?? 0)).toBeGreaterThan(0);
    const bal = posteriorChainBalance(strengthLogs, NOW);
    expect(bal.ratio).toBeGreaterThan(0);
    expect(bal.message).toMatch(/posterior chain/i);
  });

  it("counts plyo contacts per week separately", () => {
    const { strengthLogs } = buildDemoHistory(NOW);
    const contacts = plyoContactsPerWeek(strengthLogs, NOW, 6);
    expect(contacts.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
});

describe("shooting analytics", () => {
  it("aggregates makes/attempts (not percentages) and computes zone + overall pct", () => {
    const logs: ShotLog[] = [
      { dateISO: "2026-07-01", zone: "corner3_l", makes: 4, attempts: 10 },
      { dateISO: "2026-07-08", zone: "corner3_l", makes: 6, attempts: 10 },
    ];
    const { byZone, overall } = aggregateZones(logs);
    expect(byZone.corner3_l!.makes).toBe(10);
    expect(byZone.corner3_l!.attempts).toBe(20);
    expect(byZone.corner3_l!.pct).toBeCloseTo(0.5, 3);
    expect(overall.pct).toBeCloseTo(0.5, 3);
  });

  it("returns null pct for a zone with no attempts", () => {
    expect(aggregateZones([]).overall.pct).toBeNull();
  });
});

describe("body + captions + export", () => {
  it("computes a bodyweight moving average", () => {
    const ma = bodyweightMA([
      { dateISO: "2026-07-01", bodyweightKg: 90 },
      { dateISO: "2026-07-02", bodyweightKg: 88 },
    ]);
    expect(ma[1]!.value).toBeCloseTo(89, 3);
  });

  it("generates a data-driven caption", () => {
    const cap = trendCaption([{ dateISO: "2026-04-02", value: 100 }, { dateISO: "2026-07-01", value: 112.5 }], "Trap-Bar Deadlift", "kg");
    expect(cap).toBe("Up 12.5 kg on Trap-Bar Deadlift since Apr 2.");
  });

  it("serializes CSV with escaping", () => {
    const csv = toCSV(["a", "b"], [[1, 'x,y']]);
    expect(csv).toBe('a,b\n1,"x,y"');
  });
});
