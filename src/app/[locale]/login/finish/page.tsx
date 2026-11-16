import { Suspense } from 'react';
import FinishEmailLink from '@/components/FinishEmailLink';

export default async function FinishLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="mx-auto max-w-sm pt-16">
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <h1 className="mb-6 text-2xl font-bold">登录 · Login</h1>
        <Suspense fallback={<p className="text-sm text-stone-500">Signing you in…</p>}>
          <FinishEmailLink locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}
