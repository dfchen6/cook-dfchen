import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getCurrentUser, type SessionUser } from '@/lib/auth';
import { listVisibleRecipes } from '@/lib/data/recipes';
import { parseInstructionSteps } from '@/lib/parse-steps';
import { parseVideoUrls } from '@/lib/video';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let user: SessionUser | null = null;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (!token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 401 });
    }
    try {
      const claims = await adminAuth().verifyIdToken(token, true);
      user = {
        id: claims.uid,
        email: claims.email?.toLowerCase() ?? null,
        emailVerified: claims.email_verified === true,
      };
    } catch {
      return NextResponse.json({ error: 'token_expired_or_invalid' }, { status: 401 });
    }
  } else {
    user = await getCurrentUser();
  }

  const recipes = await listVisibleRecipes(user);

  const payload = recipes.map((r) => ({
    id: r.id,
    slug: r.slug,
    title_zh: r.title_zh,
    title_en: r.title_en,
    description_zh: r.description_zh,
    description_en: r.description_en,
    instructions: r.instructions,
    instructions_zh: r.instructions_zh,
    instructions_en: r.instructions_en,
    steps_zh: parseInstructionSteps(r.instructions_zh ?? r.instructions),
    steps_en: parseInstructionSteps(r.instructions_en ?? r.instructions),
    locale_primary: r.locale_primary,
    cover_image: r.cover_image,
    youtube_url: r.youtube_url,
    video_urls: r.video_urls,
    videos: parseVideoUrls(r.video_urls, r.youtube_url),
    prep_time_mins: r.prep_time_mins,
    cook_time_mins: r.cook_time_mins,
    servings: r.servings,
    tags: r.tags,
    is_public: r.is_public,
    created_at: r.created_at,
    updated_at: r.updated_at,
    ingredients: r.ingredients.map((ing) => ({
      id: ing.id,
      name_zh: ing.name_zh,
      name_en: ing.name_en,
      quantity: ing.quantity,
      unit: ing.unit,
      sort_order: ing.sort_order,
    })),
  }));

  return NextResponse.json(
    {
      authenticated: !!user,
      user: user ? { id: user.id, email: user.email } : null,
      count: payload.length,
      synced_at: new Date().toISOString(),
      recipes: payload,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  );
}
