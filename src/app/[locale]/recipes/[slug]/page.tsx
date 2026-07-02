import { notFound } from 'next/navigation';

function extractYoutubeId(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    return u.searchParams.get('v') ?? url;
  } catch {
    return url;
  }
}
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import IngredientList from '@/components/IngredientList';
import AddToMealPlan from '@/components/AddToMealPlan';
import Image from 'next/image';
import type { RecipeWithIngredients } from '@/lib/supabase/types';

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations('recipe');
  const supabase = await createClient();

  const [{ data: recipe }, { data: { user } }] = await Promise.all([
    supabase
      .from('recipes')
      .select('*, ingredients(*)')
      .eq('slug', slug)
      .order('sort_order', { referencedTable: 'ingredients', ascending: true })
      .returns<RecipeWithIngredients[]>()
      .single(),
    supabase.auth.getUser(),
  ]);

  if (!recipe) notFound();

  const instructions =
    locale === 'zh'
      ? (recipe.instructions_zh ?? recipe.instructions)
      : (recipe.instructions_en ?? recipe.instructions);

  return (
    <article className="mx-auto max-w-2xl">
      {/* Cover image */}
      {recipe.cover_image && (
        <div className="relative mb-8 h-72 w-full overflow-hidden rounded-2xl">
          <Image src={recipe.cover_image} alt={recipe.title_zh} fill className="object-cover" />
        </div>
      )}

      {/* Bilingual title — always both */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{recipe.title_zh}</h1>
        <p className="mt-1 text-lg text-stone-400 sm:text-xl">{recipe.title_en}</p>
      </div>

      {/* Meta row */}
      <div className="mb-8 flex flex-wrap gap-3 text-sm text-stone-500 dark:text-stone-400">
        {recipe.servings && (
          <span>👤 {recipe.servings} {t('servings')}</span>
        )}
        {recipe.prep_time_mins && (
          <span>🔪 {t('prepTime')} {recipe.prep_time_mins} {t('mins')}</span>
        )}
        {recipe.cook_time_mins && (
          <span>🔥 {t('cookTime')} {recipe.cook_time_mins} {t('mins')}</span>
        )}
      </div>

      {/* Ingredients — always bilingual inline */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">{t('ingredients')}</h2>
        <IngredientList ingredients={recipe.ingredients} />
      </section>

      {/* Instructions — natural language */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('instructions')}</h2>
        <div className="prose prose-stone max-w-none whitespace-pre-line leading-8 text-stone-700 dark:text-stone-300">
          {instructions}
        </div>
      </section>

      {/* Tags */}
      {recipe.tags?.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2">
          {recipe.tags.map((tag: string) => (
            <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* YouTube embed */}
      {recipe.youtube_url && (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">{t('video')}</h2>
          <div className="aspect-video w-full overflow-hidden rounded-xl">
            <iframe
              src={`https://www.youtube.com/embed/${extractYoutubeId(recipe.youtube_url)}`}
              title={recipe.title_en}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {/* Add to Meal Plan */}
      <div className="mt-10 border-t border-stone-100 pt-8 dark:border-stone-800">
        <AddToMealPlan recipeId={recipe.id} loggedIn={!!user} locale={locale} />
      </div>
    </article>
  );
}
