import 'server-only';

import { randomUUID } from 'node:crypto';
import { Timestamp, type DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { isAdminUser, verifiedEmail, type SessionUser } from '@/lib/auth';
import type { Ingredient, Recipe, RecipeImportItem, RecipeWithIngredients } from '@/lib/types';

// Firestore layout: recipes/{recipeId}
//   ...Recipe fields, ingredients: Ingredient[], shared_with: string[] (lowercased emails),
//   created_at / updated_at: Timestamp
// Authorization (formerly Supabase RLS) is enforced here; Firestore rules deny all client access.

const recipesCol = () => adminDb().collection('recipes');

export function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date(0).toISOString();
}

function toRecipe(doc: DocumentSnapshot): RecipeWithIngredients & { shared_with: string[] } {
  const d = doc.data()!;
  const ingredients = ((d.ingredients ?? []) as Ingredient[])
    .map((ing, i) => ({ ...ing, recipe_id: doc.id, sort_order: ing.sort_order ?? i }))
    .sort((a, b) => a.sort_order - b.sort_order);
  const shared_with: string[] = d.shared_with ?? [];
  return {
    id: doc.id,
    slug: d.slug,
    title_zh: d.title_zh,
    title_en: d.title_en,
    description_zh: d.description_zh ?? null,
    description_en: d.description_en ?? null,
    instructions: d.instructions ?? '',
    instructions_zh: d.instructions_zh ?? null,
    instructions_en: d.instructions_en ?? null,
    locale_primary: d.locale_primary ?? 'zh',
    cover_image: d.cover_image ?? null,
    youtube_url: d.youtube_url ?? null,
    prep_time_mins: d.prep_time_mins ?? null,
    cook_time_mins: d.cook_time_mins ?? null,
    servings: d.servings ?? null,
    tags: d.tags ?? [],
    is_public: d.is_public ?? true,
    created_at: toIso(d.created_at),
    updated_at: toIso(d.updated_at),
    ingredients,
    shared_with,
    recipe_shares: shared_with.map((email) => ({ email })),
  };
}

const newestFirst = (a: Recipe, b: Recipe) => b.created_at.localeCompare(a.created_at);

function canView(recipe: { is_public: boolean; shared_with: string[] }, user: SessionUser | null): boolean {
  if (recipe.is_public || isAdminUser(user)) return true;
  const email = verifiedEmail(user);
  return !!email && recipe.shared_with.includes(email);
}

/** Recipes the user may see: public, shared with their verified email, or everything for the admin. */
export async function listVisibleRecipes(user: SessionUser | null): Promise<RecipeWithIngredients[]> {
  if (isAdminUser(user)) return listAllRecipes();
  const email = verifiedEmail(user);
  const snaps = await Promise.all([
    recipesCol().where('is_public', '==', true).get(),
    email ? recipesCol().where('shared_with', 'array-contains', email).get() : null,
  ]);
  const byId = new Map<string, RecipeWithIngredients>();
  for (const snap of snaps) snap?.docs.forEach((doc) => byId.set(doc.id, toRecipe(doc)));
  return [...byId.values()].sort(newestFirst);
}

/** Admin-only listing (callers must check isAdminUser). */
export async function listAllRecipes(): Promise<RecipeWithIngredients[]> {
  const snap = await recipesCol().get();
  return snap.docs.map(toRecipe).sort(newestFirst);
}

async function findDocBySlug(slug: string) {
  const snap = await recipesCol().where('slug', '==', slug).limit(1).get();
  return snap.docs[0] ?? null;
}

export async function getRecipeBySlugRaw(slug: string) {
  const doc = await findDocBySlug(slug);
  return doc ? toRecipe(doc) : null;
}

/** null if missing or not visible to this user. */
export async function getVisibleRecipeBySlug(slug: string, user: SessionUser | null) {
  const recipe = await getRecipeBySlugRaw(slug);
  return recipe && canView(recipe, user) ? recipe : null;
}

export async function getRecipeById(id: string) {
  const doc = await recipesCol().doc(id).get();
  return doc.exists ? toRecipe(doc) : null;
}

export async function getVisibleRecipeById(id: string, user: SessionUser | null) {
  const recipe = await getRecipeById(id);
  return recipe && canView(recipe, user) ? recipe : null;
}

/** Fetch several recipes by id (missing ids are skipped). */
export async function getRecipesByIds(ids: string[]): Promise<Map<string, RecipeWithIngredients>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const result = new Map<string, RecipeWithIngredients>();
  if (!unique.length) return result;
  const docs = await adminDb().getAll(...unique.map((id) => recipesCol().doc(id)));
  docs.filter((d) => d.exists).forEach((d) => result.set(d.id, toRecipe(d)));
  return result;
}

export function normalizeEmails(emails: string[] | undefined): string[] {
  return [...new Set((emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

/** Create or update a recipe matched by slug. Admin-only (callers must check). */
export async function upsertRecipeBySlug(data: RecipeImportItem): Promise<{ id: string; slug: string }> {
  const { ingredients, shared_with, ...fields } = data;
  const existing = await findDocBySlug(fields.slug);
  const ref = existing?.ref ?? recipesCol().doc(randomUUID());
  const now = Timestamp.now();
  const previous = existing ? ((existing.data()?.ingredients ?? []) as Ingredient[]) : [];

  await ref.set({
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
    shared_with: normalizeEmails(shared_with),
    ingredients: (ingredients ?? []).map((ing, i) => ({
      id: previous[i]?.id ?? randomUUID(),
      name_zh: ing.name_zh,
      name_en: ing.name_en,
      quantity: ing.quantity,
      unit: ing.unit ?? '',
      sort_order: ing.sort_order ?? i,
    })),
    created_at: existing?.data()?.created_at ?? now,
    updated_at: now,
  });
  return { id: ref.id, slug: fields.slug };
}

/** Partial update by slug (used by MCP). Returns false if the recipe doesn't exist. */
export async function updateRecipeFieldsBySlug(
  slug: string,
  fields: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at'>> & { shared_with?: string[] }
): Promise<boolean> {
  const doc = await findDocBySlug(slug);
  if (!doc) return false;
  const update: Record<string, unknown> = { ...fields, updated_at: Timestamp.now() };
  if (fields.shared_with) update.shared_with = normalizeEmails(fields.shared_with);
  await doc.ref.update(update);
  return true;
}

export async function deleteRecipeById(id: string) {
  await recipesCol().doc(id).delete();
}

export async function deleteRecipeBySlug(slug: string): Promise<boolean> {
  const doc = await findDocBySlug(slug);
  if (!doc) return false;
  await doc.ref.delete();
  return true;
}

export async function deleteRecipesByIds(ids: string[]): Promise<number> {
  const refs = await adminDb().getAll(...ids.map((id) => recipesCol().doc(id)));
  const existing = refs.filter((d) => d.exists);
  const batch = adminDb().batch();
  existing.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return existing.length;
}
