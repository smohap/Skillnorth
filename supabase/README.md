# Supabase setup

## Apply the schema

**Option A — SQL editor (fastest).** In the Supabase dashboard → SQL Editor, paste
and run each file in order:

1. `migrations/0001_init.sql` — tables, RLS, triggers
2. `migrations/0002_storage.sql` — private buckets for CV uploads and generated PDFs

**Option B — Supabase CLI.**

```bash
supabase link --project-ref gwfxrwzljqlcklciicgw
supabase db push
```

## What it creates

- **`profiles`** and its children (`experiences`, `education`, `certifications`,
  `skills`, `projects`) — the career knowledge base.
- **`jobs`**, **`matches`**, **`documents`**, **`applications`** — the core loop.
- **`user_settings`** — automation bands and dimension weights.
- Two private storage buckets, each isolated so a user can only reach objects under
  their own `<user-id>/` folder.

## The security model in one line

Every user-owned table has **Row Level Security on**, with a policy tying each row
to `auth.uid()`. The anon key is public by design — RLS, not key secrecy, is what
keeps one user out of another's data. A new signup automatically gets an empty
profile and default settings via the `handle_new_user` trigger.

## After applying

Confirm in the dashboard that **every** table under Authentication → Policies shows
RLS enabled. If any table is unprotected, stop and re-run `0001_init.sql` — an
unprotected table here is a data leak, not a convenience.
