-- The `avatars` bucket already exists (confirmed against the live project).
-- These statements are idempotent: they only change what isn't already
-- configured, so this is safe to run even if some of this was set up
-- manually before.

update storage.buckets
set public = true,
    file_size_limit = 8388608, -- 8MB, matches the client-side check in useProfile.ts
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars'
  and (
    public is distinct from true
    or file_size_limit is distinct from 8388608
    or allowed_mime_types is distinct from array['image/jpeg', 'image/png', 'image/webp']
  );

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Avatar images are publicly accessible'
  ) then
    create policy "Avatar images are publicly accessible"
      on storage.objects for select
      using (bucket_id = 'avatars');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can upload their own avatar'
  ) then
    create policy "Users can upload their own avatar"
      on storage.objects for insert
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can update their own avatar'
  ) then
    create policy "Users can update their own avatar"
      on storage.objects for update
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;
