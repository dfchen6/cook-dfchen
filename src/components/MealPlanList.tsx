'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { removeFromMealPlan } from '@/app/[locale]/meal-plan/actions';

type Plan = {
  id: string;
  planned_date: string;
  meal_type: string;
  notes: string | null;
  recipes: {
    id: string;
    slug: string;
    title_zh: string;
    title_en: string;
    cover_image: string | null;
  } | null;
};

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

const MEAL_LABEL: Record<string, string> = {
  breakfast: '早餐 · Breakfast',
  lunch: '午餐 · Lunch',
  dinner: '晚餐 · Dinner',
  snack: '小食 · Snack',
};

function groupByDate(plans: Plan[]) {
  return plans.reduce<Record<string, Plan[]>>((acc, plan) => {
    (acc[plan.planned_date] ??= []).push(plan);
    return acc;
  }, {});
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function RemoveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => { removeFromMealPlan(id); })}
      disabled={pending}
      className="text-xs text-stone-400 hover:text-red-500 disabled:opacity-50"
    >
      {pending ? '…' : 'Remove'}
    </button>
  );
}

export default function MealPlanList({ plans, locale }: { plans: Plan[]; locale: string }) {
  if (!plans.length) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-500">
        <p className="text-4xl">📅</p>
        <p className="mt-3 font-medium">No meals planned yet.</p>
        <p className="mt-1 text-sm">Go to a recipe and click "Add to Meal Plan".</p>
        <Link href={`/${locale}`} className="mt-4 inline-block text-sm font-medium text-stone-900 underline">
          Browse recipes →
        </Link>
      </div>
    );
  }

  const grouped = groupByDate(plans);

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(grouped).map(([date, dayPlans]) => (
        <div key={date}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
            {formatDate(date)}
          </h2>
          <div className="flex flex-col gap-2">
            {dayPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <span className="text-xl">{MEAL_EMOJI[plan.meal_type] ?? '🍽️'}</span>
                <div className="flex flex-1 flex-col">
                  <span className="text-xs text-stone-400">{MEAL_LABEL[plan.meal_type]}</span>
                  {plan.recipes ? (
                    <Link
                      href={`/${locale}/recipes/${plan.recipes.slug}`}
                      className="font-medium hover:underline"
                    >
                      {plan.recipes.title_zh}
                      <span className="ml-2 text-sm font-normal text-stone-400">
                        {plan.recipes.title_en}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-stone-400">Recipe deleted</span>
                  )}
                  {plan.notes && <p className="mt-0.5 text-xs text-stone-400">{plan.notes}</p>}
                </div>
                <RemoveButton id={plan.id} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
