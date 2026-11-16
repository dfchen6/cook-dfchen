import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from '@/lib/auth';

// Exchange a fresh Firebase ID token (from the browser, right after sign-in)
// for an httpOnly session cookie that server components can verify.
export async function POST(request: NextRequest) {
  let idToken: unknown;
  try {
    ({ idToken } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (typeof idToken !== 'string' || !idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    // Only mint sessions for recent sign-ins, so a leaked old ID token can't be upgraded.
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return NextResponse.json({ error: 'Recent sign-in required' }, { status: 401 });
    }
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    (await cookies()).set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

// Sign out: clear the cookie and revoke refresh tokens so existing session cookies stop working.
export async function DELETE() {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  store.delete(SESSION_COOKIE);
  if (cookie) {
    try {
      const { uid } = await adminAuth().verifySessionCookie(cookie);
      await adminAuth().revokeRefreshTokens(uid);
    } catch {
      // Already invalid — nothing to revoke.
    }
  }
  return NextResponse.json({ ok: true });
}
