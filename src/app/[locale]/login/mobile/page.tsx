import { Suspense } from 'react';
import MobileLoginClient from './MobileLoginClient';

export default async function MobileLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="mx-auto max-w-sm py-12">
      <Suspense fallback={<div className="text-center text-sm text-stone-500">Loading…</div>}>
        <MobileLoginClient locale={locale} />
      </Suspense>
    </div>
  );
}
