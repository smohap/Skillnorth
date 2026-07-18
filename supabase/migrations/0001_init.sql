-- SkillNorth initial schema
--
-- Everything lives in a dedicated `skillnorth` schema, NOT `public`, because this
-- Supabase project is shared with another app. That keeps table names from
-- colliding, and — just as important — keeps our objects, grants, and the
-- auth.users trigger from stepping on theirs.
--
-- Every user-owned table has Row Level Security ON with a policy tying each row to
-- auth.uid(). The anon key is public by design, so RLS — not key secrecy — is the
-- security model. A table without RLS here would be a data leak.
--
-- Run this in the Supabase SQL editor, or via `supabase db push` with the CLI.
-- AFTER running it, add `skillnorth` to Settings -> API -> Exposed schemas, or the
-- client can't see these tables. See supabase/README.md.

-- Resolve the pgvector type whether it was installed into public or extensions.
set search_path = skillnorth, public, extensions;

create extension if not exists vector;

create schema if not exists skillnorth;

-- PostgREST reaches the schema through these roles; RLS still restricts the rows.
grant usage on schema skillnorth to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profiles — the career knowledge base, one per user
-- ---------------------------------------------------------------------------
create table skillnorth.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  full_name   text not null default '',
  headline    text,
  email       text,
  phone       text,
  location    text,
  links       jsonb not null default '{}'::jsonb,
  summary     text,
  -- Bumped on every edit. Match rows cache against it, so one increment
  -- invalidates every stale score at once. See skillnorth.bump_profile_version().
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- Child tables of a profile
-- ---------------------------------------------------------------------------
create table skillnorth.experiences (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references skillnorth.profiles (id) on delete cascade,
  company     text not null,
  title       text not null,
  location    text,
  start_date  text,               -- 'YYYY-MM' precision is what CVs carry
  end_date    text,               -- null while current
  is_current  boolean not null default false,
  bullets     jsonb not null default '[]'::jsonb,  -- [{ id, text }]
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index experiences_profile_id_idx on skillnorth.experiences (profile_id);

create table skillnorth.education (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references skillnorth.profiles (id) on delete cascade,
  institution   text not null,
  qualification text not null,
  field         text,
  start_date    text,
  end_date      text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index education_profile_id_idx on skillnorth.education (profile_id);

create table skillnorth.certifications (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references skillnorth.profiles (id) on delete cascade,
  name          text not null,
  issuer        text not null,
  issued        text,
  expires       text,
  credential_id text,
  created_at    timestamptz not null default now()
);
create index certifications_profile_id_idx on skillnorth.certifications (profile_id);

create table skillnorth.skills (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references skillnorth.profiles (id) on delete cascade,
  name        text not null,
  category    text,
  level       text,
  years       numeric,
  -- 'parsed' | 'self' | 'verified'. Verified skills will outweigh self-reported
  -- ones in the match engine; v1 treats parsed and self alike.
  source      text not null default 'self',
  created_at  timestamptz not null default now()
);
create index skills_profile_id_idx on skillnorth.skills (profile_id);

create table skillnorth.projects (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references skillnorth.profiles (id) on delete cascade,
  name        text not null,
  description text,
  url         text,
  bullets     jsonb not null default '[]'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index projects_profile_id_idx on skillnorth.projects (profile_id);

-- ---------------------------------------------------------------------------
-- jobs — parsed postings
-- ---------------------------------------------------------------------------
create table skillnorth.jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  url         text,
  source      text not null default 'pasted',
  title       text not null,
  company     text not null,
  location    text,
  raw_text    text not null default '',
  -- { requirements[], responsibilities[], seniority, educationRequirements[],
  --   minYearsExperience, logistics{} }
  parsed      jsonb not null default '{}'::jsonb,
  embedding   vector(1024),
  created_at  timestamptz not null default now()
);
create index jobs_user_id_idx on skillnorth.jobs (user_id);

-- ---------------------------------------------------------------------------
-- matches — a profile scored against a job
-- ---------------------------------------------------------------------------
create table skillnorth.matches (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references skillnorth.jobs (id) on delete cascade,
  profile_id      uuid not null references skillnorth.profiles (id) on delete cascade,
  profile_version integer not null,
  overall         integer not null,
  band            text not null,
  subscores       jsonb not null default '[]'::jsonb,
  gaps            jsonb not null default '[]'::jsonb,
  evidence        jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  -- The cache key: at most one score per (job, profile version). Editing the
  -- profile bumps the version and makes a new row rather than colliding.
  unique (job_id, profile_version)
);
create index matches_job_id_idx on skillnorth.matches (job_id);

-- ---------------------------------------------------------------------------
-- documents — generated CV / cover letter
-- ---------------------------------------------------------------------------
create table skillnorth.documents (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references skillnorth.matches (id) on delete cascade,
  kind        text not null,          -- 'cv' | 'cover'
  content     jsonb not null default '{}'::jsonb,
  readiness   jsonb not null default '{}'::jsonb,
  pdf_path    text,
  created_at  timestamptz not null default now()
);
create index documents_match_id_idx on skillnorth.documents (match_id);

-- ---------------------------------------------------------------------------
-- applications — the tracker pipeline
-- ---------------------------------------------------------------------------
create table skillnorth.applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  job_id       uuid not null references skillnorth.jobs (id) on delete cascade,
  document_id  uuid references skillnorth.documents (id) on delete set null,
  status       text not null default 'prepared',
  timeline     jsonb not null default '[]'::jsonb,
  applied_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index applications_user_id_idx on skillnorth.applications (user_id);

-- ---------------------------------------------------------------------------
-- user_settings — automation bands and weights
-- ---------------------------------------------------------------------------
create table skillnorth.user_settings (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  auto_band_min    integer not null default 90,
  confirm_band_min integer not null default 80,
  improve_band_min integer not null default 60,
  weekly_cap       integer not null default 15,
  weights          jsonb not null default '{
    "technical_skills": 35, "experience": 25, "responsibilities": 15,
    "education": 10, "seniority": 10, "logistics": 5
  }'::jsonb,
  updated_at       timestamptz not null default now()
);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table skillnorth.profiles       enable row level security;
alter table skillnorth.experiences    enable row level security;
alter table skillnorth.education       enable row level security;
alter table skillnorth.certifications  enable row level security;
alter table skillnorth.skills          enable row level security;
alter table skillnorth.projects        enable row level security;
alter table skillnorth.jobs            enable row level security;
alter table skillnorth.matches         enable row level security;
alter table skillnorth.documents       enable row level security;
alter table skillnorth.applications    enable row level security;
alter table skillnorth.user_settings   enable row level security;

-- Tables that carry user_id directly.
create policy "own profiles"     on skillnorth.profiles      for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own jobs"         on skillnorth.jobs          for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own applications" on skillnorth.applications  for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings"     on skillnorth.user_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Profile children: ownership is inherited through the parent profile.
create policy "own experiences" on skillnorth.experiences for all
  using (exists (select 1 from skillnorth.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from skillnorth.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "own education" on skillnorth.education for all
  using (exists (select 1 from skillnorth.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from skillnorth.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "own certifications" on skillnorth.certifications for all
  using (exists (select 1 from skillnorth.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from skillnorth.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "own skills" on skillnorth.skills for all
  using (exists (select 1 from skillnorth.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from skillnorth.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "own projects" on skillnorth.projects for all
  using (exists (select 1 from skillnorth.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from skillnorth.profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- Matches inherit ownership through the job.
create policy "own matches" on skillnorth.matches for all
  using (exists (select 1 from skillnorth.jobs j where j.id = job_id and j.user_id = auth.uid()))
  with check (exists (select 1 from skillnorth.jobs j where j.id = job_id and j.user_id = auth.uid()));

-- Documents inherit ownership through match -> job.
create policy "own documents" on skillnorth.documents for all
  using (exists (
    select 1 from skillnorth.matches m join skillnorth.jobs j on j.id = m.job_id
    where m.id = match_id and j.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from skillnorth.matches m join skillnorth.jobs j on j.id = m.job_id
    where m.id = match_id and j.user_id = auth.uid()
  ));

-- ===========================================================================
-- Triggers and functions (all namespaced under skillnorth)
-- ===========================================================================

create or replace function skillnorth.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on skillnorth.profiles
  for each row execute function skillnorth.touch_updated_at();
create trigger settings_touch before update on skillnorth.user_settings
  for each row execute function skillnorth.touch_updated_at();

-- On a new signup, seed an empty profile and default settings.
-- SECURITY DEFINER to write past RLS; search_path pinned to skillnorth so it can't
-- be hijacked. Objects are schema-qualified anyway, belt and braces.
create or replace function skillnorth.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = skillnorth
as $$
begin
  insert into skillnorth.profiles (user_id, full_name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
    on conflict (user_id) do nothing;
  insert into skillnorth.user_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

-- IMPORTANT: a unique trigger name. The other app on this database may already have
-- a trigger on auth.users — a name clash would replace or break theirs.
create trigger skillnorth_on_auth_user_created
  after insert on auth.users
  for each row execute function skillnorth.handle_new_user();

-- Bump a profile's version. Call from the data layer after any profile edit; it
-- invalidates cached match scores by construction. An explicit function, not a web
-- of child triggers, so the one invalidation point stays obvious and testable.
create or replace function skillnorth.bump_profile_version(p_profile_id uuid)
returns integer
language sql
security definer
set search_path = skillnorth
as $$
  update skillnorth.profiles
     set version = version + 1
   where id = p_profile_id
     and user_id = auth.uid()
  returning version;
$$;

-- ===========================================================================
-- Grants — PostgREST needs these on a custom schema (public gets them by default).
-- RLS still governs which rows each role actually sees.
-- ===========================================================================
grant all on all tables    in schema skillnorth to anon, authenticated, service_role;
grant all on all routines  in schema skillnorth to anon, authenticated, service_role;
grant all on all sequences in schema skillnorth to anon, authenticated, service_role;

alter default privileges in schema skillnorth
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema skillnorth
  grant all on routines to anon, authenticated, service_role;
alter default privileges in schema skillnorth
  grant all on sequences to anon, authenticated, service_role;
