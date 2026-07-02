import Link from 'next/link';
import Image from 'next/image';
import type { Restaurant } from '@/lib/supabase/types';

const PRICE = ['', '$', '$$', '$$$', '$$$$'];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

type Props = {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'name_zh' | 'city' | 'country' | 'cuisine' | 'tags' | 'overall_rating' | 'price_level' | 'visited_at' | 'cover_image'>;
  locale: string;
};

export default function RestaurantCard({ restaurant: r, locale }: Props) {
  return (
    <Link
      href={`/${locale}/restaurants/${r.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md dark:border-stone-700 dark:bg-stone-900"
    >
      {r.cover_image ? (
        <div className="relative h-44 w-full overflow-hidden">
          <Image src={r.cover_image} alt={r.name} fill className="object-cover transition group-hover:scale-105" />
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center bg-stone-100 text-5xl dark:bg-stone-800">🏪</div>
      )}

      <div className="flex flex-col gap-1.5 p-4">
        <div>
          <h2 className="text-base font-semibold leading-tight">{r.name}</h2>
          {r.name_zh && <p className="text-sm text-stone-400">{r.name_zh}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400">
          {r.cuisine && <span>{r.cuisine}</span>}
          {r.city && <span>· {r.city}</span>}
          {r.price_level && <span>· {PRICE[r.price_level]}</span>}
        </div>

        {r.overall_rating && (
          <div className="flex items-center gap-1.5 text-xs">
            <Stars rating={r.overall_rating} />
          </div>
        )}

        {r.tags?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {r.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {r.visited_at && (
          <p className="mt-1 text-xs text-stone-400">
            Visited {new Date(r.visited_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short' })}
          </p>
        )}
      </div>
    </Link>
  );
}
