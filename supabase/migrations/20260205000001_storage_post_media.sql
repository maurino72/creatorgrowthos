-- Create post-media storage bucket (private, 5MB limit)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- RLS: users can upload to their own folder
create policy "users_insert_own_media"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: users can read their own files
create policy "users_select_own_media"
  on storage.objects for select
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: users can delete their own files
create policy "users_delete_own_media"
  on storage.objects for delete
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
