import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import RestaurantEditForm from '@/components/admin/RestaurantEditForm';
import type { RestaurantWithDetails } from '@/lib/supabase/types';

const ADMIN_EMAIL = 'dfchen6@gmail.com';

export default async function RestaurantEditPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect(`/${locale}/login`);

  let initial: RestaurantWithDetails | null = null;

  if (id !== 'new') {
    const { data } = await supabase
      .from('restaurants')
      .select('*, restaurant_dishes(*), restaurant_photos(*)')
      .eq('id', id)
      .order('sort_order', { referencedTable: 'restaurant_dishes', ascending: true })
      .order('sort_order', { referencedTable: 'restaurant_photos', ascending: true })
      .single();
    if (!data) notFound();
    initial = data as unknown as RestaurantWithDetails;
  }

  const title = initial ? `Edit: ${initial.name}` : 'New Restaurant';

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href={`/${locale}/admin`} className="hover:text-stone-900 dark:hover:text-stone-100">Admin</Link>
        <span>/</span>
        <Link href={`/${locale}/admin/restaurants`} className="hover:text-stone-900 dark:hover:text-stone-100">Restaurants</Link>
        <span>/</span>
        <span className="text-stone-900 dark:text-stone-100 font-medium">{title}</span>
      </div>

      <h1 className="mb-8 text-xl font-bold">{title}</h1>

      <RestaurantEditForm locale={locale} initial={initial} />
    </div>
  );
}
