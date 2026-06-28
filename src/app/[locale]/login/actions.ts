'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin');

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  return { error: error?.message ?? null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
