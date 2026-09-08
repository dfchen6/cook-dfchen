-- Run this once in the Supabase SQL Editor for the existing production project.
-- The restaurant-images bucket must already exist and be public.

drop policy if exists "admin can view managed images" on storage.objects;
drop policy if exists "admin can upload managed images" on storage.objects;
drop policy if exists "admin can update managed images" on storage.objects;
drop policy if exists "admin can delete managed images" on storage.objects;

create policy "admin can view managed images" on storage.objects
  for select
  using (
    bucket_id = 'restaurant-images'
    and auth.jwt() ->> 'email' = 'dfchen6@gmail.com'
  );

create policy "admin can upload managed images" on storage.objects
  for insert
  with check (
    bucket_id = 'restaurant-images'
    and auth.jwt() ->> 'email' = 'dfchen6@gmail.com'
    and (storage.foldername(name))[1] in ('recipes', 'restaurants')
  );

create policy "admin can update managed images" on storage.objects
  for update
  using (
    bucket_id = 'restaurant-images'
    and auth.jwt() ->> 'email' = 'dfchen6@gmail.com'
    and (storage.foldername(name))[1] in ('recipes', 'restaurants')
  )
  with check (
    bucket_id = 'restaurant-images'
    and auth.jwt() ->> 'email' = 'dfchen6@gmail.com'
    and (storage.foldername(name))[1] in ('recipes', 'restaurants')
  );

create policy "admin can delete managed images" on storage.objects
  for delete
  using (
    bucket_id = 'restaurant-images'
    and auth.jwt() ->> 'email' = 'dfchen6@gmail.com'
    and (storage.foldername(name))[1] in ('recipes', 'restaurants')
  );
