'use client';

import { useActionState } from 'react';
import { signInWithEmail } from '@/app/[locale]/login/actions';

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
  );
}
