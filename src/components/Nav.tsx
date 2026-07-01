import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import LocaleToggle from './LocaleToggle';
import NavAuth from './NavAuth';
import ThemeToggle from './ThemeToggle';

export default async function Nav({ locale }: { locale: string }) {
  const t = await getTranslations('nav');

  return (
    <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href={`/${locale}`} className="text-lg font-bold tracking-tight">
          🍳 DC&apos;s Kitchen
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link href={`/${locale}`} className="hidden text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 sm:block">
            {t('recipes')}
          </Link>
          <Link href={`/${locale}/meal-plan`} className="text-sm text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
            {t('mealPlan')}
          </Link>
          <LocaleToggle locale={locale} />
          <ThemeToggle />
          <NavAuth locale={locale} />
        </nav>
      </div>
    </header>
  );
}
