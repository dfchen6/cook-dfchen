'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';
import { friendlyAuthError } from '@/lib/firebase/auth-client';

const STATE_STORAGE_KEY = 'cook_mobile_oauth_state';

export default function MobileLoginClient({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const [existingUser, setExistingUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completedUrl, setCompletedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkedRedirect = useRef(false);

  const isZh = locale === 'zh';

  const resolveState = useCallback((): string => {
    const fromQuery = searchParams.get('state')?.trim() ?? '';
    if (fromQuery) {
      try {
        window.sessionStorage.setItem(STATE_STORAGE_KEY, fromQuery);
      } catch {
        // Ignore storage errors
      }
      return fromQuery;
    }
    try {
      return window.sessionStorage.getItem(STATE_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  }, [searchParams]);

  const handoffToApp = useCallback(
    async (user: User) => {
      setBusy(true);
      setError(null);
      try {
        const state = resolveState();
        const idToken = await user.getIdToken(true);
        const refreshToken = user.refreshToken;
        const params = new URLSearchParams({
          state,
          idToken,
          refreshToken,
          email: user.email ?? '',
          uid: user.uid,
        });
        const callbackUrl = `cookdfchen://auth-callback?${params.toString()}`;
        setCompletedUrl(callbackUrl);
        window.location.replace(callbackUrl);
      } catch (err) {
        setError(friendlyAuthError(err) || 'Failed to complete mobile sign-in.');
        setBusy(false);
      }
    },
    [resolveState]
  );

  useEffect(() => {
    resolveState();
  }, [resolveState]);

  useEffect(() => {
    const auth = clientAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setExistingUser(u);
      setAuthReady(true);
    });

    if (!checkedRedirect.current) {
      checkedRedirect.current = true;
      (async () => {
        try {
          const result = await getRedirectResult(auth);
          if (result?.user) {
            await handoffToApp(result.user);
          }
        } catch (err) {
          setError(friendlyAuthError(err) || null);
        }
      })();
    }

    return () => unsubscribe();
  }, [handoffToApp]);

  async function startGoogleSignIn(switchAccount = false) {
    setError(null);
    setBusy(true);
    try {
      const auth = clientAuth();
      if (switchAccount && auth.currentUser) {
        await signOut(auth);
      }
      const provider = new GoogleAuthProvider();
      if (switchAccount) {
        provider.setCustomParameters({ prompt: 'select_account' });
      }
      // Prefer redirect inside iOS ASWebAuthenticationSession / Mobile Safari
      // so OAuth runs smoothly in the single system browser sheet.
      const isMobileSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobileSafari) {
        await signInWithRedirect(auth, provider);
        return;
      }
      try {
        const { user } = await signInWithPopup(auth, provider);
        await handoffToApp(user);
      } catch (popupErr) {
        const code = (popupErr as { code?: string })?.code ?? '';
        if (
          code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment'
        ) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }
    } catch (err) {
      const msg = friendlyAuthError(err);
      if (msg) setError(msg);
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-2xl">
          🍳
        </div>
        <h1 className="text-xl font-bold tracking-tight">
          {isZh ? '登录 Cook iOS' : 'Sign in to Cook iOS'}
        </h1>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
          {isZh
            ? '登录后自动同步你的私密与共享食谱，并离线保存到手机'
            : 'Sync all your private and shared recipes for offline kitchen use'}
        </p>
      </div>

      {completedUrl ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            {isZh ? '登录成功，正在返回 App…' : 'Signed in! Returning to the app…'}
          </p>
          <a
            href={completedUrl}
            className="w-full rounded-xl bg-stone-900 px-4 py-3 text-center text-sm font-semibold text-white dark:bg-stone-100 dark:text-stone-900"
          >
            {isZh ? '打开 Cook App' : 'Open Cook App'}
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {authReady && existingUser?.email && (
            <button
              type="button"
              disabled={busy}
              onClick={() => handoffToApp(existingUser)}
              className="flex w-full flex-col items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              <span className="text-sm font-semibold">
                {isZh ? '继续使用当前账号' : 'Continue as'}
              </span>
              <span className="mt-0.5 text-xs opacity-75">{existingUser.email}</span>
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => startGoogleSignIn(!!existingUser)}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-750"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            {busy
              ? isZh
                ? '正在跳转…'
                : 'Signing in…'
              : existingUser
                ? isZh
                  ? '切换其他 Google 账号'
                  : 'Use another Google account'
                : isZh
                  ? '使用 Google 账号登录'
                  : 'Continue with Google'}
          </button>

          {error && (
            <p className="mt-1 text-center text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
