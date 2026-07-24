import { describe, expect, it } from "vitest";
import { computeDNAVector } from "./fromProfile";
import { DIMENSION_KEYS } from "./dimensions";
import type { PlayerProfile } from "../profile/types";

function baseProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    displayName: "Test Player",
    age: 20,
    trainingAge: 3,
    level: "d1",
    positions: ["pg"],
    anthropometrics: { heightIn: 74, weightLb: 190, wingspanIn: 78 },
    skillRatings: {},
    style: {
      pacePreference: 60,
      shotLocation: 60,
      onOffBall: 70,
      isoVsSystem: 45,
      physicalityTolerance: 55,
    },
    ...overrides,
  };
}

describe("computeDNAVector", () => {
  it("is deterministic — same input, same output", () => {
    const p = baseProfile();
    expect(computeDNAVector(p).vector).toEqual(computeDNAVector(p).vector);
  });

  it("produces a full vector with every dimension in range", () => {
    const { vector } = computeDNAVector(baseProfile());
    expect(Object.keys(vector).sort()).toEqual([...DIMENSION_KEYS].sort());
    for (const k of DIMENSION_KEYS) {
      expect(vector[k]).toBeGreaterThanOrEqual(0);
      expect(vector[k]).toBeLessThanOrEqual(100);
    }
  });

  it("maps taller-for-position to a higher height percentile", () => {
    const short = computeDNAVector(baseProfile({ anthropometrics: { heightIn: 70, weightLb: 175, wingspanIn: 73 } }));
    const tall = computeDNAVector(baseProfile({ anthropometrics: { heightIn: 80, weightLb: 175, wingspanIn: 83 } }));
    expect(tall.vector.height_percentile).toBeGreaterThan(short.vector.height_percentile);
  });

  it("anchors unrated skills to the level baseline (middle school < pro)", () => {
    const youth = computeDNAVector(baseProfile({ level: "middle_school" }));
    const pro = computeDNAVector(baseProfile({ level: "pro" }));
    expect(pro.vector.catch_and_shoot).toBeGreaterThan(youth.vector.catch_and_shoot);
  });

  it("lets a high self-rating raise a skill above baseline", () => {
    const rated = computeDNAVector(baseProfile({ skillRatings: { catch_and_shoot: 5 } }));
    const unrated = computeDNAVector(baseProfile());
    expect(rated.vector.catch_and_shoot).toBeGreaterThan(unrated.vector.catch_and_shoot);
  });

  it("passes style answers straight through", () => {
    const { vector } = computeDNAVector(baseProfile({ style: { pacePreference: 88, shotLocation: 20, onOffBall: 90, isoVsSystem: 30, physicalityTolerance: 77 } }));
    expect(vector.pace_preference).toBe(88);
    expect(vector.shot_location).toBe(20);
    expect(vector.physicality_tolerance).toBe(77);
  });

  it("notes when standing reach and vertical are estimated", () => {
    const { notes } = computeDNAVector(baseProfile());
    expect(notes.join(" ")).toMatch(/reach/i);
    expect(notes.join(" ")).toMatch(/vertical/i);
  });

  it("estimates wingspan (ape index 0) and notes it when not provided", () => {
    const { vector, notes } = computeDNAVector(
      baseProfile({ anthropometrics: { heightIn: 74, weightLb: 190 } }),
    );
    expect(notes.join(" ")).toMatch(/wingspan/i);
    expect(vector.wingspan_ratio).toBeGreaterThan(0);
  });

  it("blends the height norm across multiple positions", () => {
    const measure = { heightIn: 78, weightLb: 200, wingspanIn: 80 };
    const pg = computeDNAVector(baseProfile({ positions: ["pg"], anthropometrics: measure }));
    const sf = computeDNAVector(baseProfile({ positions: ["sf"], anthropometrics: measure }));
    const combo = computeDNAVector(baseProfile({ positions: ["pg", "sf"], anthropometrics: measure }));
    // A PG/SF combo's height percentile sits between the pure-PG and pure-SF reads.
    expect(combo.vector.height_percentile).toBeLessThan(pg.vector.height_percentile);
    expect(combo.vector.height_percentile).toBeGreaterThan(sf.vector.height_percentile);
  });
});
