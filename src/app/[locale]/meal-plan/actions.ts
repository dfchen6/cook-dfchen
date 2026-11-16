'use server';

import { getCurrentUser } from '@/lib/auth';
import { getOAuth2Client } from '@/lib/google';
import { addMealPlan, deleteMealPlan, getGoogleTokens, getMealPlan } from '@/lib/data/meal-plans';
import { getVisibleRecipeById } from '@/lib/data/recipes';
import { google } from 'googleapis';
import { revalidatePath } from 'next/cache';
import type { MealPlan } from '@/lib/types';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export async function addToMealPlan(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };

  const recipe_id = formData.get('recipe_id') as string;
  const planned_date = formData.get('planned_date') as string;
  const meal_type = formData.get('meal_type') as string;

  // Validate date, meal type, and recipe visibility before writing to Firestore.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planned_date ?? '')) return { error: 'Invalid date' };
  if (!MEAL_TYPES.includes(meal_type)) return { error: 'Invalid meal type' };
  if (!recipe_id || !(await getVisibleRecipeById(recipe_id, user))) return { error: 'Recipe not found' };

  try {
    await addMealPlan(user.id, { recipe_id, planned_date, meal_type: meal_type as MealPlan['meal_type'] });
  } catch (err) {
    return { error: (err as Error).message };
  }
  revalidatePath('/meal-plan');
  return { error: null };
}

export async function removeFromMealPlan(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not authenticated' };

  const plan = await getMealPlan(user.id, id);
  try {
    await deleteMealPlan(user.id, id);
  } catch (err) {
    return { error: (err as Error).message };
  }

  // Best-effort: also remove the synced Google Calendar event
  if (plan?.google_event_id) {
    const tokenRow = await getGoogleTokens(user.id);
    if (tokenRow) {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
          access_token: tokenRow.access_token,
          refresh_token: tokenRow.refresh_token,
          expiry_date: tokenRow.expiry_date,
        });
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        await calendar.events.delete({ calendarId: 'primary', eventId: plan.google_event_id });
      } catch {
        // Plan is already removed — a stale calendar event is not worth failing over
      }
    }
  }

  revalidatePath('/meal-plan');
  return { error: null };
}
