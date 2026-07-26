import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAIL } from '@/lib/admin';
import BatchImportForm from '@/components/admin/BatchImportForm';
import ImportPrivateRecipesButton from '@/components/admin/ImportPrivateRecipesButton';
import RecipeAdminTable from '@/components/admin/RecipeAdminTable';
import RecipeCsvTools from '@/components/admin/RecipeCsvTools';

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
    .select('id, slug, title_zh, title_en, tags, youtube_url, is_public, created_at')
    .order('created_at', { ascending: false })
    .returns<Array<{
      id: string;
      slug: string;
      title_zh: string;
      title_en: string;
      tags: string[];
      youtube_url: string | null;
      is_public: boolean;
      created_at: string;
    }>>();

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
        <RecipeAdminTable recipes={recipes ?? []} locale={locale} />
      </section>

      <section className="mb-12">
        <ImportPrivateRecipesButton />
      </section>

      <section className="mb-12">
        <RecipeCsvTools />
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
