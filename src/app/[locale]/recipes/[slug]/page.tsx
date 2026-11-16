import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth';
import { getVisibleRecipeBySlug } from '@/lib/data/recipes';
import IngredientList from '@/components/IngredientList';
import AddToMealPlan from '@/components/AddToMealPlan';
import RecipeSteps from '@/components/RecipeSteps';
import Image from 'next/image';
import { isOptimizableImageUrl } from '@/lib/storage-url';
import { parseInstructionSteps } from '@/lib/parse-steps';
import { parseVideoUrl } from '@/lib/video';

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations('recipe');
  const user = await getCurrentUser();
  const recipe = await getVisibleRecipeBySlug(slug, user);

  if (!recipe) {
    // Private recipes are hidden from anonymous visitors — a shared link should
    // lead to login (and back here) rather than a dead-end 404.
    if (!user) {
      redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/recipes/${slug}`)}`);
    }
    notFound();
  }

  const instructions =
    locale === 'zh'
      ? (recipe.instructions_zh ?? recipe.instructions)
      : (recipe.instructions_en ?? recipe.instructions);

  const description =
    locale === 'zh'
      ? (recipe.description_zh ?? recipe.description_en)
      : (recipe.description_en ?? recipe.description_zh);

  const steps = parseInstructionSteps(instructions);
  const video = parseVideoUrl(recipe.youtube_url);

  return (
    <article className="mx-auto max-w-2xl">
      {/* Cover image */}
      {recipe.cover_image && (
        <div className="relative mb-8 h-72 w-full overflow-hidden rounded-2xl">
          <Image src={recipe.cover_image} alt={recipe.title_zh} fill unoptimized={!isOptimizableImageUrl(recipe.cover_image)} className="object-cover" />
        </div>
      )}

      {/* Bilingual title — always both */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{recipe.title_zh}</h1>
        <p className="mt-1 text-lg text-stone-400 sm:text-xl">{recipe.title_en}</p>
        {description && (
          <p className="mt-4 leading-7 text-stone-600 dark:text-stone-400">{description}</p>
        )}
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

      {/* Instructions — one step at a time, swipeable on mobile */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">{t('instructions')}</h2>
        <RecipeSteps steps={steps} />
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

      {/* Video — YouTube embeds; Xiaohongshu blocks iframes, so link out instead */}
      {video && (
        <div className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">{t('video')}</h2>
          {video.platform === 'youtube' ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl">
              <iframe
                src={`https://www.youtube.com/embed/${video.embedId}`}
                title={recipe.title_en}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : (
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 rounded-xl border px-5 py-4 transition-colors ${
                video.platform === 'xiaohongshu'
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              <span className="text-2xl">{video.platform === 'xiaohongshu' ? '📕' : '▶'}</span>
              <span className="font-medium">
                {video.platform === 'xiaohongshu' ? t('watchOnXiaohongshu') : t('watchVideo')}
              </span>
              <span className="ml-auto">↗</span>
            </a>
          )}
        </div>
      )}

      {/* Add to Meal Plan */}
      <div className="mt-10 border-t border-stone-100 pt-8 dark:border-stone-800">
        <AddToMealPlan recipeId={recipe.id} loggedIn={!!user} locale={locale} />
      </div>
    </article>
  );
}
