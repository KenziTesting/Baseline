import { describe, expect, it } from "vitest";
import { generateSession, type GenerateInput } from "./generateSession";
import { autoregulate, zoneFor, type Readiness } from "./readiness";
import { ALL_EQUIPMENT } from "./types";
import { ARCHETYPES_BY_ID } from "../archetypes/library";

function readiness(recovery: number): Readiness {
  return {
    recovery,
    sleepHours: recovery > 60 ? 8 : 5.2,
    hrvMs: recovery > 60 ? 68 : 48,
    hrvBaselineMs: 62,
    rhrBpm: recovery > 60 ? 52 : 60,
    rhrBaselineBpm: 54,
    dayStrain: 8,
    source: "mock",
  };
}

function baseInput(overrides: Partial<GenerateInput> = {}): GenerateInput {
  return {
    focus: "lower_power",
    tier: "advanced",
    gapDimensions: ["vertical_explosiveness", "catch_and_shoot"],
    emphasis: ARCHETYPES_BY_ID["movement-shooter"]!.trainingEmphasis,
    availableEquipment: ALL_EQUIPMENT,
    phase: "offseason",
    readiness: readiness(80),
    injuryRegions: [],
    youth: false,
    ...overrides,
  };
}

describe("zoneFor / autoregulate", () => {
  it("maps recovery to the right zone", () => {
    expect(zoneFor(80)).toBe("green");
    expect(zoneFor(50)).toBe("yellow");
    expect(zoneFor(20)).toBe("red");
  });

  it("green allows PR and plyo at full volume", () => {
    const a = autoregulate(readiness(80));
    expect(a.allowPR).toBe(true);
    expect(a.allowPlyo).toBe(true);
    expect(a.volumeMultiplier).toBe(1);
  });

  it("yellow trims volume and blocks PR but keeps skill", () => {
    const a = autoregulate(readiness(50));
    expect(a.allowPR).toBe(false);
    expect(a.skillOnly).toBe(false);
    expect(a.volumeMultiplier).toBeLessThan(1);
  });

  it("red is skill-only and surfaces reasons", () => {
    const a = autoregulate(readiness(20));
    expect(a.skillOnly).toBe(true);
    expect(a.allowPlyo).toBe(false);
    expect(a.reasons.length).toBeGreaterThan(0);
  });
});

describe("generateSession", () => {
  it("is deterministic — same inputs, same session", () => {
    const a = generateSession(baseInput());
    const b = generateSession(baseInput());
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it("builds a lower-power session with blocks and an estimate on a green day", () => {
    const s = generateSession(baseInput());
    expect(s.focus).toBe("lower_power");
    expect(s.blocks.length).toBeGreaterThan(0);
    expect(s.estimatedMinutes).toBeGreaterThan(0);
    expect(s.blocks.some((b) => b.drills.length > 0)).toBe(true);
  });

  it("downgrades a gym day to recovery/skill work on a red day", () => {
    const s = generateSession(baseInput({ readiness: readiness(20) }));
    expect(s.downgradedFrom).toBe("lower_power");
    expect(s.focus).toBe("recovery");
    // No strength/power/plyo drills survive the downgrade.
    const cats = s.blocks.flatMap((b) => b.drills.map((d) => d.drill.category));
    expect(cats).not.toContain("lower_strength");
    expect(cats).not.toContain("power_plyo");
  });

  it("forbids high-CNS plyo in-season but still programs plyo off-season", () => {
    const off = generateSession(baseInput({ phase: "offseason" }));
    const inseason = generateSession(baseInput({ phase: "inseason", readiness: readiness(80) }));
    const plyos = (s: ReturnType<typeof generateSession>) =>
      s.blocks.flatMap((b) => b.drills).filter((d) => d.drill.category === "power_plyo");
    // Off-season programs plyometrics; in-season never allows the high-CNS ones.
    expect(plyos(off).length).toBeGreaterThan(0);
    expect(plyos(inseason).every((d) => d.drill.cnsLoad !== "high")).toBe(true);
  });

  it("routes around an injured region", () => {
    const s = generateSession(baseInput({ injuryRegions: ["knee"] }));
    const loadsKnee = s.blocks
      .flatMap((b) => b.drills)
      .some((d) => d.drill.regions.includes("knee"));
    expect(loadsKnee).toBe(false);
  });

  it("respects available equipment (home setup drops court drills)", () => {
    const s = generateSession(baseInput({ focus: "court_skill", availableEquipment: ["none", "ball", "hoop"] }));
    for (const p of s.blocks.flatMap((b) => b.drills)) {
      for (const eq of p.drill.equipment) {
        expect(["none", "ball", "hoop"]).toContain(eq);
      }
    }
  });

  it("cuts volume on a yellow day vs a green day", () => {
    const green = generateSession(baseInput({ readiness: readiness(80) }));
    const yellow = generateSession(baseInput({ readiness: readiness(50) }));
    const totalSets = (s: ReturnType<typeof generateSession>) =>
      s.blocks.flatMap((b) => b.drills).reduce((n, d) => n + d.sets, 0);
    expect(totalSets(yellow)).toBeLessThanOrEqual(totalSets(green));
  });
});
