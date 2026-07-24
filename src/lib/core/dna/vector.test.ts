import { describe, expect, it } from "vitest";
import {
  clamp01to100,
  cosineSimilarity,
  normalizedDistance,
  patternSimilarity,
  subVector,
  vec,
} from "./vector";
import { DIMENSION_KEYS } from "./dimensions";

describe("clamp01to100", () => {
  it("clamps into [0,100] and handles NaN", () => {
    expect(clamp01to100(-5)).toBe(0);
    expect(clamp01to100(150)).toBe(100);
    expect(clamp01to100(50)).toBe(50);
    expect(clamp01to100(NaN)).toBe(0);
  });
});

describe("vec", () => {
  it("fills every dimension and applies overrides", () => {
    const v = vec({ catch_and_shoot: 90 });
    expect(Object.keys(v).sort()).toEqual([...DIMENSION_KEYS].sort());
    expect(v.catch_and_shoot).toBe(90);
    // unspecified dims default to fill (50)
    expect(v.rim_protection).toBe(50);
  });

  it("clamps override values", () => {
    expect(vec({ catch_and_shoot: 250 }).catch_and_shoot).toBe(100);
  });
});

describe("cosineSimilarity", () => {
  it("is 100 for identical direction", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(100, 5);
  });

  it("is scale-invariant (measures shape, not magnitude)", () => {
    // Same direction, different magnitude → still ~100.
    expect(cosineSimilarity([10, 20, 30], [1, 2, 3])).toBeCloseTo(100, 5);
  });

  it("throws on length mismatch", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow();
  });
});

describe("patternSimilarity", () => {
  it("distinguishes profiles that raw cosine would call identical", () => {
    // A: strong at index 0, weak at 2. B: the opposite. Raw cosine sees them as
    // similar (all positive), but pattern (mean-centered) should see them as opposed.
    const a = [90, 50, 10];
    const b = [10, 50, 90];
    const raw = cosineSimilarity(a, b);
    const pattern = patternSimilarity(a, b);
    expect(pattern).toBeLessThan(raw);
    expect(pattern).toBeLessThan(50);
  });

  it("returns high for matching strength/weakness shape at different levels", () => {
    const eliteShape = [90, 60, 30];
    const beginnerSameShape = [60, 40, 20];
    expect(patternSimilarity(eliteShape, beginnerSameShape)).toBeGreaterThan(90);
  });
});

describe("normalizedDistance", () => {
  it("is 0 for identical and 100 for maximal", () => {
    expect(normalizedDistance([50, 50], [50, 50])).toBe(0);
    expect(normalizedDistance([0, 0], [100, 100])).toBe(100);
  });
});

describe("subVector", () => {
  it("extracts values in key order", () => {
    const v = vec({ catch_and_shoot: 90, rim_protection: 10 });
    expect(subVector(v, ["rim_protection", "catch_and_shoot"])).toEqual([10, 90]);
  });
});
