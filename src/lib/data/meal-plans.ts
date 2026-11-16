import 'server-only';

import { randomUUID } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { getRecipesByIds, toIso } from '@/lib/data/recipes';
import type { MealPlan } from '@/lib/types';

// Firestore layout:
//   users/{uid}/mealPlans/{planId}       MealPlan fields (recipe_id references recipes/{id})
//   users/{uid}/private/googleTokens     Google Calendar OAuth tokens (server-only)

const userDoc = (uid: string) => adminDb().collection('users').doc(uid);
const plansCol = (uid: string) => userDoc(uid).collection('mealPlans');
const tokensDoc = (uid: string) => userDoc(uid).collection('private').doc('googleTokens');

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const today = () => new Date().toISOString().split('T')[0];

export type MealPlanWithRecipe = MealPlan & {
  recipes: { id: string; slug: string; title_zh: string; title_en: string; cover_image: string | null } | null;
};

/**
 * Upcoming plans (today onwards) joined with their recipe. Plans whose recipe was deleted
 * are dropped, matching the old ON DELETE CASCADE behaviour.
 */
export async function listUpcomingMealPlans(uid: string, opts: { unsyncedOnly?: boolean } = {}): Promise<MealPlanWithRecipe[]> {
  const snap = await plansCol(uid).where('planned_date', '>=', today()).get();
  const plans: MealPlan[] = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      user_id: uid,
      recipe_id: d.recipe_id,
      planned_date: d.planned_date,
      meal_type: d.meal_type,
      notes: d.notes ?? null,
      google_event_id: d.google_event_id ?? null,
      created_at: toIso(d.created_at),
    };
  });
  const recipes = await getRecipesByIds(plans.map((p) => p.recipe_id));
  return plans
    .filter((p) => recipes.has(p.recipe_id))
    .filter((p) => !opts.unsyncedOnly || !p.google_event_id)
    .map((p) => {
      const r = recipes.get(p.recipe_id)!;
      return { ...p, recipes: { id: r.id, slug: r.slug, title_zh: r.title_zh, title_en: r.title_en, cover_image: r.cover_image } };
    })
    .sort((a, b) => a.planned_date.localeCompare(b.planned_date) || MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type));
}

export async function addMealPlan(
  uid: string,
  plan: Pick<MealPlan, 'recipe_id' | 'planned_date' | 'meal_type'> & { notes?: string | null }
): Promise<string> {
  const ref = plansCol(uid).doc(randomUUID());
  await ref.set({ ...plan, notes: plan.notes ?? null, google_event_id: null, created_at: Timestamp.now() });
  return ref.id;
}

export async function getMealPlan(uid: string, id: string) {
  const doc = await plansCol(uid).doc(id).get();
  return doc.exists ? { id: doc.id, google_event_id: (doc.data()!.google_event_id as string | null) ?? null } : null;
}

export async function deleteMealPlan(uid: string, id: string) {
  await plansCol(uid).doc(id).delete();
}

export async function setMealPlanEventId(uid: string, id: string, eventId: string | null) {
  await plansCol(uid).doc(id).update({ google_event_id: eventId });
}

export type GoogleTokens = { access_token: string; refresh_token: string | null; expiry_date: number | null };

export async function getGoogleTokens(uid: string): Promise<GoogleTokens | null> {
  const doc = await tokensDoc(uid).get();
  return doc.exists ? (doc.data() as GoogleTokens) : null;
}

export async function saveGoogleTokens(uid: string, tokens: Partial<GoogleTokens>) {
  await tokensDoc(uid).set({ ...tokens, updated_at: Timestamp.now() }, { merge: true });
}
