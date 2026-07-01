'use client';

import { useActionState } from 'react';
import { signInWithEmail, signInWithGoogle } from '@/app/[locale]/login/actions';

type State = { error: string | null; sent?: boolean };

const initial: State = { error: null, sent: false };

async function action(_prev: State, formData: FormData): Promise<State> {
  const result = await signInWithEmail(formData);
  return { error: result.error, sent: !result.error };
}

export default function LoginForm({ locale: _locale }: { locale: string }) {
  const [state, dispatch, pending] = useActionState(action, initial);

  if (state.sent) {
    return (
      <div className="rounded-lg bg-green-50 px-4 py-6 text-center">
        <p className="text-lg">📬</p>
        <p className="mt-2 font-medium text-green-800">Check your email</p>
        <p className="mt-1 text-sm text-green-700">We sent you a magic link to sign in.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-xs text-stone-400">or</span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      <form action={dispatch} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
          />
        </div>
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {pending ? 'Sending…' : 'Send magic link'}
        </button>
      </form>
    </div>
  );
}
