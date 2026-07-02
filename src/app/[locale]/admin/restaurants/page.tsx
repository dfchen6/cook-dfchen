import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DeleteRestaurantButton from '@/components/admin/DeleteRestaurantButton';
import BatchImportRestaurantsForm from '@/components/admin/BatchImportRestaurantsForm';
import type { Restaurant } from '@/lib/supabase/types';

const ADMIN_EMAIL = 'dfchen6@gmail.com';
const PRICE = ['', '$', '$$', '$$$', '$$$$'];

type Row = Pick<Restaurant, 'id' | 'name' | 'name_zh' | 'city' | 'cuisine' | 'overall_rating' | 'price_level' | 'visited_at' | 'tags'>;

export default async function AdminRestaurantsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect(`/${locale}/login`);

  const { data: raw } = await supabase
    .from('restaurants')
    .select('id, name, name_zh, city, cuisine, overall_rating, price_level, visited_at, tags')
    .order('visited_at', { ascending: false });
  const restaurants = raw as Row[] | null;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-1">
            <Link href={`/${locale}/admin`} className="hover:text-stone-900 dark:hover:text-stone-100">Admin</Link>
            <span>/</span>
            <span>Restaurants</span>
          </div>
          <h1 className="text-2xl font-bold">Restaurant Management</h1>
          <p className="mt-1 text-sm text-stone-500">{restaurants?.length ?? 0} restaurants</p>
        </div>
        <Link
          href={`/${locale}/admin/restaurants/edit/new`}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          + New Restaurant
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 dark:bg-stone-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-stone-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500 hidden sm:table-cell">Cuisine</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500 hidden md:table-cell">City</th>
              <th className="px-4 py-3 text-left font-medium text-stone-500 hidden md:table-cell">Tags</th>
              <th className="px-4 py-3 text-center font-medium text-stone-500">Rating</th>
              <th className="px-4 py-3 text-center font-medium text-stone-500 hidden sm:table-cell">Price</th>
              <th className="px-4 py-3 text-right font-medium text-stone-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {restaurants?.map((r: Row) => (
              <tr key={r.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.name}</p>
                  {r.name_zh && <p className="text-xs text-stone-400">{r.name_zh}</p>}
                </td>
                <td className="px-4 py-3 text-stone-500 hidden sm:table-cell">{r.cuisine ?? '—'}</td>
                <td className="px-4 py-3 text-stone-500 hidden md:table-cell">{r.city ?? '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {r.tags?.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-xs text-amber-400">
                  {r.overall_rating ? '★'.repeat(r.overall_rating) : '—'}
                </td>
                <td className="px-4 py-3 text-center text-xs text-stone-500 hidden sm:table-cell">
                  {r.price_level ? PRICE[r.price_level] : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/${locale}/restaurants/${r.id}`} className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200" target="_blank">View</Link>
                    <Link href={`/${locale}/admin/restaurants/edit/${r.id}`} className="text-xs font-medium text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100">Edit</Link>
                    <DeleteRestaurantButton id={r.id} name={r.name} locale={locale} />
                  </div>
                </td>
              </tr>
            ))}
            {!restaurants?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-400">No restaurants yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Batch import */}
      <section className="mt-12">
        <h2 className="mb-2 text-base font-semibold">Batch Import</h2>
        <p className="mb-4 text-sm text-stone-500">
          Paste a JSON array of restaurants. Existing entries (matched by name) are re-inserted; use the edit form to update specific records.
        </p>
        <BatchImportRestaurantsForm />
      </section>
    </div>
  );
}
