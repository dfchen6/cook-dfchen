import Link from 'next/link';
import Image from 'next/image';
import type { Recipe } from '@/lib/supabase/types';

type Props = {
  recipe: Pick<Recipe, 'slug' | 'title_zh' | 'title_en' | 'description_zh' | 'description_en' | 'cover_image' | 'tags' | 'prep_time_mins' | 'cook_time_mins'>;
  locale: string;
};

export default function RecipeCard({ recipe, locale }: Props) {
  const description = locale === 'zh' ? recipe.description_zh : recipe.description_en;

  return (
    <Link
      href={`/${locale}/recipes/${recipe.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {recipe.cover_image ? (
        <div className="relative h-44 w-full overflow-hidden">
          <Image
            src={recipe.cover_image}
            alt={recipe.title_zh}
            fill
            className="object-cover transition group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center bg-stone-100 text-5xl">🍽️</div>
      )}
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-lg font-semibold leading-tight">{recipe.title_zh}</h2>
        <p className="text-sm text-stone-400">{recipe.title_en}</p>
        {description && (
          <p className="mt-1 line-clamp-2 text-sm text-stone-600">{description}</p>
        )}
        {(recipe.prep_time_mins || recipe.cook_time_mins) && (
          <p className="mt-2 text-xs text-stone-400">
            {[recipe.prep_time_mins && `prep ${recipe.prep_time_mins}min`, recipe.cook_time_mins && `cook ${recipe.cook_time_mins}min`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {recipe.tags?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
