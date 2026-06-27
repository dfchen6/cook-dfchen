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
  prep_time_mins integer,
  cook_time_mins integer,
  servings      integer,
  tags          text[] default '{}',
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

-- Meal plans (auth required)
create table meal_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  recipe_id    uuid not null references recipes(id) on delete cascade,
  planned_date date not null,
  meal_type    text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  notes        text,
  created_at   timestamptz not null default now()
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

-- Row Level Security
alter table recipes enable row level security;
alter table ingredients enable row level security;
alter table meal_plans enable row level security;

-- Recipes: public read, authenticated write
create policy "public can read recipes" on recipes
  for select using (true);

create policy "authenticated can write recipes" on recipes
  for all using (auth.role() = 'authenticated');

-- Ingredients: public read, authenticated write
create policy "public can read ingredients" on ingredients
  for select using (true);

create policy "authenticated can write ingredients" on ingredients
  for all using (auth.role() = 'authenticated');

-- Meal plans: private to owner
create policy "users can manage own meal plans" on meal_plans
  for all using (auth.uid() = user_id);

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
