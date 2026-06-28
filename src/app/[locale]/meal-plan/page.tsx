import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import MealPlanList from '@/components/MealPlanList';

export default async function MealPlanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('mealPlan');
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: plans } = await supabase
    .from('meal_plans')
    .select('*, recipes(id, slug, title_zh, title_en, cover_image)')
    .eq('user_id', user.id)
    .gte('planned_date', new Date().toISOString().split('T')[0])
    .order('planned_date', { ascending: true })
    .order('meal_type', { ascending: true });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <MealPlanList plans={plans ?? []} locale={locale} />
    </div>
  );
}
