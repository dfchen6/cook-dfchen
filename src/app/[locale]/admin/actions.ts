'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser, isAdminUser } from '@/lib/auth';
import { adminBucket } from '@/lib/firebase/admin';
import { publicStorageUrl } from '@/lib/storage-url';
import {
  deleteRecipeById,
  deleteRecipesByIds,
  listAllRecipes,
  updateRecipeFieldsBySlug,
  upsertRecipeBySlug,
} from '@/lib/data/recipes';
import { PRIVATE_RECIPES, privateRecipeCoverSource } from '@/lib/private-recipes';
import type { RecipeImportItem, RecipeWithIngredients } from '@/lib/types';

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) throw new Error('Unauthorized');
  return user!;
}

async function upsertOne(data: RecipeImportItem): Promise<{ error: string | null; slug?: string }> {
  try {
    const { slug } = await upsertRecipeBySlug(data);
    return { error: null, slug };
  } catch (err) {
    return { error: (err as Error).message };
  }
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
  await assertAdmin();
  const validationError = validateRecipeImport(data);
  if (validationError) return { error: validationError };
  const result = await upsertOne(data);
  if (!result.error) {
    revalidatePath('/');
    revalidatePath(`/recipes/${result.slug}`);
  }
  return result;
}

export async function batchImportRecipes(
  items: RecipeImportItem[]
): Promise<Array<{ slug: string; error: string | null }>> {
  await assertAdmin();
  const results: Array<{ slug: string; error: string | null }> = [];
  for (const item of items) {
    const validationError = validateRecipeImport(item);
    if (validationError) {
      results.push({ slug: item.slug || '(missing slug)', error: validationError });
      continue;
    }
    const result = await upsertOne(item);
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
  await assertAdmin();
  const selected = PRIVATE_RECIPES.filter((recipe) => slugs.includes(recipe.slug)).slice(0, 10);
  const failed: string[] = [];
  let synced = 0;

  for (const recipe of selected) {
    try {
      const response = await fetch(privateRecipeCoverSource(recipe.slug, recipe.title_en));
      if (!response.ok) throw new Error(`Image download failed (${response.status}).`);
      const objectPath = `recipes/${recipe.slug}/cover.jpg`;
      await adminBucket().file(objectPath).save(Buffer.from(await response.arrayBuffer()), {
        contentType: response.headers.get('content-type') ?? 'image/jpeg',
        metadata: { cacheControl: 'public, max-age=31536000' },
      });
      // Only touch the cover — the recipe may have been edited since it was imported.
      if (!(await updateRecipeFieldsBySlug(recipe.slug, { cover_image: publicStorageUrl(objectPath) }))) {
        throw new Error('Recipe not imported yet.');
      }
      synced += 1;
    } catch {
      failed.push(recipe.slug);
    }
  }

  revalidatePath('/');
  return { synced, failed };
}

export async function deleteRecipe(id: string): Promise<{ error: string | null }> {
  await assertAdmin();
  try {
    await deleteRecipeById(id);
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath('/');
  return { error: null };
}

export async function getRecipesForCsvExport(): Promise<RecipeWithIngredients[]> {
  await assertAdmin();
  return listAllRecipes();
}

export async function bulkDeleteRecipes(
  ids: string[]
): Promise<{ deleted: number; error: string | null }> {
  await assertAdmin();
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return { deleted: 0, error: 'No recipes selected.' };
  try {
    const deleted = await deleteRecipesByIds(uniqueIds);
    revalidatePath('/');
    return { deleted, error: null };
  } catch (err) {
    return { deleted: 0, error: (err as Error).message };
  }
}
