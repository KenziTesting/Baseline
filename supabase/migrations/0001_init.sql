-- Baseline — Phase 1 schema.
--
-- Single-user product, but built multi-tenant-ready: every user-owned row keys
-- off auth.uid() and is protected by Row Level Security so a future multi-user
-- flip needs no data-model changes (Phase 0 decision).
--
-- Tables introduced in later phases (drills, workout_templates, scheduled_sessions,
-- session_logs, set_logs, skill_benchmarks, wearable_readings, shoes,
-- shoe_recommendations, calendar_links) are declared in their own migrations.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users: thin profile row mirrored from auth.users (1:1).
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  units text not null default 'imperial' check (units in ('imperial', 'metric')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- player_profiles: the raw onboarding inputs (source of truth for the DNA vector).
-- ---------------------------------------------------------------------------
create table if not exists public.player_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  display_name text not null,
  age integer not null check (age between 8 and 60),
  training_age numeric not null default 0 check (training_age >= 0),
  level text not null check (level in ('middle_school','jv','varsity','aau','juco','d2','d1','semi_pro','pro')),
  -- one or more of pg/sg/sf/pf/c; first entry is primary
  positions jsonb not null default '[]'::jsonb,
  units text not null default 'imperial' check (units in ('imperial','metric')),
  self_described_playstyle text,
  height_in numeric not null,
  weight_lb numeric not null,
  wingspan_in numeric not null,
  standing_reach_in numeric,
  vertical_in numeric,
  -- sparse map of dimensionKey -> 1..5
  skill_ratings jsonb not null default '{}'::jsonb,
  -- { pacePreference, shotLocation, onOffBall, isoVsSystem, physicalityTolerance }
  style jsonb not null default '{}'::jsonb,
  injury_history text,
  current_limitations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- one active profile per user for v1
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- dna_vectors: computed DNA vector snapshots. Longitudinal (spec Part 7.5 wants
-- "DNA vector over time"), so we keep every computation, newest wins for "current".
-- Stored WITH the engine version + input hash so a snapshot is reproducible/auditable.
-- ---------------------------------------------------------------------------
create table if not exists public.dna_vectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  profile_id uuid not null references public.player_profiles (id) on delete cascade,
  vector jsonb not null,              -- { dimensionKey: 0..100 }
  engine_version text not null,       -- version of the deterministic engine
  input_hash text not null,           -- hash of the profile inputs that produced it
  notes jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default now()
);
create index if not exists dna_vectors_user_computed_idx
  on public.dna_vectors (user_id, computed_at desc);

-- ---------------------------------------------------------------------------
-- archetypes: the reference library. Seeded from code (src/lib/core/archetypes),
-- mirrored here so matches and gap reports can be persisted/joined. `is_seed`
-- distinguishes library rows from any future user-authored ones.
-- ---------------------------------------------------------------------------
create table if not exists public.archetypes (
  id text primary key,                -- matches the code id, e.g. 'movement-shooter'
  name text not null,
  blurb text not null,
  nba_reference text not null,
  college_reference text not null,
  build_range text not null,
  dna jsonb not null,
  defining_skills jsonb not null,
  common_weaknesses jsonb not null,
  training_emphasis jsonb not null,
  developmental boolean not null default false,
  is_seed boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- archetype_matches: a stored match result + optional gap report. Stores the
-- input DNA snapshot id so the result is diffable/auditable (spec Part 6).
-- ---------------------------------------------------------------------------
create table if not exists public.archetype_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  dna_vector_id uuid not null references public.dna_vectors (id) on delete cascade,
  -- top-3 [{ archetypeId, buildComp, gameComp, overall }, ...]
  top jsonb not null,
  best_build_comp_id text not null references public.archetypes (id),
  best_game_comp_id text not null references public.archetypes (id),
  -- user's chosen aspirational archetype (override or the algorithm's pick)
  aspirational_archetype_id text references public.archetypes (id),
  is_user_override boolean not null default false,
  -- gap report toward the aspirational archetype: [{ dimension, delta, ... }]
  gap_report jsonb,
  created_at timestamptz not null default now()
);
create index if not exists archetype_matches_user_created_idx
  on public.archetype_matches (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_profiles_updated_at on public.player_profiles;
create trigger player_profiles_updated_at
  before update on public.player_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security. Archetypes are world-readable (reference data); everything
-- user-owned is scoped to the authenticated user.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.player_profiles enable row level security;
alter table public.dna_vectors enable row level security;
alter table public.archetype_matches enable row level security;
alter table public.archetypes enable row level security;

-- users
drop policy if exists users_self on public.users;
create policy users_self on public.users
  using (auth.uid() = id) with check (auth.uid() = id);

-- owned tables: identical self-scoped policy shape
drop policy if exists player_profiles_owner on public.player_profiles;
create policy player_profiles_owner on public.player_profiles
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists dna_vectors_owner on public.dna_vectors;
create policy dna_vectors_owner on public.dna_vectors
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists archetype_matches_owner on public.archetype_matches;
create policy archetype_matches_owner on public.archetype_matches
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- archetypes: readable by any authenticated user, writable only by service role
-- (service role bypasses RLS, so no write policy is needed here).
drop policy if exists archetypes_read on public.archetypes;
create policy archetypes_read on public.archetypes
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Auto-provision a public.users row when an auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
