import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { getGoogleTokens, listUpcomingMealPlans } from '@/lib/data/meal-plans';
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
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/meal-plan`)}`);

  const [plans, tokenRow] = await Promise.all([
    listUpcomingMealPlans(user.id),
    getGoogleTokens(user.id),
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
          ✓ Google Calendar connected! Click &quot;Sync&quot; to push your meal plans.
        </div>
      )}

      <MealPlanList plans={plans ?? []} locale={locale} />
    </div>
  );
}
