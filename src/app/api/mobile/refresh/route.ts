import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

type SecureTokenResponse = {
  id_token?: string;
  refresh_token?: string;
  expires_in?: string;
  user_id?: string;
};

export async function POST(request: NextRequest) {
  let refreshToken: unknown;
  try {
    ({ refreshToken } = await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
    return NextResponse.json({ error: 'missing_refresh_token' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://cook.dfchen.com/',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken.trim(),
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'refresh_rejected' }, { status: 401 });
    }

    const data = (await res.json()) as SecureTokenResponse;
    if (!data.id_token || !data.refresh_token) {
      return NextResponse.json({ error: 'invalid_refresh_response' }, { status: 401 });
    }

    const claims = await adminAuth().verifyIdToken(data.id_token, true);
    return NextResponse.json(
      {
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresIn: Number(data.expires_in ?? 3600),
        uid: claims.uid,
        email: claims.email?.toLowerCase() ?? null,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'refresh_failed' }, { status: 401 });
  }
}
