'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addToMealPlan(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const recipe_id = formData.get('recipe_id') as string;
  const planned_date = formData.get('planned_date') as string;
  const meal_type = formData.get('meal_type') as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('meal_plans') as any).insert({
    user_id: user.id,
    recipe_id,
    planned_date,
    meal_type,
  });

  if (error) return { error: error.message };
  revalidatePath('/meal-plan');
  return { error: null };
}

export async function removeFromMealPlan(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/meal-plan');
  return { error: null };
}
