/**
 * Shoe catalog data sourcing + the admin refresh path (spec 5.3).
 *
 * The seeded catalog carries OUR editorial ratings. For keeping it current — and
 * for "popular now," which must come from a live source, never model memory — the
 * intended path is a periodic ingest from a reputable review site. We cite The
 * Hoops Geek (400+ reviewed models with overall scores) as the reference source
 * to verify current specs/prices against and as the future ingest target.
 *
 * We do NOT copy their scores into our catalog (that's their work) — the ingest
 * would map their model list to ours and surface a "verify at source" link plus a
 * "catalog last updated" date. Until that job runs, this is a documented stub.
 */

import type { ShoeCatalog } from "./types";
import { SHOE_CATALOG } from "./catalog";

export const SHOE_DATA_SOURCE = {
  name: "The Hoops Geek",
  url: "https://www.thehoopsgeek.com/",
  note: "Reference reviews & overall scores (400+ models). Verify current price and specs here.",
} as const;

/**
 * Admin/scheduled refresh path. A real implementation reconciles our catalog with
 * the review site's current model list + retail prices and stamps `lastUpdated`.
 * Never fabricate — if a model isn't found, it's flagged for manual curation.
 */
export interface ShoeIngestResult {
  matched: number;
  flaggedForCuration: string[];
  lastUpdated: string;
}

export async function refreshCatalogFromReviewSite(): Promise<ShoeIngestResult> {
  // TODO(admin): fetch the review-site index, reconcile model names + prices,
  // stamp lastUpdated. Requires a signed-off ingestion agreement with the source.
  return { matched: 0, flaggedForCuration: SHOE_CATALOG.shoes.map((s) => s.id), lastUpdated: SHOE_CATALOG.lastUpdated };
}

export function catalogWithSource(): { catalog: ShoeCatalog; source: typeof SHOE_DATA_SOURCE } {
  return { catalog: SHOE_CATALOG, source: SHOE_DATA_SOURCE };
}
