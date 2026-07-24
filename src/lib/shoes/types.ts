/**
 * Shoe Finder types (v1 spec Part 5).
 *
 * HONESTY (spec Part 8 "never fabricate a shoe, a spec, or a price"): the numeric
 * fields here are EDITORIAL 1–10 ratings (opinion), not fabricated hard specs, and
 * price is a BAND, not a precise current price. The catalog carries a
 * `lastUpdated` date and the UI labels the ratings as editorial + tells the user
 * to verify current retail. "Popular now" requires a live source and is NOT
 * hardcoded here (spec 5.3).
 */

export type Brand =
  | "Nike" | "Jordan" | "adidas" | "Under Armour" | "Puma" | "New Balance"
  | "Anta" | "Li-Ning" | "361°" | "Way of Wade" | "Reebok" | "Converse";

export type Cut = "low" | "mid" | "high";
export type WeightClass = "light" | "standard" | "heavy";
export type FitNote = "narrow" | "true" | "wide";
export type PriceBand = "$" | "$$" | "$$$";

export type Playstyle =
  | "explosive_slasher" | "shifty_guard" | "movement_shooter" | "wing_defender" | "post_big" | "all_around";

export const PLAYSTYLE_LABELS: Record<Playstyle, string> = {
  explosive_slasher: "Explosive slasher",
  shifty_guard: "Shifty guard",
  movement_shooter: "Movement shooter",
  wing_defender: "Wing defender",
  post_big: "Post big",
  all_around: "All-around",
};

export interface Shoe {
  id: string;
  name: string;
  brand: Brand;
  line?: string;
  /** Approximate — labeled as such; verify. */
  releaseYear: number;
  cut: Cut;
  weightClass: WeightClass;
  /** Editorial 1–10 ratings. */
  impactProtection: number; // cushioning / joint protection
  courtFeel: number; // low-profile responsiveness
  traction: number;
  outdoorDurability: number; // hard rubber / blacktop
  support: number; // lateral containment / heel stability
  fit: FitNote;
  bestFor: Playstyle[];
  worstFor: string[];
  priceBand: PriceBand;
  /** List-price band, e.g. "$110–140". Verify current retail. */
  approxMSRP: string;
  similarTo: string[];
  cushioningSystem?: string;
}

export interface ShoeCatalog {
  lastUpdated: string; // ISO date — shown in the UI
  shoes: Shoe[];
}

/** Provider interface (spec 5.3) — swap the curated JSON for a live/admin source. */
export interface ShoeCatalogProvider {
  readonly id: string;
  getCatalog(): ShoeCatalog;
}
