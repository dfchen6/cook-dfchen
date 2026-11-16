'use client';

import {
  GoogleAuthProvider,
  getRedirectResult,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';

const EMAIL_KEY = 'emailForSignIn';

/** Turn a fresh Firebase sign-in into the server-side `__session` cookie. */
async function createServerSession(user: User) {
  const idToken = await user.getIdToken(true);
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error('Could not start a session. Please try again.');
}

/**
 * Sign in with Google. Uses a same-origin popup first; if popups are blocked or
 * unsupported (e.g. mobile / embedded webview), falls back to same-origin redirect.
 * Returns `'completed'` when the session cookie is ready, or `'redirecting'` if navigating away.
 */
export async function signInWithGoogle(): Promise<'completed' | 'redirecting'> {
  const provider = new GoogleAuthProvider();
  try {
    const { user } = await signInWithPopup(clientAuth(), provider);
    await createServerSession(user);
    return 'completed';
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(clientAuth(), provider);
      return 'redirecting';
    }
    throw err;
  }
}

/** Complete a Google redirect sign-in if the page just returned from one. */
export async function completeRedirectSignIn(): Promise<boolean> {
  const result = await getRedirectResult(clientAuth());
  if (!result?.user) return false;
  await createServerSession(result.user);
  return true;
}

export async function sendEmailLink(email: string, finishUrl: string) {
  await sendSignInLinkToEmail(clientAuth(), email, { url: finishUrl, handleCodeInApp: true });
  window.localStorage.setItem(EMAIL_KEY, email);
}

export function isEmailLink(url: string) {
  return isSignInWithEmailLink(clientAuth(), url);
}

export function rememberedEmail() {
  return window.localStorage.getItem(EMAIL_KEY);
}

export async function finishEmailLink(email: string, url: string) {
  const { user } = await signInWithEmailLink(clientAuth(), email, url);
  window.localStorage.removeItem(EMAIL_KEY);
  await createServerSession(user);
}

export async function signOutEverywhere() {
  await fetch('/api/session', { method: 'DELETE' });
  await signOut(clientAuth());
}

export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  if (code === 'auth/invalid-action-code') return 'This sign-in link has expired or was already used.';
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  return (err as Error)?.message ?? 'Something went wrong. Please try again.';
}
