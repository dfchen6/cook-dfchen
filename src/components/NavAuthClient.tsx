'use client';

import Link from 'next/link';
import { useTransition, useState, useRef, useEffect } from 'react';
import { signOut } from '@/app/[locale]/login/actions';
import { useRouter } from 'next/navigation';

export default function NavAuthClient({
  locale,
  email,
  isAdmin,
}: {
  locale: string;
  email: string | null;
  isAdmin?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  // Abbreviate email for the button label on small screens
  const label = email.split('@')[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        <span className="max-w-[80px] truncate sm:max-w-[120px]">{label}</span>
        <svg
          className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {/* Email header */}
          <div className="border-b border-stone-100 px-4 py-2.5 dark:border-stone-800">
            <p className="truncate text-xs text-stone-400">{email}</p>
          </div>

          {/* Admin links */}
          {isAdmin && (
            <div className="border-b border-stone-100 py-1 dark:border-stone-800">
              <p className="px-4 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400">Admin</p>
              <Link
                href={`/${locale}/admin`}
                onClick={() => setOpen(false)}
                className="flex w-full items-center px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Recipes
              </Link>
              <Link
                href={`/${locale}/admin/restaurants`}
                onClick={() => setOpen(false)}
                className="flex w-full items-center px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Restaurants
              </Link>
            </div>
          )}

          {/* Logout */}
          <div className="py-1">
            <button
              onClick={() =>
                startTransition(async () => {
                  setOpen(false);
                  await signOut();
                  router.refresh();
                })
              }
              disabled={pending}
              className="flex w-full items-center px-4 py-2 text-sm text-red-500 hover:bg-stone-50 disabled:opacity-50 dark:hover:bg-stone-800"
            >
              {pending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
