'use client';

import { useTransition, useState } from 'react';
import { syncToGoogleCalendar } from '@/app/[locale]/meal-plan/sync-actions';

export default function GoogleCalendarSync({
  locale,
  connected,
}: {
  locale: string;
  connected: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ synced: number; error: string | null } | null>(null);

  if (!connected) {
    return (
      <a
        href={`/auth/google?locale=${locale}`}
        className="flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:border-stone-500 hover:text-stone-900"
      >
        <GoogleIcon />
        Connect Google Calendar
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {result && !result.error && (
        <span className="text-sm text-green-700">
          {result.synced === 0 ? '✓ All synced' : `✓ ${result.synced} event${result.synced > 1 ? 's' : ''} added`}
        </span>
      )}
      {result?.error && (
        <span className="text-sm text-red-600">{result.error}</span>
      )}
      <button
        onClick={() =>
          startTransition(async () => {
            const r = await syncToGoogleCalendar(locale);
            setResult(r);
          })
        }
        disabled={pending}
        className="flex items-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:border-stone-500 hover:text-stone-900 disabled:opacity-50"
      >
        <GoogleIcon />
        {pending ? 'Syncing…' : 'Sync to Google Calendar'}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
