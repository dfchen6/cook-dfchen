import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale } = await params;
  const { error, next } = await searchParams;
  const safeNext = next?.startsWith('/') ? next : null;

  // Already logged in → redirect to destination (or home)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(safeNext ?? `/${locale}`);

  return (
    <div className="mx-auto max-w-sm pt-16">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <h1 className="mb-2 text-2xl font-bold">登录 · Login</h1>
        <p className="mb-6 text-sm text-stone-500">
          Enter your email — we&#39;ll send you a magic link.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            Something went wrong. Please try again.
          </p>
        )}
        <LoginForm locale={locale} next={safeNext} />
      </div>
    </div>
  );
}
