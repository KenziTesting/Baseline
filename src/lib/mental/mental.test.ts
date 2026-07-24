import { describe, expect, it } from "vitest";
import { QUOTES, WEEK_ARC, getWeek } from "./content";
import { MSI_ITEMS, MSI_DIMENSIONS, pressureGap, scoreMSI, intentionCompletionRate, focusSleepInsight } from "./metrics";
import { generateSundayReport } from "./report";

describe("content integrity (spec hard rules)", () => {
  it("every quote has a non-empty source (no fabricated/unsourced quotes)", () => {
    for (const q of QUOTES) {
      expect(q.source, q.id).toBeTruthy();
      expect(q.source.trim().length).toBeGreaterThan(0);
    }
  });

  it("no copy promotes sleep deprivation (blocked per Mamba guidance)", () => {
    const banned = [/\b4\s*am\b/i, /\bno days off\b/i, /sleep is for the weak/i, /sleep when you'?re dead/i];
    const allCopy = WEEK_ARC.flatMap((w) => w.days.flatMap((d) => [...d.body, d.title, ...(d.prompts ?? []).map((p) => p.label)]));
    for (const line of [...allCopy, ...QUOTES.map((q) => q.text)]) {
      for (const re of banned) expect(re.test(line), `banned phrase in: ${line}`).toBe(false);
    }
  });

  it("Week 3 is fully authored with all 7 blocks and Saturday goes silent", () => {
    const w = getWeek(3)!;
    expect(w.days).toHaveLength(7);
    const sat = w.days.find((d) => d.kind === "compete")!;
    expect(sat.minutes).toBeNull();
    expect(sat.compete).toBeTruthy();
  });
});

describe("mental skills inventory", () => {
  it("has 20 items, 4 per dimension", () => {
    expect(MSI_ITEMS).toHaveLength(20);
    for (const dim of MSI_DIMENSIONS) expect(MSI_ITEMS.filter((i) => i.dimension === dim)).toHaveLength(4);
  });
  it("scores answers into 0-100 per dimension", () => {
    const perfect = Object.fromEntries(MSI_ITEMS.map((i) => [i.id, 5]));
    const res = scoreMSI(perfect, "2026-07-24");
    for (const dim of MSI_DIMENSIONS) expect(res.scores[dim]).toBe(100);
  });
});

describe("metrics", () => {
  it("computes the pressure gap (the mental metric)", () => {
    const g = pressureGap({ dateISO: "2026-07-01", unpressuredMakes: 9, unpressuredAttempts: 10, pressuredMakes: 6, pressuredAttempts: 10 });
    expect(g.unpressured).toBe(90);
    expect(g.pressured).toBe(60);
    expect(g.gap).toBe(30);
  });
  it("intention completion rate", () => {
    expect(intentionCompletionRate([3, 3, 2, 0])).toBe(Math.round((8 / 12) * 100));
    expect(intentionCompletionRate([])).toBeNull();
  });
  it("focus-vs-sleep insight from the athlete's own data", () => {
    const insight = focusSleepInsight([
      { dateISO: "1", rating: 3, sleepHours: 5 }, { dateISO: "2", rating: 3, sleepHours: 5.5 },
      { dateISO: "3", rating: 4, sleepHours: 8 }, { dateISO: "4", rating: 5, sleepHours: 7.5 },
    ]);
    expect(insight).not.toBeNull();
    expect(insight!.delta).toBeGreaterThan(0);
  });
});

describe("Sunday Report generator (traceable + honest)", () => {
  it("celebrates the 85% win and calls out a missed day, with traceable values", () => {
    const r = generateSundayReport({
      weekName: "QUIET HANDS", nextTeaser: "THE WEIGHT ROOM IS A LIE",
      blocksCompleted: 6, blocksTotal: 7, missedTitles: ["The Mirror"],
      eightyFive: { at85Makes: 12, at100Makes: 9 },
      tensionThis: 3.1, tensionPrior: 4.2,
      pressureGapThis: 12, pressureGapPrior: 18, intentionGrade: 2,
    });
    const win = r.lines.find((l) => l.metric === "85%_vs_100%_makes")!;
    expect(win.kind).toBe("win");
    expect(win.value).toBe(3);
    expect(r.lines.some((l) => l.metric === "missed_days" && l.kind === "honest")).toBe(true);
    expect(r.lines.some((l) => l.metric === "tension_shoulders" && l.kind === "win")).toBe(true);
    expect(r.nextTeaser).toBe("THE WEIGHT ROOM IS A LIE");
  });

  it("tells the truth when a metric hasn't moved", () => {
    const r = generateSundayReport({
      weekName: "W", nextTeaser: "N", blocksCompleted: 7, blocksTotal: 7, missedTitles: [],
      tensionThis: 3.1, tensionPrior: 3.1,
    });
    const t = r.lines.find((l) => l.metric === "tension_shoulders")!;
    expect(t.kind).toBe("honest");
    expect(t.text).toMatch(/hasn't moved/i);
  });

  it("never emits a line for a metric with no logged value", () => {
    const r = generateSundayReport({ weekName: "W", nextTeaser: "N", blocksCompleted: 0, blocksTotal: 7, missedTitles: [] });
    expect(r.lines.some((l) => l.metric === "pressure_ft_gap")).toBe(false);
    expect(r.lines.some((l) => l.metric === "85%_vs_100%_makes")).toBe(false);
  });
});
