'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { RecipeImportItem } from '@/lib/supabase/types';

const ADMIN_EMAIL = 'dfchen6@gmail.com';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    throw new Error('Unauthorized');
  }
  return supabase;
}

export async function upsertRecipe(data: RecipeImportItem): Promise<{ error: string | null; slug?: string }> {
  const supabase = await assertAdmin();

  const { ingredients, ...fields } = data;

  const recipeRow = {
    slug: fields.slug,
    title_zh: fields.title_zh,
    title_en: fields.title_en,
    description_zh: fields.description_zh ?? null,
    description_en: fields.description_en ?? null,
    instructions: fields.instructions_zh ?? fields.instructions_en ?? '',
    instructions_zh: fields.instructions_zh ?? null,
    instructions_en: fields.instructions_en ?? null,
    locale_primary: fields.locale_primary ?? 'zh',
    cover_image: fields.cover_image ?? null,
    youtube_url: fields.youtube_url ?? null,
    prep_time_mins: fields.prep_time_mins ?? null,
    cook_time_mins: fields.cook_time_mins ?? null,
    servings: fields.servings ?? null,
    tags: fields.tags ?? [],
    is_public: fields.is_public ?? true,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recipe, error } = await (supabase.from('recipes') as any)
    .upsert(recipeRow, { onConflict: 'slug' })
    .select()
    .single();

  if (error) return { error: error.message };

  // Replace ingredients
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('ingredients') as any).delete().eq('recipe_id', recipe.id);

  if (ingredients?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: ingError } = await (supabase.from('ingredients') as any).insert(
      ingredients.map((ing, i) => ({
        recipe_id: recipe.id,
        name_zh: ing.name_zh,
        name_en: ing.name_en,
        quantity: ing.quantity,
        unit: ing.unit,
        sort_order: ing.sort_order ?? i,
      }))
    );
    if (ingError) return { error: ingError.message };
  }

  // Replace shares
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('recipe_shares') as any).delete().eq('recipe_id', recipe.id);

  const sharedWith = [...new Set((fields.shared_with ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (sharedWith.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: shareError } = await (supabase.from('recipe_shares') as any).insert(
      sharedWith.map((email) => ({ recipe_id: recipe.id, email }))
    );
    if (shareError) return { error: shareError.message };
  }

  revalidatePath('/');
  revalidatePath(`/recipes/${recipe.slug}`);
  return { error: null, slug: recipe.slug };
}

export async function batchImportRecipes(
  items: RecipeImportItem[]
): Promise<Array<{ slug: string; error: string | null }>> {
  const results: Array<{ slug: string; error: string | null }> = [];
  for (const item of items) {
    const result = await upsertRecipe(item);
    results.push({ slug: item.slug, error: result.error });
  }
  return results;
}

export async function deleteRecipe(id: string): Promise<{ error: string | null }> {
  const supabase = await assertAdmin();
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/');
  return { error: null };
}
