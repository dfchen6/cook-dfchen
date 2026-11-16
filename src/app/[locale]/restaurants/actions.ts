'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { deleteRestaurant as deleteRestaurantDoc, saveRestaurant } from '@/lib/data/restaurants';

// Restaurants are a private per-user journal: every action is scoped to the
// signed-in user's own users/{uid}/restaurants collection.
async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export type DishInput = {
  id?: string;
  name: string;
  name_zh?: string | null;
  description?: string | null;
  image_url?: string | null;
  rating?: number | null;
  recommended?: boolean;
  sort_order?: number;
};

export type PhotoInput = {
  id?: string;
  image_url: string;
  caption?: string | null;
  sort_order?: number;
};

export type RestaurantInput = {
  id?: string;
  name: string;
  name_zh?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  cuisine?: string | null;
  tags?: string[];
  lat?: number | null;
  lng?: number | null;
  google_maps_url?: string | null;
  overall_rating?: number | null;
  price_level?: number | null;
  visited_at?: string | null;
  notes?: string | null;
  cover_image?: string | null;
  dishes?: DishInput[];
  photos?: PhotoInput[];
};

export async function upsertRestaurant(data: RestaurantInput): Promise<{ error: string | null; id?: string }> {
  const user = await requireUser();
  const { dishes, photos, id, ...fields } = data;
  // Ownership always comes from the session, never from client input (e.g. batch-import JSON).
  delete (fields as { user_id?: unknown }).user_id;

  // Coerce float ratings/price to integers (they were SMALLINT columns)
  if (fields.overall_rating != null) fields.overall_rating = Math.round(fields.overall_rating);
  if (fields.price_level != null) fields.price_level = Math.round(fields.price_level);

  try {
    const savedId = await saveRestaurant(user.id, id, {
      ...fields,
      dishes: dishes?.map((d, i) => ({
        id: d.id,
        name: d.name,
        name_zh: d.name_zh ?? null,
        description: d.description ?? null,
        image_url: d.image_url ?? null,
        rating: d.rating != null ? Math.round(d.rating) : null,
        recommended: d.recommended ?? true,
        sort_order: d.sort_order ?? i,
      })),
      photos: photos?.map((p, i) => ({
        id: p.id,
        image_url: p.image_url,
        caption: p.caption ?? null,
        sort_order: p.sort_order ?? i,
      })),
    });
    if (!savedId) return { error: 'Restaurant not found' };
    revalidatePath('/restaurants');
    revalidatePath(`/restaurants/${savedId}`);
    return { error: null, id: savedId };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function batchImportRestaurants(
  items: RestaurantInput[]
): Promise<Array<{ name: string; error: string | null }>> {
  const results: Array<{ name: string; error: string | null }> = [];
  for (const item of items) {
    const result = await upsertRestaurant(item);
    results.push({ name: item.name, error: result.error });
  }
  return results;
}

export async function deleteRestaurant(id: string): Promise<{ error: string | null }> {
  const user = await requireUser();
  try {
    await deleteRestaurantDoc(user.id, id);
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath('/restaurants');
  return { error: null };
}
