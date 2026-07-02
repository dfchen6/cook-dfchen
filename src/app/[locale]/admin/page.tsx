import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BatchImportForm from '@/components/admin/BatchImportForm';
import type { Recipe } from '@/lib/supabase/types';
import { deleteRecipe } from './actions';

const ADMIN_EMAIL = 'dfchen6@gmail.com';

type RecipeRow = Pick<Recipe, 'id' | 'slug' | 'title_zh' | 'title_en' | 'tags' | 'youtube_url' | 'created_at'>;

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect(`/${locale}/login`);
  }

  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, slug, title_zh, title_en, tags, youtube_url, created_at')
    .order('created_at', { ascending: false })
    .returns<RecipeRow[]>();

  async function handleDelete(id: string) {
    'use server';
    await deleteRecipe(id);
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin · Recipe Management</h1>
          <p className="mt-1 text-sm text-stone-500">{recipes?.length ?? 0} recipes in database</p>
        </div>
        <Link
          href={`/${locale}/admin/edit/new`}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          + New Recipe
        </Link>
      </div>

      {/* Recipe table */}
      <section className="mb-12">
        <h2 className="mb-4 text-base font-semibold">All Recipes</h2>
        <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 dark:bg-stone-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-stone-500">ZH Title</th>
                <th className="px-4 py-3 text-left font-medium text-stone-500">EN Title</th>
                <th className="px-4 py-3 text-left font-medium text-stone-500 hidden sm:table-cell">Slug</th>
                <th className="px-4 py-3 text-left font-medium text-stone-500 hidden md:table-cell">Tags</th>
                <th className="px-4 py-3 text-center font-medium text-stone-500">YT</th>
                <th className="px-4 py-3 text-right font-medium text-stone-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {recipes?.map((recipe) => (
                <tr key={recipe.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <td className="px-4 py-3 font-medium">{recipe.title_zh}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{recipe.title_en}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-500 hidden sm:table-cell">{recipe.slug}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags?.map((tag) => (
                        <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {recipe.youtube_url ? (
                      <span className="text-red-500" title={recipe.youtube_url}>▶</span>
                    ) : (
                      <span className="text-stone-300 dark:text-stone-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/${locale}/recipes/${recipe.slug}`}
                        className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                        target="_blank"
                      >
                        View
                      </Link>
                      <Link
                        href={`/${locale}/admin/edit/${recipe.id}`}
                        className="text-xs font-medium text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
                      >
                        Edit
                      </Link>
                      <form action={handleDelete.bind(null, recipe.id)}>
                        <button
                          type="submit"
                          className="text-xs text-red-400 hover:text-red-600"
                          onClick={(e) => { if (!confirm(`Delete "${recipe.title_zh}"?`)) e.preventDefault(); }}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {!recipes?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">No recipes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Batch import */}
      <section>
        <h2 className="mb-2 text-base font-semibold">Batch Import</h2>
        <p className="mb-4 text-sm text-stone-500">
          Ask Gemini to parse YouTube videos and output the JSON schema below. Paste the result here to import multiple recipes at once. Existing slugs are updated (upsert).
        </p>
        <BatchImportForm />
      </section>
    </div>
  );
}
