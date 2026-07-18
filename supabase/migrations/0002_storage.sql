-- Storage buckets for uploaded CVs and generated PDFs.
--
-- Both are private. Access is scoped so a user can only touch objects under a
-- folder named for their own auth uid — the first path segment must equal
-- auth.uid(). That means every stored path looks like `<user-id>/<filename>`.

insert into storage.buckets (id, name, public)
values ('cv-uploads', 'cv-uploads', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('generated-docs', 'generated-docs', false)
on conflict (id) do nothing;

-- CV uploads: the user owns everything under their own uid folder.
create policy "own cv uploads"
  on storage.objects for all
  using (
    bucket_id = 'cv-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'cv-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Generated documents: same folder-per-user isolation.
create policy "own generated docs"
  on storage.objects for all
  using (
    bucket_id = 'generated-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'generated-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
