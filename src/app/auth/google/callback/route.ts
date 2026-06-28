import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOAuth2Client } from '@/lib/google';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const locale = searchParams.get('state') ?? 'zh';

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/meal-plan?error=google_auth`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/${locale}/login`);
  }

  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  // Upsert tokens — use supabase admin via service role would be ideal,
  // but anon key + RLS works since the user is authenticated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('google_tokens') as any).upsert({
    user_id: user.id,
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token ?? null,
    expiry_date: tokens.expiry_date ?? null,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.redirect(`${origin}/${locale}/meal-plan?connected=1`);
}
