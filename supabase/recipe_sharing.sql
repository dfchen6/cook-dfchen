-- Recipe visibility: public by default, or restricted to specific shared emails
alter table recipes add column if not exists is_public boolean not null default true;

-- Per-recipe allowlist of gmail accounts that can view a private recipe
create table if not exists recipe_shares (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references recipes(id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now(),
  unique (recipe_id, email)
);

alter table recipe_shares enable row level security;

-- Only the admin manages who a recipe is shared with
drop policy if exists "admin can manage recipe shares" on recipe_shares;
create policy "admin can manage recipe shares" on recipe_shares
  for all using (auth.jwt() ->> 'email' = 'dfchen6@gmail.com')
  with check (auth.jwt() ->> 'email' = 'dfchen6@gmail.com');

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

-- Recipes: read only if public, shared with you, or you're the admin
drop policy if exists "public can read recipes" on recipes;
drop policy if exists "read visible recipes" on recipes;
create policy "read visible recipes" on recipes
  for select using (recipe_is_visible(id));

-- Ingredients inherit their recipe's visibility
drop policy if exists "public can read ingredients" on ingredients;
drop policy if exists "read ingredients of visible recipes" on ingredients;
create policy "read ingredients of visible recipes" on ingredients
  for select using (recipe_is_visible(recipe_id));

-- Writes: admin only (previously any authenticated user could write directly via the API,
-- which would let a signed-in non-admin bypass the sharing restriction above)
drop policy if exists "authenticated can write recipes" on recipes;
create policy "admin can write recipes" on recipes
  for all using (auth.jwt() ->> 'email' = 'dfchen6@gmail.com')
  with check (auth.jwt() ->> 'email' = 'dfchen6@gmail.com');

drop policy if exists "authenticated can write ingredients" on ingredients;
create policy "admin can write ingredients" on ingredients
  for all using (auth.jwt() ->> 'email' = 'dfchen6@gmail.com')
  with check (auth.jwt() ->> 'email' = 'dfchen6@gmail.com');
