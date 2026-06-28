import { notFound } from 'next/navigation';
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
        <h1 className="text-4xl font-bold leading-tight">{recipe.title_zh}</h1>
        <p className="mt-1 text-xl text-stone-400">{recipe.title_en}</p>
      </div>

      {/* Meta row */}
      <div className="mb-8 flex flex-wrap gap-4 text-sm text-stone-500">
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
        <div className="prose prose-stone max-w-none whitespace-pre-line leading-8 text-stone-700">
          {instructions}
        </div>
      </section>

      {/* Tags */}
      {recipe.tags?.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2">
          {recipe.tags.map((tag: string) => (
            <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-500">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Add to Meal Plan */}
      <div className="mt-10 border-t border-stone-100 pt-8">
        <AddToMealPlan recipeId={recipe.id} loggedIn={!!user} locale={locale} />
      </div>
    </article>
  );
}
