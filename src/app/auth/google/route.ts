import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAuthUrl } from '@/lib/google';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL('/zh/login', request.url));
  }

  // Pass locale from referer so we can redirect back correctly
  const locale = request.nextUrl.searchParams.get('locale') ?? 'zh';
  const url = getAuthUrl(locale);
  return NextResponse.redirect(url);
}
