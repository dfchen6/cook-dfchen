import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/google';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL('/zh/login', request.url));
  }

  // Pass locale from referer so we can redirect back correctly
  const locale = request.nextUrl.searchParams.get('locale') ?? 'zh';
  const url = getAuthUrl(locale);
  return NextResponse.redirect(url);
}
