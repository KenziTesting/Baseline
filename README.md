# Baseline — Basketball Career OS

An adaptive basketball development platform. Baseline turns your build, your game, and your
schedule into a daily training system. **Phase 1** ships the foundation: profile onboarding, the
DNA-vector model, the archetype library, and archetype matching + gap reports.

> Working name. `Baseline` — the court line and your physiological baselines. Rename freely.

## Status (build phases)

| Phase | Scope | State |
|------|-------|-------|
| 1 | Scaffold, schema, DNA vector, archetype library + matching + gap report | ✅ |
| 2 | Drill library, periodization engine, mock wearable, session generator + player, logging | ✅ |
| 3 | Real WHOOP OAuth + data pipeline, 30-day baselines, self-report degrade path, settings | ✅ this build |
| 4 | Calendar sync + scheduling constraint solver | ⏳ next |
| 5 | Progress analytics + charts | ✅ |
| 6 | Shoe Finder | ✅ |
| 7 | Coach chat (Anthropic) | ✅ |
| 8 | Polish, offline/PWA (installable, service worker, offline shell), tests | ✅ offline/PWA; notifications ⏳ |

Expansion modules: DNA/fatigue engine, 2D body map, THE WEEK (mentality + paywall),
F9 soreness calibration + asymmetry — all ✅. 3D fatigue map (F7/F8) pending a
licensed anatomical mesh (see ATTRIBUTIONS.md).

## Stack

- **Next.js 15** (App Router) + **React 19**, TypeScript **strict** (`noUncheckedIndexedAccess` on)
- **Supabase** (Postgres + Auth + Row Level Security) — persistence, multi-tenant-ready
- **Zustand** (persisted to localStorage) for client state; **offline-first** by design
- **Vitest** for the pure core-domain unit tests
- Tailwind for the dark-first, hardwood-amber UI

### Architecture: the deterministic core

All plan-shaping logic is **pure, framework-free, unit-tested TypeScript** in
[`src/lib/core`](src/lib/core) — no React, no I/O, no LLM. This is the reproducibility guarantee
from the spec: the same profile always yields the same DNA vector, the same matches, and the same
gap report. The (future) LLM handles language and explanation only.

```
src/lib/core/
  dna/
    dimensions.ts   # the 30 DNA dimensions — single source of truth
    vector.ts       # vector math: cosine (shape), pattern (level-agnostic), distance
    fromProfile.ts  # deterministic profile → DNA vector
    summary.ts      # 8-bucket rollup for the radar chart
  archetypes/
    library.ts      # 32 seeded archetypes (≥30 required), incl. honest developmental molds
    matching.ts     # build comp vs game comp; implausible builds down-weighted, not blocked
    gapReport.ts    # top-5 trainable deltas → the training engine's input
  training/
    library.ts      # ~55 seeded drills across all 14 categories/tiers (extensible toward ≥150)
    phase.ts        # periodization: season phases + weekly microcycle template
    readiness.ts    # explicit autoregulation rule table (green/yellow/red)
    generateSession.ts # the deterministic session engine
  profile/types.ts  # onboarding input types
```

Providers (external services behind interfaces with mocks):

```
src/lib/providers/wearable/
  types.ts       # WearableProvider interface (WHOOP/Apple Health/Garmin/Oura plug in)
  mock.ts        # MockWearableProvider — deterministic-per-day fixture readiness
  whoop.ts       # SERVER-ONLY: WHOOP OAuth 2.0 + data pipeline + 30-day baseline
  tokenStore.ts  # SERVER-ONLY: httpOnly-cookie token persistence
  baseline.ts    # rolling 30-day HRV/RHR baseline (cold-start aware)
  selfReport.ts  # degrade path — sleep + subjective, never fabricates HRV/RHR
```

WHOOP OAuth routes live under `src/app/api/whoop/` (`authorize`, `callback`,
`readiness`, `status`, `disconnect`, `webhook`). Settings (`/settings`) lets you
pick the readiness source: **Demo** (mock), **Self-report** (works offline, no
device), or **WHOOP**. Without WHOOP credentials the app runs fully on the other
two sources and Settings shows exactly which env vars to add.

**WHOOP caveats (spec Part 4.1):** requires an approved WHOOP developer account.
The API endpoint paths, scopes, and response field names in `whoop.ts` reflect
the v1 shape and **must be verified against current WHOOP docs before shipping** —
they're isolated so a change is one line. WHOOP's public API is read-oriented, so
"push completed sessions back as workouts" returns `unsupported` rather than
POSTing to an unverified endpoint.

The **session generator** is pure: given the gap report, the archetype's training
emphasis, available equipment, the season phase, today's readiness, and injury flags,
it always produces the same session. Readiness maps to an explicit autoregulation table
(green = full, yellow = trim volume / no PRs, red = downgrade a gym day to skill + mobility).
The drill library is ~55 drills covering every category and tier; the schema and engine
support the spec's ≥150 — filling it out is content work, not an engine change.

Run the core test suite:

```bash
npm test
```

## Expansion: Recovery Map + Advanced Gym Engine (F1–F3 done)

The addendum spec's foundation is in place — everything the 3D Fatigue Map will read from:

```
src/lib/core/strength/
  muscles.ts   # frozen 26-muscle taxonomy (τ + capacity heuristics, one place)
  exercise.ts  # rich drill schema (muscleContributions drive the fatigue map)
  library.ts   # 17 mandated advanced gym drills, contributions summing to 1.0
src/lib/core/fatigue/
  constants.ts # every tunable heuristic — one file, labeled as heuristics
  engine.ts    # pure, traceable fatigue engine (SU → decay → capacity → %, ETA)
```

