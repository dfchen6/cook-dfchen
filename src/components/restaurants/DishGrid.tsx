import Image from 'next/image';
import type { RestaurantDish } from '@/lib/supabase/types';

function Stars({ rating }: { rating: number }) {
  return <span className="text-amber-400 text-xs">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>;
}

export default function DishGrid({ dishes }: { dishes: RestaurantDish[] }) {
  if (!dishes.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {dishes.map((dish) => (
        <div
          key={dish.id}
          className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
        >
          {dish.image_url ? (
            <div className="relative h-40 w-full overflow-hidden">
              <Image src={dish.image_url} alt={dish.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center bg-stone-100 text-4xl dark:bg-stone-800">🍽️</div>
          )}
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium leading-tight">{dish.name}</p>
                {dish.name_zh && <p className="text-xs text-stone-400">{dish.name_zh}</p>}
              </div>
              {dish.recommended && (
                <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600 dark:bg-red-900 dark:text-red-300">
                  Must try
                </span>
              )}
            </div>
            {dish.rating && <div className="mt-1"><Stars rating={dish.rating} /></div>}
            {dish.description && (
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 line-clamp-2">{dish.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
