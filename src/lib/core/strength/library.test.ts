import { describe, expect, it } from "vitest";
import { STRENGTH_EXERCISES } from "./library";
import { isMuscleId } from "./muscles";

describe("advanced drill library integrity (spec B.1 hard requirement)", () => {
  it("seeds all 17 mandated exercises", () => {
    expect(STRENGTH_EXERCISES.length).toBe(17);
  });

  it("every muscleContributions sums to 1.0 (±0.01) — a typo here corrupts the fatigue map", () => {
    for (const ex of STRENGTH_EXERCISES) {
      const sum = Object.values(ex.muscleContributions).reduce((s, v) => s + v, 0);
      expect(sum, `${ex.id} contributions sum`).toBeCloseTo(1.0, 2);
    }
  });

  it("every muscleContributions key is a valid MuscleId", () => {
    for (const ex of STRENGTH_EXERCISES) {
      for (const key of Object.keys(ex.muscleContributions)) {
        expect(isMuscleId(key), `${ex.id} has unknown muscle '${key}'`).toBe(true);
      }
    }
  });

  it("has unique ids and non-empty required prose fields", () => {
    const ids = STRENGTH_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ex of STRENGTH_EXERCISES) {
      expect(ex.setup.length).toBeGreaterThan(0);
      expect(ex.execution.length).toBeGreaterThan(0);
      expect(ex.cues.length).toBeGreaterThanOrEqual(1);
      expect(ex.cues.length).toBeLessThanOrEqual(4); // "cues stop working past four"
      expect(ex.prescription.length).toBeGreaterThan(0);
    }
  });

  it("ground-contact jumps are flagged for plyo-contact counting", () => {
    const groundContact = ["trap-bar-jump", "skater-bound-stick", "depth-drop-rebound-jump"];
    for (const id of groundContact) {
      expect(STRENGTH_EXERCISES.find((e) => e.id === id)?.countsPlyoContacts, id).toBe(true);
    }
    // A rotational "plyometric" (med-ball toss) is not a ground contact and must NOT count.
    expect(STRENGTH_EXERCISES.find((e) => e.id === "med-ball-rotational-scoop-toss")?.countsPlyoContacts).toBeUndefined();
  });
});
