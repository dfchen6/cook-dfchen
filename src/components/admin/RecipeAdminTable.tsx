'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { bulkDeleteRecipes } from '@/app/[locale]/admin/actions';
import DeleteRecipeButton from '@/components/admin/DeleteRecipeButton';
import type { Recipe } from '@/lib/supabase/types';

type RecipeRow = Pick<Recipe, 'id' | 'slug' | 'title_zh' | 'title_en' | 'tags' | 'youtube_url' | 'is_public'>;

export default function RecipeAdminTable({ recipes, locale }: { recipes: RecipeRow[]; locale: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const allSelected = recipes.length > 0 && recipes.every((recipe) => selected.has(recipe.id));
  const selectedCount = selected.size;
  const selectedTitles = useMemo(
    () => recipes.filter((recipe) => selected.has(recipe.id)).map((recipe) => recipe.title_zh),
    [recipes, selected]
  );

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(recipes.map((recipe) => recipe.id)));
  }

  function toggleRecipe(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function deleteSelected() {
    if (!selectedCount) return;
    const preview = selectedTitles.slice(0, 3).join(', ');
    if (!confirm(`Delete ${selectedCount} selected recipe${selectedCount === 1 ? '' : 's'} (${preview}${selectedCount > 3 ? ', …' : ''})?\n\nThis also permanently removes their associated meal-plan entries.`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await bulkDeleteRecipes([...selected]);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">{selectedCount ? `${selectedCount} selected` : 'Select recipes to delete multiple items.'}</p>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={!selectedCount || pending}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:hover:bg-red-950"
        >
          {pending ? 'Deleting…' : `Delete selected${selectedCount ? ` (${selectedCount})` : ''}`}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 dark:bg-stone-800">
            <tr>
              <th className="w-10 px-3 py-3 text-center">
                <input
                  aria-label="Select all recipes"
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-stone-300 dark:border-stone-600"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">ZH Title</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500">EN Title</th>
              <th className="hidden px-4 py-3 text-left font-medium text-stone-500 sm:table-cell">Slug</th>
              <th className="hidden px-4 py-3 text-left font-medium text-stone-500 md:table-cell">Tags</th>
              <th className="px-4 py-3 text-center font-medium text-stone-500">YT</th>
              <th className="px-4 py-3 text-center font-medium text-stone-500">Visibility</th>
              <th className="px-4 py-3 text-right font-medium text-stone-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {recipes.map((recipe) => (
              <tr key={recipe.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                <td className="px-3 py-3 text-center">
                  <input
                    aria-label={`Select ${recipe.title_zh}`}
                    type="checkbox"
                    checked={selected.has(recipe.id)}
                    onChange={() => toggleRecipe(recipe.id)}
                    className="h-4 w-4 rounded border-stone-300 dark:border-stone-600"
                  />
                </td>
                <td className="px-4 py-3 font-medium">{recipe.title_zh}</td>
                <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{recipe.title_en}</td>
                <td className="hidden px-4 py-3 font-mono text-xs text-stone-500 sm:table-cell">{recipe.slug}</td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags?.map((tag) => (
                      <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {recipe.youtube_url ? <span className="text-red-500" title={recipe.youtube_url}>▶</span> : <span className="text-stone-300 dark:text-stone-600">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  {recipe.is_public ? <span className="text-xs text-stone-400">Public</span> : <span className="text-xs font-medium text-amber-600 dark:text-amber-400" title="Shared only">🔒 Shared</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/${locale}/recipes/${recipe.slug}`} className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200" target="_blank">View</Link>
                    <Link href={`/${locale}/admin/edit/${recipe.id}`} className="text-xs font-medium text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100">Edit</Link>
                    <DeleteRecipeButton id={recipe.id} title={recipe.title_zh} />
                  </div>
                </td>
              </tr>
            ))}
            {!recipes.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-stone-400">No recipes yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
