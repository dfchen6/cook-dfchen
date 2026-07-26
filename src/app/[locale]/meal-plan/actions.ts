'use server';

import { createClient } from '@/lib/supabase/server';
import { getOAuth2Client } from '@/lib/google';
import { google } from 'googleapis';
import { revalidatePath } from 'next/cache';

export async function addToMealPlan(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const recipe_id = formData.get('recipe_id') as string;
  const planned_date = formData.get('planned_date') as string;
  const meal_type = formData.get('meal_type') as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('meal_plans') as any).insert({
    user_id: user.id,
    recipe_id,
    planned_date,
    meal_type,
  });

  if (error) return { error: error.message };
  revalidatePath('/meal-plan');
  return { error: null };
}

export async function removeFromMealPlan(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: plan } = await supabase
    .from('meal_plans')
    .select('google_event_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .returns<{ google_event_id: string | null }[]>()
    .single();

  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  // Best-effort: also remove the synced Google Calendar event
  if (plan?.google_event_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tokenRow } = await (supabase.from('google_tokens') as any)
      .select('*')
      .eq('user_id', user.id)
      .single();

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
