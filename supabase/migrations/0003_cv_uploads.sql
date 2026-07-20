-- CV uploads — the ingestion side of the core loop.
--
-- A row is created the moment a file lands in storage, then updated as extraction
-- and parsing progress. Keeping the parsed payload here (rather than in browser
-- state) means a user can close the tab mid-review and pick the import back up,
-- and it leaves a record of where each profile entry originally came from.
--
-- The row is NOT the profile. Nothing reaches experiences/skills/education until
-- the user confirms on the review screen — parsing a CV is a suggestion, not an
-- edit. See src/lib/db/cv.ts.

set search_path = skillnorth, public;

create table skillnorth.cv_uploads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  profile_id    uuid not null references skillnorth.profiles (id) on delete cascade,
  filename      text not null,
  mime_type     text not null,
  byte_size     integer not null,
  -- Always '<user-id>/<uuid>-<filename>', matching the storage RLS policy in 0002.
  storage_path  text not null,
  -- 'parsing' | 'parsed' | 'imported' | 'failed'
  status        text not null default 'parsing',
  -- The ParsedCv shape from src/lib/cv/parse.ts. Empty until parsing succeeds.
  parsed        jsonb not null default '{}'::jsonb,
  -- Populated only when status = 'failed', so the UI can say what went wrong.
  error         text,
  created_at    timestamptz not null default now(),
  imported_at   timestamptz
);

create index cv_uploads_user_id_idx on skillnorth.cv_uploads (user_id, created_at desc);

alter table skillnorth.cv_uploads enable row level security;

create policy "own cv uploads" on skillnorth.cv_uploads for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 0001 sets default privileges for this schema, but granting explicitly keeps the
-- migration correct even when applied by a different role than created the schema.
grant all on skillnorth.cv_uploads to anon, authenticated, service_role;
