'use client';

import { useState, useMemo } from 'react';
import RecipeCard from '@/components/RecipeCard';
import type { Recipe } from '@/lib/supabase/types';

type RecipeCardData = Pick<Recipe, 'id' | 'slug' | 'title_zh' | 'title_en' | 'description_zh' | 'description_en' | 'cover_image' | 'tags' | 'prep_time_mins' | 'cook_time_mins'>;

type Props = {
  recipes: RecipeCardData[];
  locale: string;
  searchPlaceholder: string;
  emptyText: string;
  allTagsLabel: string;
};

export default function RecipeFilters({ recipes, locale, searchPlaceholder, emptyText, allTagsLabel }: Props) {
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const r of recipes) r.tags?.forEach((t) => tags.add(t));
    return Array.from(tags).sort();
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchesQuery =
        !q ||
        r.title_zh.toLowerCase().includes(q) ||
        r.title_en.toLowerCase().includes(q) ||
        r.description_zh?.toLowerCase().includes(q) ||
        r.description_en?.toLowerCase().includes(q) ||
        r.tags?.some((t) => t.toLowerCase().includes(q));
      const matchesTag = !selectedTag || r.tags?.includes(selectedTag);
      return matchesQuery && matchesTag;
    });
  }, [recipes, query, selectedTag]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-stone-500"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag('')}
              className={`rounded-full px-3 py-1 text-xs transition ${
                selectedTag === ''
                  ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
              }`}
            >
              {allTagsLabel}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  selectedTag === tag
                    ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-stone-500">{emptyText}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
