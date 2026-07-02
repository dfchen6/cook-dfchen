import { createClient } from '@/lib/supabase/server';
import RestaurantCard from '@/components/restaurants/RestaurantCard';
import RestaurantMapWrapper from '@/components/restaurants/RestaurantMapWrapper';
import type { Restaurant } from '@/lib/supabase/types';

type RestaurantRow = Pick<Restaurant, 'id' | 'name' | 'name_zh' | 'city' | 'country' | 'cuisine' | 'tags' | 'overall_rating' | 'price_level' | 'visited_at' | 'cover_image' | 'lat' | 'lng'>;

type SearchParams = {
  q?: string;
  city?: string;
  cuisine?: string;
  tag?: string;
  view?: string;
};

export default async function RestaurantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const { q, city, cuisine, tag, view } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from('restaurants')
    .select('id, name, name_zh, city, country, cuisine, tags, overall_rating, price_level, visited_at, cover_image, lat, lng')
    .order('visited_at', { ascending: false });

  if (q) query = query.or(`name.ilike.%${q}%,name_zh.ilike.%${q}%,notes.ilike.%${q}%`);
  if (city) query = query.ilike('city', `%${city}%`);
  if (cuisine) query = query.ilike('cuisine', `%${cuisine}%`);
  if (tag) query = query.contains('tags', [tag]);

  const { data: raw } = await query;
  const restaurants = raw as RestaurantRow[] | null;

  const isMap = view === 'map';

  // Collect unique values for filter dropdowns
  const allCities = [...new Set(restaurants?.map((r: RestaurantRow) => r.city).filter(Boolean) as string[])].sort();
  const allCuisines = [...new Set(restaurants?.map((r: RestaurantRow) => r.cuisine).filter(Boolean) as string[])].sort();
  const allTags = [...new Set(restaurants?.flatMap((r: RestaurantRow) => r.tags ?? []) as string[])].sort();

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q, city, cuisine, tag, view, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    const str = sp.toString();
    return `/${locale}/restaurants${str ? `?${str}` : ''}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{locale === 'zh' ? '餐厅日记' : 'Restaurant Diary'}</h1>
        <div className="flex items-center gap-1 rounded-lg border border-stone-200 p-1 text-sm dark:border-stone-700">
          <a
            href={buildUrl({ view: 'list' })}
            className={`rounded px-3 py-1 ${!isMap ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'}`}
          >
            {locale === 'zh' ? '列表' : 'List'}
          </a>
          <a
            href={buildUrl({ view: 'map' })}
            className={`rounded px-3 py-1 ${isMap ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'}`}
          >
            {locale === 'zh' ? '地图' : 'Map'}
          </a>
        </div>
      </div>

      {/* Search & Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-2">
        <input type="hidden" name="view" value={view ?? 'list'} />
        <input
          name="q"
          defaultValue={q}
          placeholder={locale === 'zh' ? '搜索餐厅...' : 'Search restaurants...'}
          className="flex-1 min-w-[180px] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-600 dark:bg-stone-800"
        />
        <select name="cuisine" defaultValue={cuisine} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800">
          <option value="">{locale === 'zh' ? '所有菜系' : 'All cuisines'}</option>
          {allCuisines.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="city" defaultValue={city} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800">
          <option value="">{locale === 'zh' ? '所有城市' : 'All cities'}</option>
          {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900">
          {locale === 'zh' ? '搜索' : 'Search'}
        </button>
        {(q || city || cuisine || tag) && (
          <a href={buildUrl({ q: undefined, city: undefined, cuisine: undefined, tag: undefined })} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800">
            {locale === 'zh' ? '清除' : 'Clear'}
          </a>
        )}
      </form>

      {/* Tag chips */}
      {allTags.length > 0 && !tag && (
        <div className="mb-6 flex flex-wrap gap-2">
          {allTags.slice(0, 12).map((t) => (
            <a key={t} href={buildUrl({ tag: t })} className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800">
              {t}
            </a>
          ))}
        </div>
      )}
      {tag && (
        <div className="mb-6 flex items-center gap-2">
          <span className="rounded-full bg-stone-900 px-3 py-1 text-xs text-white dark:bg-stone-100 dark:text-stone-900">{tag}</span>
          <a href={buildUrl({ tag: undefined })} className="text-xs text-stone-400 hover:text-stone-600">✕ clear tag</a>
        </div>
      )}

      {/* Count */}
      <p className="mb-4 text-sm text-stone-400">
        {restaurants?.length ?? 0} {locale === 'zh' ? '家餐厅' : 'restaurants'}
        {(q || city || cuisine || tag) ? (locale === 'zh' ? '（已筛选）' : ' (filtered)') : ''}
      </p>

      {/* Map view */}
      {isMap && (
        <RestaurantMapWrapper restaurants={restaurants ?? []} locale={locale} />
      )}

      {/* List view */}
      {!isMap && (
        <>
          {!restaurants?.length ? (
            <p className="text-stone-400">{locale === 'zh' ? '暂无餐厅记录。' : 'No restaurants yet.'}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((r: RestaurantRow) => (
                <RestaurantCard key={r.id} restaurant={r} locale={locale} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
