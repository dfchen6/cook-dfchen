'use server';

import { createClient } from '@/lib/supabase/server';
import { getOAuth2Client } from '@/lib/google';
import { google } from 'googleapis';
import { revalidatePath } from 'next/cache';

type SyncResult = { synced: number; error: string | null };

export async function syncToGoogleCalendar(locale: string): Promise<SyncResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { synced: 0, error: 'Not authenticated' };

  // Fetch stored tokens
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tokenRow } = await (supabase.from('google_tokens') as any)
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!tokenRow) return { synced: 0, error: 'Google Calendar not connected' };

  // Set up OAuth client with stored tokens
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expiry_date,
  });

  // Refresh tokens if needed and persist
  oauth2Client.on('tokens', async (tokens) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('google_tokens') as any).update({
      access_token: tokens.access_token ?? tokenRow.access_token,
      expiry_date: tokens.expiry_date ?? tokenRow.expiry_date,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Fetch upcoming meal plans without a google_event_id (not yet synced)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: plans, error: plansError } = await (supabase.from('meal_plans') as any)
    .select('*, recipes(title_zh, title_en, slug)')
    .eq('user_id', user.id)
    .gte('planned_date', new Date().toISOString().split('T')[0])
    .is('google_event_id', null)
    .order('planned_date', { ascending: true });

  if (plansError) return { synced: 0, error: plansError.message };
  if (!plans?.length) return { synced: 0, error: null };

  const MEAL_TIME: Record<string, { start: string; end: string }> = {
    breakfast: { start: '08:00', end: '09:00' },
    lunch:     { start: '12:00', end: '13:00' },
    dinner:    { start: '18:30', end: '19:30' },
    snack:     { start: '15:00', end: '15:30' },
  };

  let synced = 0;
  for (const plan of plans) {
    const times = MEAL_TIME[plan.meal_type] ?? MEAL_TIME.dinner;
    const date = plan.planned_date; // YYYY-MM-DD

    try {
      const event = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `${plan.recipes.title_zh} · ${plan.recipes.title_en}`,
          description: `${plan.meal_type.charAt(0).toUpperCase() + plan.meal_type.slice(1)}\nhttps://cook.dfchen.com/${locale}/recipes/${plan.recipes.slug}`,
          start: { dateTime: `${date}T${times.start}:00`, timeZone: 'America/Los_Angeles' },
          end:   { dateTime: `${date}T${times.end}:00`,   timeZone: 'America/Los_Angeles' },
        },
      });

      // Store the event ID so we don't duplicate on next sync
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('meal_plans') as any)
        .update({ google_event_id: event.data.id })
        .eq('id', plan.id);

      synced++;
    } catch {
      // Continue syncing other plans even if one fails
    }
  }

  revalidatePath(`/${locale}/meal-plan`);
  return { synced, error: null };
}
