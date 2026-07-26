'use server';

import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAIL } from '@/lib/admin';
import { revalidatePath } from 'next/cache';
import { PRIVATE_RECIPES, privateRecipeCoverSource } from '@/lib/private-recipes';
import type { RecipeImportItem, RecipeWithIngredients } from '@/lib/supabase/types';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    throw new Error('Unauthorized');
  }
  return supabase;
}

async function upsertRecipeWithClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: RecipeImportItem
): Promise<{ error: string | null; slug?: string }> {
  const { ingredients, ...fields } = data;

  const recipeRow = {
    slug: fields.slug,
    title_zh: fields.title_zh,
    title_en: fields.title_en,
    description_zh: fields.description_zh ?? null,
    description_en: fields.description_en ?? null,
    instructions: fields.instructions ?? fields.instructions_zh ?? fields.instructions_en ?? '',
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

  return { error: null, slug: recipe.slug };
}

function validateRecipeImport(item: RecipeImportItem): string | null {
  if (
    typeof item.slug !== 'string' ||
    typeof item.title_zh !== 'string' ||
    typeof item.title_en !== 'string' ||
    !item.slug.trim() ||
    !item.title_zh.trim() ||
    !item.title_en.trim()
  ) {
    return 'Slug and both titles are required.';
  }
  if (item.locale_primary && item.locale_primary !== 'zh' && item.locale_primary !== 'en') {
    return 'locale_primary must be "zh" or "en".';
  }
  if (!Array.isArray(item.ingredients)) {
    return 'ingredients must be an array.';
  }
  if (item.ingredients.some((ingredient) =>
    typeof ingredient.name_zh !== 'string' ||
    typeof ingredient.name_en !== 'string' ||
    typeof ingredient.quantity !== 'string' ||
    typeof ingredient.unit !== 'string' ||
    !ingredient.name_zh.trim() ||
    !ingredient.name_en.trim() ||
    !ingredient.quantity.trim()
  )) {
    return 'Each ingredient requires Chinese name, English name, and quantity.';
  }
  return null;
}

export async function upsertRecipe(data: RecipeImportItem): Promise<{ error: string | null; slug?: string }> {
  const supabase = await assertAdmin();
  const validationError = validateRecipeImport(data);
  if (validationError) return { error: validationError };
  const result = await upsertRecipeWithClient(supabase, data);

  if (!result.error && result.slug) {
    revalidatePath('/');
    revalidatePath(`/recipes/${result.slug}`);
  }

  return result;
}

export async function batchImportRecipes(
  items: RecipeImportItem[]
): Promise<Array<{ slug: string; error: string | null }>> {
  const supabase = await assertAdmin();
  const results: Array<{ slug: string; error: string | null }> = [];
  for (const item of items) {
    const validationError = validateRecipeImport(item);
    if (validationError) {
      results.push({ slug: item.slug || '(missing slug)', error: validationError });
      continue;
    }
    const result = await upsertRecipeWithClient(supabase, item);
    results.push({ slug: item.slug, error: result.error });
  }
  revalidatePath('/');
  return results;
}

export async function importPrivateRecipes(): Promise<{ imported: number; failed: number }> {
  const results = await batchImportRecipes(PRIVATE_RECIPES);
  return {
    imported: results.filter((result) => !result.error).length,
    failed: results.filter((result) => result.error).length,
  };
}

export async function syncPrivateRecipeCoverBatch(
  slugs: string[]
): Promise<{ synced: number; failed: string[] }> {
  const supabase = await assertAdmin();
  const selected = PRIVATE_RECIPES.filter((recipe) => slugs.includes(recipe.slug)).slice(0, 10);
  const failed: string[] = [];
  let synced = 0;

  for (const recipe of selected) {
    try {
      const response = await fetch(privateRecipeCoverSource(recipe.slug, recipe.title_en));
      if (!response.ok) throw new Error(`Image download failed (${response.status}).`);
      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(`recipes/${recipe.slug}/cover.jpg`, await response.arrayBuffer(), {
          contentType: response.headers.get('content-type') ?? 'image/jpeg',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('recipes') as any)
        .update({ cover_image: recipe.cover_image })
        .eq('slug', recipe.slug);
      if (updateError) throw updateError;
      synced += 1;
    } catch {
      failed.push(recipe.slug);
    }
  }

  revalidatePath('/');
  return { synced, failed };
}

export async function deleteRecipe(id: string): Promise<{ error: string | null }> {
  const supabase = await assertAdmin();
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/');
  return { error: null };
}

export async function getRecipesForCsvExport(): Promise<RecipeWithIngredients[]> {
  const supabase = await assertAdmin();
  const { data, error } = await supabase
    .from('recipes')
    .select('*, ingredients(*), recipe_shares(email)')
    .order('created_at', { ascending: false })
    .order('sort_order', { referencedTable: 'ingredients', ascending: true })
    .returns<RecipeWithIngredients[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function bulkDeleteRecipes(
  ids: string[]
): Promise<{ deleted: number; error: string | null }> {
  const supabase = await assertAdmin();
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return { deleted: 0, error: 'No recipes selected.' };

  const { data, error } = await supabase
    .from('recipes')
    .delete()
    .in('id', uniqueIds)
    .select('id');
  if (error) return { deleted: 0, error: error.message };

  revalidatePath('/');
  return { deleted: data?.length ?? 0, error: null };
}
