/**
 * Seed the `archetypes` table from the code library (the source of truth).
 *
 * Run with:  npx tsx scripts/seed-archetypes.ts
 * Requires:  NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env
 *            (service role bypasses RLS to upsert reference data).
 *
 * Idempotent: upserts by id, so re-running syncs any library edits.
 */

import { createClient } from "@supabase/supabase-js";
import { ARCHETYPES } from "../src/lib/core/archetypes/library";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.",
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const rows = ARCHETYPES.map((a) => ({
    id: a.id,
    name: a.name,
    blurb: a.blurb,
    nba_reference: a.nbaReference,
    college_reference: a.collegeReference,
    build_range: a.buildRange,
    dna: a.dna,
    defining_skills: a.definingSkills,
    common_weaknesses: a.commonWeaknesses,
    training_emphasis: a.trainingEmphasis,
    developmental: a.developmental ?? false,
    is_seed: true,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("archetypes").upsert(rows, { onConflict: "id" });
  if (error) throw error;

  console.log(`Seeded ${rows.length} archetypes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
