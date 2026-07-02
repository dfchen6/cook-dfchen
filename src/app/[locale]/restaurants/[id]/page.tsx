import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DishGrid from '@/components/restaurants/DishGrid';
import PhotoGallery from '@/components/restaurants/PhotoGallery';
import type { RestaurantWithDetails } from '@/lib/supabase/types';

const PRICE = ['', '$', '$$', '$$$', '$$$$'];

function Stars({ rating }: { rating: number }) {
  return <span className="text-amber-400">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>;
}

export default async function RestaurantDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from('restaurants')
    .select('*, restaurant_dishes(*), restaurant_photos(*)')
    .eq('id', id)
    .order('sort_order', { referencedTable: 'restaurant_dishes', ascending: true })
    .order('sort_order', { referencedTable: 'restaurant_photos', ascending: true })
    .single();
  const restaurant = raw as unknown as RestaurantWithDetails | null;

  if (!restaurant) notFound();

  const dishes = restaurant.restaurant_dishes ?? [];
  const photos = restaurant.restaurant_photos ?? [];

  return (
    <article className="mx-auto max-w-3xl">
      {/* Cover image */}
      {restaurant.cover_image && (
        <div className="relative mb-8 h-72 w-full overflow-hidden rounded-2xl">
          <Image src={restaurant.cover_image} alt={restaurant.name} fill className="object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{restaurant.name}</h1>
        {restaurant.name_zh && <p className="mt-1 text-xl text-stone-400">{restaurant.name_zh}</p>}
      </div>

      {/* Meta row */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        {restaurant.overall_rating && (
          <span className="flex items-center gap-1">
            <Stars rating={restaurant.overall_rating} />
            <span className="text-stone-400">({restaurant.overall_rating}/5)</span>
          </span>
        )}
        {restaurant.price_level && (
          <span className="text-stone-500">{PRICE[restaurant.price_level]}</span>
        )}
        {restaurant.cuisine && (
          <span className="rounded-full bg-stone-100 px-3 py-0.5 text-stone-600 dark:bg-stone-800 dark:text-stone-400">{restaurant.cuisine}</span>
        )}
        {restaurant.visited_at && (
          <span className="text-stone-400">
            Visited {new Date(restaurant.visited_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' })}
          </span>
        )}
      </div>

      {/* Address / location */}
      {(restaurant.address || restaurant.city) && (
        <div className="mb-6 flex items-start gap-2 text-sm text-stone-500">
          <span>📍</span>
          <div>
            {restaurant.address && <p>{restaurant.address}</p>}
            {(restaurant.city || restaurant.country) && (
              <p>{[restaurant.city, restaurant.country].filter(Boolean).join(', ')}</p>
            )}
            {restaurant.google_maps_url && (
              <a href={restaurant.google_maps_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-stone-700 underline dark:text-stone-300">
                Open in Google Maps →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {restaurant.tags?.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {restaurant.tags.map((tag: string) => (
            <Link
              key={tag}
              href={`/${locale}/restaurants?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* Notes */}
      {restaurant.notes && (
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold">{locale === 'zh' ? '点评' : 'My Review'}</h2>
          <div className="rounded-xl bg-stone-50 p-4 text-stone-700 leading-7 whitespace-pre-line dark:bg-stone-800/50 dark:text-stone-300">
            {restaurant.notes}
          </div>
        </section>
      )}

      {/* Dishes */}
      {dishes.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">{locale === 'zh' ? '推荐菜品' : 'Recommended Dishes'}</h2>
          <DishGrid dishes={dishes} />
        </section>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">{locale === 'zh' ? '照片' : 'Photos'}</h2>
          <PhotoGallery photos={photos} />
        </section>
      )}

      {/* Back link */}
      <div className="mt-8 border-t border-stone-100 pt-6 dark:border-stone-800">
        <Link href={`/${locale}/restaurants`} className="text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100">
          ← {locale === 'zh' ? '返回餐厅列表' : 'Back to all restaurants'}
        </Link>
      </div>
    </article>
  );
}
