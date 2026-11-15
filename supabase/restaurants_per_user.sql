-- Make restaurants a private, per-user food journal.
-- Run this once in the Supabase SQL Editor for the existing production project,
-- BEFORE deploying the app code that filters restaurants by user_id.
-- Safe to re-run.

begin;

-- 1. Ownership column. Defaults to the caller so inserts from the app are owned automatically.
alter table restaurants
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- 2. Existing restaurants belong to the original owner.
update restaurants
set user_id = (select id from auth.users where email = 'dfchen6@gmail.com')
where user_id is null;

alter table restaurants alter column user_id set not null;

create index if not exists restaurants_user_id_idx on restaurants(user_id);

-- 3. Replace public-read / admin-write policies with owner-only access.
drop policy if exists "public can read restaurants" on restaurants;
drop policy if exists "admin can write restaurants" on restaurants;
drop policy if exists "public can read restaurant dishes" on restaurant_dishes;
drop policy if exists "admin can write restaurant dishes" on restaurant_dishes;
drop policy if exists "public can read restaurant photos" on restaurant_photos;
drop policy if exists "admin can write restaurant photos" on restaurant_photos;
drop policy if exists "owners manage their restaurants" on restaurants;
drop policy if exists "owners manage their restaurant dishes" on restaurant_dishes;
drop policy if exists "owners manage their restaurant photos" on restaurant_photos;

create policy "owners manage their restaurants" on restaurants
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owners manage their restaurant dishes" on restaurant_dishes
  for all to authenticated
  using (exists (select 1 from restaurants r where r.id = restaurant_id and r.user_id = auth.uid()))
  with check (exists (select 1 from restaurants r where r.id = restaurant_id and r.user_id = auth.uid()));

create policy "owners manage their restaurant photos" on restaurant_photos
  for all to authenticated
  using (exists (select 1 from restaurants r where r.id = restaurant_id and r.user_id = auth.uid()))
  with check (exists (select 1 from restaurants r where r.id = restaurant_id and r.user_id = auth.uid()));

-- 4. Storage: any signed-in user may manage images under restaurants/<their uid>/...
--    (The existing admin policies for recipes/ and restaurants/ stay in place.)
drop policy if exists "users can view own restaurant images" on storage.objects;
drop policy if exists "users can upload own restaurant images" on storage.objects;
drop policy if exists "users can update own restaurant images" on storage.objects;
drop policy if exists "users can delete own restaurant images" on storage.objects;

-- SELECT is needed for upload with upsert: true.
create policy "users can view own restaurant images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] = 'restaurants'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "users can upload own restaurant images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] = 'restaurants'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "users can update own restaurant images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] = 'restaurants'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] = 'restaurants'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "users can delete own restaurant images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] = 'restaurants'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

commit;
