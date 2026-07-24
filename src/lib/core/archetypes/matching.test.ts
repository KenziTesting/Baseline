import { describe, expect, it } from "vitest";
import { ARCHETYPES, ARCHETYPES_BY_ID } from "./library";
import { matchArchetypes, scoreArchetypeById } from "./matching";
import { computeGapReport } from "./gapReport";
import { DIMENSION_KEYS } from "../dna/dimensions";
import type { DNAVector } from "../dna/vector";

describe("archetype library integrity", () => {
  it("has at least 30 archetypes (spec requirement)", () => {
    expect(ARCHETYPES.length).toBeGreaterThanOrEqual(30);
  });

  it("every archetype has a full DNA vector and 5 defining/weakness skills", () => {
    for (const a of ARCHETYPES) {
      expect(Object.keys(a.dna).sort()).toEqual([...DIMENSION_KEYS].sort());
      expect(a.definingSkills).toHaveLength(5);
      expect(a.commonWeaknesses).toHaveLength(5);
    }
  });

  it("has unique ids", () => {
    const ids = ARCHETYPES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("matchArchetypes", () => {
  it("returns top 3 plus separate build and game comps", () => {
    // A player who IS the Curry archetype should match it as #1 game comp.
    const curry = ARCHETYPES_BY_ID["movement-shooter"]!;
    const result = matchArchetypes(curry.dna);
    expect(result.top).toHaveLength(3);
    expect(result.bestGameComp.archetype.id).toBe("movement-shooter");
    expect(result.top[0]!.overall).toBeGreaterThan(result.top[2]!.overall - 0.001);
  });

  it("down-weights an implausible build but does not block it (game > build)", () => {
    // Take Curry's GAME profile but a center's BUILD. Game comp should still be
    // high; overall is reduced (not zeroed) by the implausible frame.
    const curry = ARCHETYPES_BY_ID["movement-shooter"]!;
    const bigMan = ARCHETYPES_BY_ID["rim-running-lob-threat"]!;
    const hybrid = { ...curry.dna } as DNAVector;
    // overwrite physical dims with the big man's frame
    for (const key of ["height_percentile", "wingspan_ratio", "standing_reach"] as const) {
      hybrid[key] = bigMan.dna[key];
    }
    const match = scoreArchetypeById(hybrid, "movement-shooter");
    expect(match.gameComp).toBeGreaterThan(85);
    expect(match.overall).toBeGreaterThan(0); // not blocked
    expect(match.overall).toBeLessThan(match.gameComp); // but down-weighted
  });

  it("ranks by overall descending", () => {
    const result = matchArchetypes(ARCHETYPES_BY_ID["pnr-floor-general"]!.dna);
    expect(result.top[0]!.overall).toBeGreaterThanOrEqual(result.top[1]!.overall);
    expect(result.top[1]!.overall).toBeGreaterThanOrEqual(result.top[2]!.overall);
  });
});

describe("computeGapReport", () => {
  it("returns the largest positive trainable deltas, no fixed/style dims", () => {
    // A weak-everywhere user vs the Curry archetype → gaps should be shooting-led.
    const weak = Object.fromEntries(DIMENSION_KEYS.map((k) => [k, 20])) as DNAVector;
    const curry = ARCHETYPES_BY_ID["movement-shooter"]!;
    const report = computeGapReport(weak, curry, 5);
    expect(report.gaps).toHaveLength(5);
    // All deltas positive and sorted descending by weighted rank.
    for (const g of report.gaps) expect(g.delta).toBeGreaterThan(0);
    // A defining skill (movement_shooting, huge delta) must be present.
    expect(report.gaps.some((g) => g.dimension === "movement_shooting")).toBe(true);
    // Fixed physical dim (height) must never appear as a gap.
    expect(report.gaps.some((g) => g.dimension === "height_percentile")).toBe(false);
    // Style dim must never appear.
    expect(report.gaps.some((g) => g.dimension === "pace_preference")).toBe(false);
  });

  it("returns no gaps when the user already exceeds the archetype", () => {
    const elite = Object.fromEntries(DIMENSION_KEYS.map((k) => [k, 100])) as DNAVector;
    const report = computeGapReport(elite, ARCHETYPES_BY_ID["pnr-floor-general"]!, 5);
    expect(report.gaps).toHaveLength(0);
  });
});
