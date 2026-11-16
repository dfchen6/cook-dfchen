import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getRestaurant } from '@/lib/data/restaurants';
import RestaurantEditForm from '@/components/admin/RestaurantEditForm';
import type { RestaurantWithDetails } from '@/lib/types';

export default async function RestaurantEditPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/restaurants/manage/edit/${id}`)}`);

  let initial: RestaurantWithDetails | null = null;

  if (id !== 'new') {
    const data = await getRestaurant(user.id, id);
    if (!data) notFound();
    initial = data;
  }

  const title = initial ? `Edit: ${initial.name}` : 'New Restaurant';

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href={`/${locale}/restaurants`} className="hover:text-stone-900 dark:hover:text-stone-100">{locale === 'zh' ? '餐厅日记' : 'Restaurant Diary'}</Link>
        <span>/</span>
        <Link href={`/${locale}/restaurants/manage`} className="hover:text-stone-900 dark:hover:text-stone-100">{locale === 'zh' ? '管理' : 'Manage'}</Link>
        <span>/</span>
        <span className="text-stone-900 dark:text-stone-100 font-medium">{title}</span>
      </div>

      <h1 className="mb-8 text-xl font-bold">{title}</h1>

      <RestaurantEditForm locale={locale} userId={user.id} initial={initial} />
    </div>
  );
}
