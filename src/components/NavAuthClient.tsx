'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { signOut } from '@/app/[locale]/login/actions';
import { useRouter } from 'next/navigation';

export default function NavAuthClient({
  locale,
  email,
}: {
  locale: string;
  email: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!email) {
    return (
      <Link
        href={`/${locale}/login`}
        className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
      >
        登录 · Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-stone-400">{email}</span>
      <button
        onClick={() =>
          startTransition(async () => {
            await signOut();
            router.refresh();
          })
        }
        disabled={pending}
        className="text-xs text-stone-500 hover:text-stone-900 disabled:opacity-50"
      >
        {pending ? '…' : 'Logout'}
      </button>
    </div>
  );
}
