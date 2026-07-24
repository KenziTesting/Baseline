import { describe, expect, it } from "vitest";
import { matchShoes, type ShoeQuiz } from "./match";
import { SHOE_CATALOG } from "./catalog";

const base: ShoeQuiz = {
  footWidth: "standard", playerWeight: "mid", playstyle: "all_around",
  injuries: [], surface: "indoor", cutPref: "any", budget: "any", brandPref: null,
};

describe("shoe matching", () => {
  it("returns 5 matches with reasons, a tradeoff, and an also-try", () => {
    const res = matchShoes(base);
    expect(res).toHaveLength(5);
    for (const m of res) {
      expect(m.reasons.length).toBeGreaterThan(0);
      expect(m.tradeoff.length).toBeGreaterThan(0);
    }
  });

  it("puts a heavy explosive player in high-impact shoes", () => {
    const res = matchShoes({ ...base, playerWeight: "heavy", playstyle: "explosive_slasher" });
    expect(res[0]!.shoe.impactProtection).toBeGreaterThanOrEqual(8);
  });

  it("puts a light shifty guard in high-court-feel shoes", () => {
    const res = matchShoes({ ...base, playerWeight: "light", playstyle: "shifty_guard" });
    expect(res[0]!.shoe.courtFeel).toBeGreaterThanOrEqual(8);
  });

  it("prioritizes outdoor durability for blacktop", () => {
    const res = matchShoes({ ...base, surface: "outdoor" });
    expect(res[0]!.shoe.outdoorDurability).toBeGreaterThanOrEqual(7);
  });

  it("surfaces the ankle high-top myth note when ankle injuries are flagged", () => {
    const res = matchShoes({ ...base, injuries: ["ankle"] });
    expect(res.some((m) => m.reasons.some((r) => /high-tops/i.test(r)))).toBe(true);
  });

  it("respects a budget cap (no premium-only recommendations)", () => {
    const res = matchShoes({ ...base, budget: "$" });
    expect(res[0]!.shoe.priceBand).toBe("$");
  });

  it("catalog has a lastUpdated date and covers many brands", () => {
    expect(SHOE_CATALOG.lastUpdated).toBeTruthy();
    expect(new Set(SHOE_CATALOG.shoes.map((s) => s.brand)).size).toBeGreaterThanOrEqual(8);
  });
});