`computeMuscleFatigue(muscle, { sets, now })` is the single traceable function: any
percentage the app shows is reproducible from it + the logged sets. See the worked
examples: `npx tsx scripts/fatigue-demo.ts`.

**F4–F6 done:**

```
src/lib/analytics/    # pure aggregation (strength, volume-by-muscle, shooting, body, captions, export)
src/lib/progress/     # shooting-zone + body-metric types
src/lib/demo/seed.ts  # deterministic ~4-week demo history (Settings → Load demo)
src/components/BodyMap2D.tsx   # 2D SVG fatigue map (front/back, fatigue/neglect, tap→detail)
src/app/progress/     # Progress screen — Overview / Strength / Skill / Body tabs
src/lib/providers/video/  # VideoProvider iface + server YouTube v3 provider + channel allowlist
src/app/api/videos/   # resolve route — returns [] (never a fabricated id) without a key
```

- **Progress (A):** 4 tabs. All aggregation is pure + unit-tested; captions are generated
  from the data, not an LLM; CSV/JSON export. Charts are safe with 0/1/2/400 points.
- **2D body map (D.0):** wired to the fatigue engine; tap a muscle for the traceable
  "what caused this" (ranked sessions) + "what targets this" + recovery ETA. Labeled
  "estimated training load," with a "neglect" inverse view.
- **YouTube (C):** resolved + validated against the live API (embeddable/status/duration),
  channel allowlist with **unverified ids** (no fabrication), IFrame embed + channel credit,
  graceful cues-only fallback offline / without a key. Needs `YOUTUBE_API_KEY`.

Still to build: 3D map (D — needs a licensed mesh, see ATTRIBUTIONS.md), soreness
calibration + asymmetry (F9).

## THE WEEK — mentality module (foundation done)

```
src/lib/mental/        # schema, seeded content (Week 3 full + 12-week arc), metrics, Sunday Report generator
src/app/week/          # The Week cycle · alter-ego ceremony (/onboarding) · Sunday Report (/report)
src/app/paywall/       # pricing + required pre-purchase disclosure + restore + one-tap cancel
scripts/curate-videos.ts  # YouTube "finder": resolves handles → real IDs, discovers + validates via the API
```

- **Content rules enforced by tests:** every quote carries a non-empty `source` (all copy is
  original, sourced as such); a test blocks any copy that promotes sleep deprivation.
- **Sunday Report:** deterministic + traceable — every sentence derives from a logged value; a claim
  with no value doesn't render; it says so when a metric hasn't moved.
- **Pricing (Part H resolved):** annual $50 is the honest hero, monthly $9.99 is the standard (not a
  manipulative anchor), intro $5.99. Real IAP is StoreKit 2 / Play Billing on native; web "Unlock" is a stand-in.
- **YouTube:** `curate-videos.ts` resolves the allowlist handles to real channel IDs and discovers +
  validates embeddable videos via the API (needs `YOUTUBE_API_KEY`). No hardcoded IDs; Jeff Nippard's
  channel id is verified, the rest resolve at curation time.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase values (see below)
npm run dev                  # http://localhost:3000
```

**Baseline runs with zero credentials.** Without Supabase configured, onboarding computes your DNA
vector and archetype match entirely in the browser and persists to localStorage — so you can click
through the whole Phase 1 flow immediately. Supabase is only needed to sync/persist across devices
and to enable auth (wired in a later phase).

### Supabase setup (optional for Phase 1)

1. Create a project at supabase.com.
2. Run the migration in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   (SQL editor, or `supabase db push` with the CLI).
3. Put the project URL + anon key into `.env.local`.
4. Seed the archetype reference table (needs the service-role key):

   ```bash
   npx tsx scripts/seed-archetypes.ts
   ```

### Required env vars

| Var | Needed for | Phase |
|-----|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | auth + persistence | 1 (optional) |
| `SUPABASE_SERVICE_ROLE_KEY` | seeding reference data (server-only) | 1 (optional) |
| `ANTHROPIC_API_KEY` | Coach chat | 7 |
| `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` / `WHOOP_REDIRECT_URI` | WHOOP OAuth (needs an approved WHOOP developer account) | 3 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google Calendar OAuth | 4 |

No secrets are committed; `.env.local` is gitignored.

## Scripts

| Command | Does |
|---------|------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Vitest core-domain suite |
| `npx tsx scripts/seed-archetypes.ts` | Sync archetype library → Supabase |

## Guardrails already in place (spec Part 8)

- Medical disclaimer shown at onboarding; the app never diagnoses.
- Youth athletes (<16) get an explicit volume/growth-plate note during onboarding.
- Nothing is fabricated: the `/today` screen honestly says the training engine is Phase 2 rather
  than faking a plan.

## Phase 0 decisions & spec deviations

Recorded so the next phase has context:

- **Archetypes are not live-sourced.** The spec asked to verify archetypes against a live source;
  they are stylistic templates with hand-authored vectors and don't depend on current-season data.
  Live sourcing is reserved for the Shoe catalog, where it matters.
- **Matching uses two similarities.** Build comp = Euclidean closeness on the physical sub-vector.
  Game comp = mean-centered ("pattern") cosine on the skill+style sub-vector, which is level-agnostic
  so a 6'0" player can match Curry's game. Raw cosine's magnitude-blindness is deliberately avoided
  for the gap report, which uses raw component deltas.
- **Single-user, but multi-tenant-ready.** RLS policies key off `auth.uid()` so enabling multi-user
  later needs no schema change.
```
