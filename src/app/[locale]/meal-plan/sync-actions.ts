'use server';

import { getCurrentUser } from '@/lib/auth';
import { getGoogleTokens, listUpcomingMealPlans, saveGoogleTokens, setMealPlanEventId } from '@/lib/data/meal-plans';
import { getOAuth2Client } from '@/lib/google';
import { google } from 'googleapis';
import { revalidatePath } from 'next/cache';

type SyncResult = { synced: number; error: string | null };

export async function syncToGoogleCalendar(locale: string): Promise<SyncResult> {
  const user = await getCurrentUser();
  if (!user) return { synced: 0, error: 'Not authenticated' };

  // Fetch stored tokens
  const tokenRow = await getGoogleTokens(user.id);

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
    await saveGoogleTokens(user.id, {
      access_token: tokens.access_token ?? tokenRow.access_token,
      expiry_date: tokens.expiry_date ?? tokenRow.expiry_date,
    });
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Fetch upcoming meal plans without a google_event_id (not yet synced)
  let plans;
  try {
    plans = await listUpcomingMealPlans(user.id, { unsyncedOnly: true });
  } catch (err) {
    return { synced: 0, error: (err as Error).message };
  }
  if (!plans.length) return { synced: 0, error: null };

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
          summary: `${plan.recipes!.title_zh} · ${plan.recipes!.title_en}`,
          description: `${plan.meal_type.charAt(0).toUpperCase() + plan.meal_type.slice(1)}\nhttps://cook.dfchen.com/${locale}/recipes/${plan.recipes!.slug}`,
          start: { dateTime: `${date}T${times.start}:00`, timeZone: 'America/Los_Angeles' },
          end:   { dateTime: `${date}T${times.end}:00`,   timeZone: 'America/Los_Angeles' },
        },
      });

      // Store the event ID so we don't duplicate on next sync
      await setMealPlanEventId(user.id, plan.id, event.data.id ?? null);

      synced++;
    } catch {
      // Continue syncing other plans even if one fails
    }
  }

  revalidatePath(`/${locale}/meal-plan`);
  return { synced, error: null };
}
