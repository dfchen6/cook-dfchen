'use client';

import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
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

export async function signInWithGoogle() {
  const { user } = await signInWithPopup(clientAuth(), new GoogleAuthProvider());
  await createServerSession(user);
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
