'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function LocaleToggle({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function toggle() {
    const next = locale === 'zh' ? 'en' : 'zh';
    // Replace the locale segment in the path
    const newPath = pathname.replace(`/${locale}`, `/${next}`);
    router.push(newPath);
  }

  return (
    <button
      onClick={toggle}
      className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-stone-600 hover:border-stone-500 hover:text-stone-900"
    >
      {locale === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
