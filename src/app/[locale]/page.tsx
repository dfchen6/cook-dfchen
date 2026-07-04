import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import RecipeFilters from '@/components/RecipeFilters';
import type { Recipe } from '@/lib/supabase/types';

type RecipeCardData = Pick<Recipe, 'id' | 'slug' | 'title_zh' | 'title_en' | 'description_zh' | 'description_en' | 'cover_image' | 'tags' | 'prep_time_mins' | 'cook_time_mins'>;

export default async function RecipeListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('recipelist');
  const supabase = await createClient();

  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, slug, title_zh, title_en, description_zh, description_en, cover_image, tags, prep_time_mins, cook_time_mins')
    .order('created_at', { ascending: false })
    .returns<RecipeCardData[]>();

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <RecipeFilters
        recipes={recipes ?? []}
        locale={locale}
        searchPlaceholder={t('searchPlaceholder')}
        emptyText={t('noResults')}
        allTagsLabel={t('allTags')}
      />
    </div>
  );
}
