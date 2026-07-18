# Supabase setup

This project's database is **shared with another app**, so everything SkillNorth
owns is namespaced: tables live in a dedicated **`skillnorth`** schema (not `public`)
and storage buckets are prefixed **`skillnorth-`**. Nothing here touches the other
app's objects.

## 1. Apply the schema

**Option A — SQL editor (fastest).** Dashboard → SQL Editor, paste and run each in order:

1. `migrations/0001_init.sql` — the `skillnorth` schema, tables, RLS, triggers, grants
2. `migrations/0002_storage.sql` — two private buckets

**Option B — Supabase CLI.**

```bash
supabase link --project-ref gwfxrwzljqlcklciicgw
supabase db push
```

## 2. Expose the schema to the API (required — the app can't see the tables without it)

Because the tables are in `skillnorth` rather than `public`, PostgREST won't serve
them until you add the schema:

- Dashboard → **Settings → API → Data API → Exposed schemas** → add **`skillnorth`** → save.

The app's Supabase clients are already configured to query the `skillnorth` schema
(`db: { schema: 'skillnorth' }`), so no code change is needed once it's exposed.

## What it creates

- **`skillnorth.profiles`** and its children (`experiences`, `education`,
  `certifications`, `skills`, `projects`) — the career knowledge base.
- **`skillnorth.jobs`, `matches`, `documents`, `applications`** — the core loop.
- **`skillnorth.user_settings`** — automation bands and dimension weights.
- Buckets **`skillnorth-cv-uploads`** and **`skillnorth-generated-docs`**, each
  isolated so a user can only reach objects under their own `<user-id>/` folder.

## The security model in one line

Every user-owned table has **Row Level Security on**, with a policy tying each row
to `auth.uid()`. The anon key is public by design — RLS, not key secrecy, keeps one
user out of another's data. A new signup automatically gets an empty profile and
default settings via the `skillnorth.handle_new_user` trigger (registered under a
unique name, `skillnorth_on_auth_user_created`, so it can't clash with the other
app's `auth.users` triggers).

## After applying

Confirm in Authentication → Policies that **every** `skillnorth.*` table shows RLS
enabled. An unprotected table here is a data leak, not a convenience.
