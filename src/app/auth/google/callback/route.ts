import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { saveGoogleTokens } from '@/lib/data/meal-plans';
import { getOAuth2Client } from '@/lib/google';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const locale = searchParams.get('state') ?? 'zh';

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/meal-plan?error=google_auth`);
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/${locale}/login`);
  }

  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  // Stored server-side only (Firestore rules deny all client access).
  await saveGoogleTokens(user.id, {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token ?? null,
    expiry_date: tokens.expiry_date ?? null,
  });

  return NextResponse.redirect(`${origin}/${locale}/meal-plan?connected=1`);
}
