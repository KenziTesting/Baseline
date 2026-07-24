/**
 * Shoe matching (spec 5.3). Weighted scoring → top 5 with the WHY and the
 * tradeoff, a budget alternative, and an "also try". Pure. Heavier/explosive
 * players weight impact protection + support; lighter/quicker guards weight court
 * feel; outdoor weights hard rubber; post players weight containment.
 */

import { SHOE_CATALOG } from "./catalog";
import type { Playstyle, PriceBand, Shoe } from "./types";

export interface ShoeQuiz {
  footWidth: "narrow" | "standard" | "wide" | "xwide";
  playerWeight: "light" | "mid" | "heavy";
  playstyle: Playstyle;
  injuries: ("ankle" | "knee" | "plantar")[];
  surface: "indoor" | "outdoor" | "both";
  cutPref: "low" | "mid" | "high" | "any";
  budget: PriceBand | "any";
  brandPref?: Shoe["brand"] | null;
}

export interface ShoeMatch {
  shoe: Shoe;
  score: number;
  reasons: string[];
  tradeoff: string;
  budgetAlt?: Shoe;
  alsoTry: Shoe[];
}

const BAND_RANK: Record<PriceBand, number> = { $: 1, $$: 2, $$$: 3 };

function scoreShoe(shoe: Shoe, q: ShoeQuiz): { score: number; reasons: string[] } {
  let score = 40;
  const reasons: string[] = [];

  if (shoe.bestFor.includes(q.playstyle)) { score += 22; reasons.push(`Built for your game (${q.playstyle.replace(/_/g, " ")}).`); }

  if (q.playerWeight === "heavy") {
    score += (shoe.impactProtection - 5) * 3 + (shoe.support - 5) * 2;
    if (shoe.impactProtection >= 8) reasons.push("Serious impact protection for a heavier frame.");
  } else if (q.playerWeight === "light") {
    score += (shoe.courtFeel - 5) * 3 + (shoe.weightClass === "light" ? 6 : shoe.weightClass === "heavy" ? -6 : 0);
    if (shoe.courtFeel >= 8) reasons.push("Low-profile court feel for a quick, light player.");
  } else {
    score += (shoe.impactProtection - 5) + (shoe.courtFeel - 5);
  }

  if (q.surface !== "indoor") {
    score += (shoe.outdoorDurability - 5) * 3;
    if (shoe.outdoorDurability >= 7) reasons.push("Hard-rubber outsole holds up outdoors.");
    else if (shoe.outdoorDurability <= 5) score -= 6;
  }

  if (q.injuries.includes("ankle")) {
    score += (shoe.support - 5) * 2;
    reasons.push("Ankle history → prioritized fit + lateral support (research doesn't show high-tops prevent sprains; fit and ankle strength matter more).");
  }
  if (q.injuries.includes("knee")) { score += (shoe.impactProtection - 5) * 2.5; if (shoe.impactProtection >= 8) reasons.push("Extra cushion to spare the knees on landings."); }
  if (q.injuries.includes("plantar")) { score += (shoe.impactProtection - 5) + (shoe.support - 5); reasons.push("Cushion + support for plantar comfort."); }

  // Fit width
  if (q.footWidth === "narrow" && shoe.fit === "narrow") { score += 8; reasons.push("Runs narrow — matches a narrow foot."); }
  else if ((q.footWidth === "wide" || q.footWidth === "xwide") && shoe.fit === "wide") { score += 8; reasons.push("Runs wide — good for a wider foot."); }
  else if (q.footWidth === "narrow" && shoe.fit === "wide") score -= 8;
  else if ((q.footWidth === "wide" || q.footWidth === "xwide") && shoe.fit === "narrow") score -= 10;

  if (q.cutPref !== "any" && shoe.cut === q.cutPref) { score += 5; }
  if (q.brandPref && shoe.brand === q.brandPref) { score += 8; reasons.push(`Your preferred brand (${shoe.brand}).`); }

  // Budget: exclude above band; reward at/under.
  if (q.budget !== "any") {
    if (BAND_RANK[shoe.priceBand] > BAND_RANK[q.budget]) score -= 40;
    else score += 6;
  }

  return { score: Math.round(score), reasons: reasons.slice(0, 3) };
}

function tradeoffFor(shoe: Shoe, q: ShoeQuiz): string {
  if (shoe.worstFor.length) return shoe.worstFor[0]!;
  if (q.surface !== "indoor" && shoe.outdoorDurability <= 5) return "Softer outsole wears faster outdoors.";
  if (q.playerWeight === "heavy" && shoe.impactProtection <= 6) return "On the firmer side for a heavier player.";
  return "A specialist pick — great at its job, less versatile.";
}

export function matchShoes(q: ShoeQuiz): ShoeMatch[] {
  const scored = SHOE_CATALOG.shoes
    .map((shoe) => ({ shoe, ...scoreShoe(shoe, q) }))
    .sort((a, b) => b.score - a.score || a.shoe.name.localeCompare(b.shoe.name));

  const byId = new Map(SHOE_CATALOG.shoes.map((s) => [s.id, s]));

  return scored.slice(0, 5).map(({ shoe, score, reasons }) => {
    const alsoTry = shoe.similarTo.map((id) => byId.get(id)).filter((s): s is Shoe => !!s).slice(0, 2);
    // Budget alternative: cheapest similar shoe in a lower/equal band.
    const budgetAlt = [...alsoTry]
      .filter((s) => BAND_RANK[s.priceBand] <= BAND_RANK[shoe.priceBand])
      .sort((a, b) => BAND_RANK[a.priceBand] - BAND_RANK[b.priceBand])[0];
    return {
      shoe,
      score,
      reasons: reasons.length ? reasons : ["Solid all-around fit for your inputs."],
      tradeoff: tradeoffFor(shoe, q),
      budgetAlt: budgetAlt && budgetAlt.id !== shoe.id ? budgetAlt : undefined,
      alsoTry,
    };
  });
}
