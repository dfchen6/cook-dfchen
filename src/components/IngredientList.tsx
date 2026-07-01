import type { Ingredient } from '@/lib/supabase/types';

export default function IngredientList({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-700 dark:bg-stone-900">
      {ingredients.map((ing) => (
        <li key={ing.id} className="flex items-center justify-between px-4 py-3">
          <span className="font-medium">
            {ing.name_zh}
            <span className="ml-2 text-sm font-normal text-stone-400">({ing.name_en})</span>
          </span>
          <span className="text-sm text-stone-600 dark:text-stone-400">
            {ing.quantity} {ing.unit}
          </span>
        </li>
      ))}
    </ul>
  );
}
