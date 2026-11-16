'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { finishEmailLink, friendlyAuthError, isEmailLink, rememberedEmail } from '@/lib/firebase/auth-client';

// Landing page for the email sign-in link sent by LoginForm.
export default function FinishEmailLink({ locale }: { locale: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get('next');
  const destination = nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : `/${locale}`;
  const [needsEmail, setNeedsEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function complete(email: string) {
    try {
      await finishEmailLink(email, window.location.href);
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      if (!isEmailLink(window.location.href)) {
        setError('This sign-in link is invalid.');
        return;
      }
      const email = rememberedEmail();
      // Opened on a different device/browser: ask which email the link was sent to.
      if (email) await complete(email);
      else setNeedsEmail(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        <a href={`/${locale}/login`} className="text-sm text-stone-500 underline">Back to login</a>
      </div>
    );
  }

  if (needsEmail) {
    return (
      <form
        className="flex flex-col gap-4"
        action={(formData) => complete(String(formData.get('email') ?? '').trim())}
      >
        <label htmlFor="email" className="text-sm text-stone-600 dark:text-stone-300">
          Confirm the email address this link was sent to:
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800"
        />
        <button type="submit" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white dark:bg-stone-100 dark:text-stone-900">
          Sign in
        </button>
      </form>
    );
  }

  return <p className="text-sm text-stone-500">Signing you in…</p>;
}
