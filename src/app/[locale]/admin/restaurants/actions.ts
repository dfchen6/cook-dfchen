'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const ADMIN_EMAIL = 'dfchen6@gmail.com';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) throw new Error('Unauthorized');
  return supabase;
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
  const supabase = await assertAdmin();
  const { dishes, photos, id, ...fields } = data;

  let restaurantId = id;

  if (restaurantId) {
    // Update existing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('restaurants') as any)
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', restaurantId);
    if (error) return { error: error.message };
  } else {
    // Insert new
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase.from('restaurants') as any)
      .insert(fields)
      .select()
      .single();
    if (error) return { error: error.message };
    restaurantId = row.id;
  }

  // Replace dishes
  if (dishes !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('restaurant_dishes') as any).delete().eq('restaurant_id', restaurantId);
    if (dishes.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('restaurant_dishes') as any).insert(
        dishes.map((d, i) => ({
          restaurant_id: restaurantId,
          name: d.name,
          name_zh: d.name_zh ?? null,
          description: d.description ?? null,
          image_url: d.image_url ?? null,
          rating: d.rating ?? null,
          recommended: d.recommended ?? true,
          sort_order: d.sort_order ?? i,
        }))
      );
      if (error) return { error: error.message };
    }
  }

  // Replace photos
  if (photos !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('restaurant_photos') as any).delete().eq('restaurant_id', restaurantId);
    if (photos.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('restaurant_photos') as any).insert(
        photos.map((p, i) => ({
          restaurant_id: restaurantId,
          image_url: p.image_url,
          caption: p.caption ?? null,
          sort_order: p.sort_order ?? i,
        }))
      );
      if (error) return { error: error.message };
    }
  }

  revalidatePath('/restaurants');
  revalidatePath(`/restaurants/${restaurantId}`);
  return { error: null, id: restaurantId };
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
  const supabase = await assertAdmin();
  const { error } = await supabase.from('restaurants').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/restaurants');
  return { error: null };
}
