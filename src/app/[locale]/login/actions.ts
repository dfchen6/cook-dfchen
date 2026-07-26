'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

function callbackUrl(origin: string | null, formData: FormData): string {
  const next = formData.get('next');
  const suffix =
    typeof next === 'string' && next.startsWith('/')
      ? `?next=${encodeURIComponent(next)}`
      : '';
  return `${origin}/auth/callback${suffix}`;
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin');

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl(origin, formData),
    },
  });

  return { error: error?.message ?? null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl(origin, formData),
    },
  });

  if (error || !data.url) throw new Error(error?.message ?? 'Failed to initiate Google sign-in');

  redirect(data.url);
}
