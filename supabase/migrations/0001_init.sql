-- SkillNorth initial schema
--
-- Every user-owned table has Row Level Security ON and a policy that ties each row
-- back to auth.uid(). This is the whole security model: the anon key is public, so
-- RLS — not key secrecy — is what stops one user reading another's data. A table
-- without RLS enabled here would be a data leak, not a convenience.
--
-- Run this in the Supabase SQL editor, or via `supabase db push` with the CLI.

-- pgvector, for semantic matching of requirements against experience.
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- profiles — the career knowledge base, one per user
-- ---------------------------------------------------------------------------
create table public.profiles (
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
  -- invalidates every stale score at once. See bump_profile_version().
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- ---------------------------------------------------------------------------
-- Child tables of a profile
-- ---------------------------------------------------------------------------
create table public.experiences (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
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
create index experiences_profile_id_idx on public.experiences (profile_id);

create table public.education (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  institution   text not null,
  qualification text not null,
  field         text,
  start_date    text,
  end_date      text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index education_profile_id_idx on public.education (profile_id);

create table public.certifications (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  name          text not null,
  issuer        text not null,
  issued        text,
  expires       text,
  credential_id text,
  created_at    timestamptz not null default now()
);
create index certifications_profile_id_idx on public.certifications (profile_id);

create table public.skills (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  category    text,
  level       text,
  years       numeric,
  -- 'parsed' | 'self' | 'verified'. Verified skills will outweigh self-reported
  -- ones in the match engine; v1 treats parsed and self alike.
  source      text not null default 'self',
  created_at  timestamptz not null default now()
);
create index skills_profile_id_idx on public.skills (profile_id);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  description text,
  url         text,
  bullets     jsonb not null default '[]'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index projects_profile_id_idx on public.projects (profile_id);

-- ---------------------------------------------------------------------------
-- jobs — parsed postings
-- ---------------------------------------------------------------------------
create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  url         text,
  source      text not null default 'pasted',
  title       text not null,
  company     text not null,
  location    text,
  raw_text    text not null default '',
  -- Structured extraction: { requirements[], responsibilities[], seniority,
  -- educationRequirements[], minYearsExperience, logistics{} }
  parsed      jsonb not null default '{}'::jsonb,
  embedding   vector(1024),
  created_at  timestamptz not null default now()
);
create index jobs_user_id_idx on public.jobs (user_id);

-- ---------------------------------------------------------------------------
-- matches — a profile scored against a job
-- ---------------------------------------------------------------------------
create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.jobs (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  profile_version integer not null,
  overall         integer not null,
  band            text not null,
  subscores       jsonb not null default '[]'::jsonb,
  gaps            jsonb not null default '[]'::jsonb,
  evidence        jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  -- The cache key: at most one score per (job, profile version). Re-scoring an
  -- unchanged profile is a no-op; editing the profile bumps the version and makes
  -- a new row rather than colliding with the old one.
  unique (job_id, profile_version)
);
create index matches_job_id_idx on public.matches (job_id);

-- ---------------------------------------------------------------------------
-- documents — generated CV / cover letter
-- ---------------------------------------------------------------------------
create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches (id) on delete cascade,
  kind        text not null,          -- 'cv' | 'cover'
  content     jsonb not null default '{}'::jsonb,
  readiness   jsonb not null default '{}'::jsonb,
  pdf_path    text,
  created_at  timestamptz not null default now()
);
create index documents_match_id_idx on public.documents (match_id);

-- ---------------------------------------------------------------------------
-- applications — the tracker pipeline
-- ---------------------------------------------------------------------------
create table public.applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  job_id       uuid not null references public.jobs (id) on delete cascade,
  document_id  uuid references public.documents (id) on delete set null,
  status       text not null default 'prepared',
  timeline     jsonb not null default '[]'::jsonb,
  applied_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index applications_user_id_idx on public.applications (user_id);

-- ---------------------------------------------------------------------------
-- user_settings — automation bands and weights
-- ---------------------------------------------------------------------------
create table public.user_settings (
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
alter table public.profiles       enable row level security;
alter table public.experiences    enable row level security;
alter table public.education       enable row level security;
alter table public.certifications  enable row level security;
alter table public.skills          enable row level security;
alter table public.projects        enable row level security;
alter table public.jobs            enable row level security;
alter table public.matches         enable row level security;
alter table public.documents       enable row level security;
alter table public.applications    enable row level security;
alter table public.user_settings   enable row level security;

-- Tables that carry user_id directly: the owner may do anything with their rows.
create policy "own profiles"     on public.profiles      for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own jobs"         on public.jobs          for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own applications" on public.applications  for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own settings"     on public.user_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Profile children: ownership is inherited through the parent profile.
create policy "own experiences" on public.experiences for all
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "own education" on public.education for all
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "own certifications" on public.certifications for all
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "own skills" on public.skills for all
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "own projects" on public.projects for all
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- Matches inherit ownership through the job.
create policy "own matches" on public.matches for all
  using (exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid()))
  with check (exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid()));

-- Documents inherit ownership through match -> job.
create policy "own documents" on public.documents for all
  using (exists (
    select 1 from public.matches m join public.jobs j on j.id = m.job_id
    where m.id = match_id and j.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.matches m join public.jobs j on j.id = m.job_id
    where m.id = match_id and j.user_id = auth.uid()
  ));

-- ===========================================================================
-- Triggers
-- ===========================================================================

-- Keep updated_at honest on profiles and settings.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch     before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger settings_touch     before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- On a new signup, seed an empty profile and default settings so the app never has
-- to special-case a user who exists in auth but has no profile row yet.
-- SECURITY DEFINER so it can write despite RLS; search_path pinned per Supabase
-- guidance to prevent search-path hijacking.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
    on conflict (user_id) do nothing;
  insert into public.user_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bump a profile's version. Call this from the data layer after any edit to the
-- profile or its children; it invalidates cached match scores by construction.
-- Kept as an explicit function rather than a cascade of child triggers so the
-- invalidation point is obvious and testable, not spread across the schema.
create or replace function public.bump_profile_version(p_profile_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set version = version + 1
   where id = p_profile_id
     and user_id = auth.uid()
  returning version;
$$;
