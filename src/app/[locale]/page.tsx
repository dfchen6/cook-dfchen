import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { listVisibleRecipes } from '@/lib/data/recipes';
import RecipeFilters from '@/components/RecipeFilters';
import type { Recipe } from '@/lib/types';

type RecipeCardData = Pick<Recipe, 'id' | 'slug' | 'title_zh' | 'title_en' | 'description_zh' | 'description_en' | 'cover_image' | 'tags' | 'prep_time_mins' | 'cook_time_mins'>;

export default async function RecipeListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('recipelist');
  const recipes: RecipeCardData[] = (await listVisibleRecipes(await getCurrentUser())).map((r) => ({
    id: r.id,
    slug: r.slug,
    title_zh: r.title_zh,
    title_en: r.title_en,
    description_zh: r.description_zh,
    description_en: r.description_en,
    cover_image: r.cover_image,
    tags: r.tags,
    prep_time_mins: r.prep_time_mins,
    cook_time_mins: r.cook_time_mins,
  }));

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
