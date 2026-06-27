import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import RecipeCard from '@/components/RecipeCard';
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
      {!recipes?.length ? (
        <p className="text-stone-500">{t('empty')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
