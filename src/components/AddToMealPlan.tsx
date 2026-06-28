'use client';

import { useActionState, useState } from 'react';
import { addToMealPlan } from '@/app/[locale]/meal-plan/actions';

type State = { error: string | null; done?: boolean };
const initial: State = { error: null };

async function action(_prev: State, formData: FormData): Promise<State> {
  const result = await addToMealPlan(formData);
  return { error: result.error, done: !result.error };
}

const MEAL_TYPES = [
  { value: 'breakfast', label: '早餐 · Breakfast' },
  { value: 'lunch', label: '午餐 · Lunch' },
  { value: 'dinner', label: '晚餐 · Dinner' },
  { value: 'snack', label: '小食 · Snack' },
];

export default function AddToMealPlan({
  recipeId,
  loggedIn,
  locale,
}: {
  recipeId: string;
  loggedIn: boolean;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, dispatch, pending] = useActionState(action, initial);

  if (!loggedIn) {
    return (
      <a
        href={`/${locale}/login`}
        className="inline-block rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:border-stone-500"
      >
        Login to add to meal plan
      </a>
    );
  }

  if (state.done) {
    return (
      <p className="text-sm font-medium text-green-700">✓ Added to meal plan!</p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
      >
        加入饮食计划 · Add to Meal Plan
      </button>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <form
      action={dispatch}
      className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4"
    >
      <input type="hidden" name="recipe_id" value={recipeId} />

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-stone-600">Date</label>
          <input
            type="date"
            name="planned_date"
            defaultValue={today}
            min={today}
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-stone-600">Meal</label>
          <select
            name="meal_type"
            defaultValue="dinner"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
          >
            {MEAL_TYPES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {state.error && <p className="text-xs text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-stone-500 hover:text-stone-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
