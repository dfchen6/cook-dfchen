import 'server-only';

import { randomUUID } from 'node:crypto';
import { Timestamp, type DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { toIso } from '@/lib/data/recipes';
import type { Restaurant, RestaurantDish, RestaurantPhoto, RestaurantWithDetails } from '@/lib/types';

// Firestore layout: users/{uid}/restaurants/{restaurantId}
//   ...Restaurant fields, dishes: RestaurantDish[], photos: RestaurantPhoto[]
// Restaurants are a private per-user journal: every function is scoped to one uid,
// so there is no way to read another user's data through this module.

const col = (uid: string) => adminDb().collection('users').doc(uid).collection('restaurants');

function toRestaurant(uid: string, doc: DocumentSnapshot): RestaurantWithDetails {
  const d = doc.data()!;
  const byOrder = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;
  return {
    id: doc.id,
    user_id: uid,
    name: d.name,
    name_zh: d.name_zh ?? null,
    address: d.address ?? null,
    city: d.city ?? null,
    country: d.country ?? null,
    cuisine: d.cuisine ?? null,
    tags: d.tags ?? [],
    lat: d.lat ?? null,
    lng: d.lng ?? null,
    google_maps_url: d.google_maps_url ?? null,
    overall_rating: d.overall_rating ?? null,
    price_level: d.price_level ?? null,
    visited_at: d.visited_at ?? null,
    notes: d.notes ?? null,
    cover_image: d.cover_image ?? null,
    created_at: toIso(d.created_at),
    updated_at: toIso(d.updated_at),
    restaurant_dishes: ((d.dishes ?? []) as RestaurantDish[]).map((x) => ({ ...x, restaurant_id: doc.id })).sort(byOrder),
    restaurant_photos: ((d.photos ?? []) as RestaurantPhoto[]).map((x) => ({ ...x, restaurant_id: doc.id })).sort(byOrder),
  };
}

export type RestaurantFilters = { q?: string; city?: string; cuisine?: string; tag?: string };

const includesCi = (value: string | null | undefined, needle: string) =>
  (value ?? '').toLowerCase().includes(needle.toLowerCase());

/** The user's restaurants, newest visit first, filtered by search/city/cuisine/tag. */
export async function listRestaurants(uid: string, filters: RestaurantFilters = {}): Promise<RestaurantWithDetails[]> {
  const snap = await col(uid).get();
  const { q, city, cuisine, tag } = filters;
  return snap.docs
    .map((doc) => toRestaurant(uid, doc))
    .filter((r) => !q || includesCi(r.name, q) || includesCi(r.name_zh, q) || includesCi(r.notes, q))
    .filter((r) => !city || includesCi(r.city, city))
    .filter((r) => !cuisine || includesCi(r.cuisine, cuisine))
    .filter((r) => !tag || r.tags.includes(tag))
    .sort((a, b) => (b.visited_at ?? '').localeCompare(a.visited_at ?? ''));
}

export async function getRestaurant(uid: string, id: string): Promise<RestaurantWithDetails | null> {
  const doc = await col(uid).doc(id).get();
  return doc.exists ? toRestaurant(uid, doc) : null;
}

export type RestaurantWrite = Partial<Omit<Restaurant, 'id' | 'user_id' | 'created_at' | 'updated_at'>> & {
  name: string;
  dishes?: Array<Omit<RestaurantDish, 'id' | 'restaurant_id'> & { id?: string }>;
  photos?: Array<Omit<RestaurantPhoto, 'id' | 'restaurant_id'> & { id?: string }>;
};

/** Create (no id) or update (id must belong to uid). Returns null if updating a missing restaurant. */
export async function saveRestaurant(uid: string, id: string | undefined, data: RestaurantWrite): Promise<string | null> {
  const { dishes, photos, ...fields } = data;
  const now = Timestamp.now();
  const payload: Record<string, unknown> = { ...fields, updated_at: now };
  if (dishes !== undefined) payload.dishes = dishes.map((d) => ({ ...d, id: d.id ?? randomUUID() }));
  if (photos !== undefined) payload.photos = photos.map((p) => ({ ...p, id: p.id ?? randomUUID() }));

  if (id) {
    const ref = col(uid).doc(id);
    if (!(await ref.get()).exists) return null;
    await ref.update(payload);
    return id;
  }
  const ref = col(uid).doc(randomUUID());
  await ref.set({ dishes: [], photos: [], tags: [], ...payload, created_at: now });
  return ref.id;
}

export async function deleteRestaurant(uid: string, id: string) {
  await col(uid).doc(id).delete();
}
