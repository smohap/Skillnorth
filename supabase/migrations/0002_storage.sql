-- Storage buckets for uploaded CVs and generated PDFs.
--
-- Storage is a single shared namespace across the whole project, so bucket ids and
-- policy names are prefixed `skillnorth-` / "skillnorth ..." to avoid colliding
-- with the other app on this database.
--
-- Both buckets are private. Access is scoped so a user can only touch objects under
-- a folder named for their own auth uid — every path is `<user-id>/<filename>`.

insert into storage.buckets (id, name, public)
values ('skillnorth-cv-uploads', 'skillnorth-cv-uploads', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('skillnorth-generated-docs', 'skillnorth-generated-docs', false)
on conflict (id) do nothing;

create policy "skillnorth own cv uploads"
  on storage.objects for all
  using (
    bucket_id = 'skillnorth-cv-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'skillnorth-cv-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "skillnorth own generated docs"
  on storage.objects for all
  using (
    bucket_id = 'skillnorth-generated-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'skillnorth-generated-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
