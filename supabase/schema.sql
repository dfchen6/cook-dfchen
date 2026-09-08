-- Canonical schema for cook-dfchen — reflects the current production database.
-- For a fresh Supabase project, run this file alone.
-- (google_tokens.sql and recipe_sharing.sql are historical migrations already
-- folded into this file.)

-- Recipes
create table recipes (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title_zh      text not null,
  title_en      text not null,
  description_zh text,
  description_en text,
  instructions  text not null,         -- source of truth (mixed language ok)
  instructions_zh text,                -- AI-generated clean Chinese version
  instructions_en text,                -- AI-generated clean English version
  locale_primary text not null default 'zh' check (locale_primary in ('zh', 'en')),
  cover_image   text,
  youtube_url   text,
  prep_time_mins integer,
  cook_time_mins integer,
  servings      integer,
  tags          text[] default '{}',
  is_public     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Ingredients
create table ingredients (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references recipes(id) on delete cascade,
  name_zh     text not null,
  name_en     text not null,
  quantity    text not null,
  unit        text not null default '',
  sort_order  integer not null default 0
);

-- Per-recipe allowlist of accounts that can view a private recipe
create table recipe_shares (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references recipes(id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now(),
  unique (recipe_id, email)
);

-- Meal plans (auth required)
create table meal_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  recipe_id    uuid not null references recipes(id) on delete cascade,
  planned_date date not null,
  meal_type    text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  notes        text,
  google_event_id text,                -- set once synced to Google Calendar
  created_at   timestamptz not null default now()
);

-- Google OAuth tokens per user (for calendar sync)
create table google_tokens (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expiry_date  bigint,
  updated_at   timestamptz not null default now()
);

-- Restaurants (food journal)
create table restaurants (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  name_zh         text,
  address         text,
  city            text,
  country         text,
  cuisine         text,
  tags            text[] default '{}',
  lat             double precision,
  lng             double precision,
  google_maps_url text,
  overall_rating  integer,
  price_level     integer,
  visited_at      date,
  notes           text,
  cover_image     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table restaurant_dishes (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  name_zh       text,
  description   text,
  image_url     text,
  rating        integer,
  recommended   boolean not null default true,
  sort_order    integer not null default 0
);

create table restaurant_photos (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  image_url     text not null,
  caption       text,
  sort_order    integer not null default 0
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger recipes_updated_at
  before update on recipes
  for each row execute function update_updated_at();

create trigger restaurants_updated_at
  before update on restaurants
  for each row execute function update_updated_at();

-- Row Level Security
alter table recipes enable row level security;
alter table ingredients enable row level security;
alter table recipe_shares enable row level security;
alter table meal_plans enable row level security;
alter table google_tokens enable row level security;
alter table restaurants enable row level security;
alter table restaurant_dishes enable row level security;
alter table restaurant_photos enable row level security;

-- Helper: is this recipe visible to the current requester?
-- security definer so it can consult recipe_shares (RLS-restricted to admin) on the caller's behalf.
create or replace function recipe_is_visible(target_recipe_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from recipes
    where recipes.id = target_recipe_id
    and (
      recipes.is_public
      or auth.jwt() ->> 'email' = 'dfchen6@gmail.com'
      or exists (
        select 1 from recipe_shares
        where recipe_shares.recipe_id = recipes.id
        and recipe_shares.email = auth.jwt() ->> 'email'
      )
    )
  );
$$;

-- Recipes: read only if public, shared with you, or you're the admin; admin-only writes
create policy "read visible recipes" on recipes
  for select using (recipe_is_visible(id));

create policy "admin can write recipes" on recipes
  for all using (auth.jwt() ->> 'email' = 'dfchen6@gmail.com')
  with check (auth.jwt() ->> 'email' = 'dfchen6@gmail.com');

-- Ingredients inherit their recipe's visibility
create policy "read ingredients of visible recipes" on ingredients
  for select using (recipe_is_visible(recipe_id));

create policy "admin can write ingredients" on ingredients
  for all using (auth.jwt() ->> 'email' = 'dfchen6@gmail.com')
  with check (auth.jwt() ->> 'email' = 'dfchen6@gmail.com');

-- Shares: only the admin manages who a recipe is shared with
create policy "admin can manage recipe shares" on recipe_shares
  for all using (auth.jwt() ->> 'email' = 'dfchen6@gmail.com')
  with check (auth.jwt() ->> 'email' = 'dfchen6@gmail.com');

-- Meal plans: private to owner
create policy "users can manage own meal plans" on meal_plans
  for all using (auth.uid() = user_id);

-- Google tokens: private to owner
create policy "users manage own google tokens" on google_tokens
  for all using (auth.uid() = user_id);

-- Restaurants: public read, admin write
create policy "public can read restaurants" on restaurants
  for select using (true);

create policy "admin can write restaurants" on restaurants
  for all using (auth.jwt() ->> 'email' = 'dfchen6@gmail.com')
  with check (auth.jwt() ->> 'email' = 'dfchen6@gmail.com');

create policy "public can read restaurant dishes" on restaurant_dishes
  for select using (true);

create policy "admin can write restaurant dishes" on restaurant_dishes
  for all using (auth.jwt() ->> 'email' = 'dfchen6@gmail.com')
  with check (auth.jwt() ->> 'email' = 'dfchen6@gmail.com');

create policy "public can read restaurant photos" on restaurant_photos
  for select using (true);

create policy "admin can write restaurant photos" on restaurant_photos
  for all using (auth.jwt() ->> 'email' = 'dfchen6@gmail.com')
  with check (auth.jwt() ->> 'email' = 'dfchen6@gmail.com');

-- Storage: a public bucket holds restaurant photos and recipe covers.
insert into storage.buckets (id, name, public)
values ('restaurant-images', 'restaurant-images', true)
on conflict (id) do update set public = true;

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

-- Sample recipe
insert into recipes (slug, title_zh, title_en, description_zh, description_en, instructions, locale_primary, prep_time_mins, cook_time_mins, servings, tags)
values (
  'hong-shao-rou',
  '红烧肉',
  'Red-Braised Pork Belly',
  '经典的上海家常红烧肉，肥而不腻，入口即化。',
  'A classic Shanghai-style braised pork belly — rich, tender, and deeply savory.',
  '热锅加油，将五花肉煎至表面金黄。
加入冰糖，小火炒至焦糖色。
加入生抽、老抽翻炒均匀，add Shaoxing wine and stir.
加水没过肉，放入八角、姜片。
大火烧开后转小火，盖盖焖40分钟。
开盖大火收汁至浓稠，装盘即可。',
  'zh',
  15, 60, 4,
  array['猪肉', '上海', 'braised']
);

insert into ingredients (recipe_id, name_zh, name_en, quantity, unit, sort_order)
select id, '五花肉', 'pork belly', '500', 'g', 1 from recipes where slug = 'hong-shao-rou';
insert into ingredients (recipe_id, name_zh, name_en, quantity, unit, sort_order)
select id, '生抽', 'light soy sauce', '2', 'tbsp', 2 from recipes where slug = 'hong-shao-rou';
insert into ingredients (recipe_id, name_zh, name_en, quantity, unit, sort_order)
select id, '老抽', 'dark soy sauce', '1', 'tbsp', 3 from recipes where slug = 'hong-shao-rou';
insert into ingredients (recipe_id, name_zh, name_en, quantity, unit, sort_order)
select id, '冰糖', 'rock sugar', '30', 'g', 4 from recipes where slug = 'hong-shao-rou';
insert into ingredients (recipe_id, name_zh, name_en, quantity, unit, sort_order)
select id, '八角', 'star anise', '2', 'pieces', 5 from recipes where slug = 'hong-shao-rou';
insert into ingredients (recipe_id, name_zh, name_en, quantity, unit, sort_order)
select id, '绍兴酒', 'Shaoxing wine', '2', 'tbsp', 6 from recipes where slug = 'hong-shao-rou';
insert into ingredients (recipe_id, name_zh, name_en, quantity, unit, sort_order)
select id, '姜', 'ginger', '3', 'slices', 7 from recipes where slug = 'hong-shao-rou';
