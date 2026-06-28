import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import MealPlanList from '@/components/MealPlanList';
import GoogleCalendarSync from '@/components/GoogleCalendarSync';

export default async function MealPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ connected?: string }>;
}) {
  const { locale } = await params;
  const { connected: justConnected } = await searchParams;
  const t = await getTranslations('mealPlan');
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [{ data: plans }, { data: tokenRow }] = await Promise.all([
    supabase
      .from('meal_plans')
      .select('*, recipes(id, slug, title_zh, title_en, cover_image)')
      .eq('user_id', user.id)
      .gte('planned_date', new Date().toISOString().split('T')[0])
      .order('planned_date', { ascending: true })
      .order('meal_type', { ascending: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .returns<any[]>(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('google_tokens') as any)
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const googleConnected = !!tokenRow;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <GoogleCalendarSync locale={locale} connected={googleConnected} />
      </div>

      {justConnected && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Google Calendar connected! Click "Sync" to push your meal plans.
        </div>
      )}

      <MealPlanList plans={plans ?? []} locale={locale} />
    </div>
  );
}
