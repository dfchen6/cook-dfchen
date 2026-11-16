import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { ADMIN_EMAIL } from '@/lib/admin';

// Firebase Hosting / App Hosting only forward a cookie named `__session` to the backend.
export const SESSION_COOKIE = '__session';
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // Firebase maximum

export type SessionUser = {
  id: string;
  email: string | null;
  emailVerified: boolean;
};

/** The signed-in user for this request (verified session cookie), or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    // checkRevoked: signing out revokes refresh tokens, which invalidates old cookies too.
    const claims = await adminAuth().verifySessionCookie(cookie, true);
    return {
      id: claims.uid,
      email: claims.email?.toLowerCase() ?? null,
      emailVerified: claims.email_verified === true,
    };
  } catch {
    return null;
  }
});

/** Email is only trusted for authorization (admin, recipe sharing) once verified. */
export function verifiedEmail(user: SessionUser | null): string | null {
  return user?.emailVerified ? user.email : null;
}

export function isAdminUser(user: SessionUser | null): boolean {
  return verifiedEmail(user) === ADMIN_EMAIL.toLowerCase();
}
