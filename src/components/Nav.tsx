'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LocaleToggle from './LocaleToggle';

export default function Nav({ locale }: { locale: string }) {
  const t = useTranslations('nav');

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href={`/${locale}`} className="text-xl font-semibold tracking-tight">
          🍳 cook.dfchen.com
        </Link>
        <nav className="flex items-center gap-6">
          <Link href={`/${locale}`} className="text-sm text-stone-600 hover:text-stone-900">
            {t('recipes')}
          </Link>
          <Link href={`/${locale}/meal-plan`} className="text-sm text-stone-600 hover:text-stone-900">
            {t('mealPlan')}
          </Link>
          <LocaleToggle locale={locale} />
        </nav>
      </div>
    </header>
  );
}
