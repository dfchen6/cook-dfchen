import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, isAdminUser } from '@/lib/auth';
import { getRecipeById } from '@/lib/data/recipes';
import RecipeEditForm from '@/components/admin/RecipeEditForm';

export default async function RecipeEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getCurrentUser();
  if (!isAdminUser(user)) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin/edit/${id}`)}`);
  }

  let initial = null;

  if (id !== 'new') {
    const data = await getRecipeById(id);
    if (!data) notFound();
    initial = data;
  }

  const title = initial ? `Edit: ${initial.title_zh}` : 'New Recipe';

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/${locale}/admin`}
          className="text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
        >
          ← Admin
        </Link>
        <span className="text-stone-300 dark:text-stone-600">/</span>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>

      <RecipeEditForm
        locale={locale}
        initial={
          initial
            ? {
                slug: initial.slug,
                title_zh: initial.title_zh,
                title_en: initial.title_en,
                description_zh: initial.description_zh,
                description_en: initial.description_en,
                instructions_zh: initial.instructions_zh,
                instructions_en: initial.instructions_en,
                youtube_url: initial.youtube_url,
                video_urls: initial.video_urls,
                cover_image: initial.cover_image,
                prep_time_mins: initial.prep_time_mins,
                cook_time_mins: initial.cook_time_mins,
                servings: initial.servings,
                tags: initial.tags,
                locale_primary: initial.locale_primary,
                is_public: initial.is_public,
                shared_with: (initial.recipe_shares ?? []).map((s) => s.email),
                ingredients: initial.ingredients,
              }
            : null
        }
      />
    </div>
  );
}
