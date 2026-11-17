export type VideoLink =
  | { platform: 'youtube'; url: string; embedId: string }
  | { platform: 'xiaohongshu'; url: string }
  | { platform: 'other'; url: string };

// Xiaohongshu's share button copies text like "【标题】… http://xhslink.com/a/xxx 复制本条信息…",
// so pull URLs out of whatever was pasted.
export function extractUrl(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s，。！？、,]+/);
  return match ? match[0] : null;
}

export function extractAllUrls(input: string | null | undefined): string[] {
  if (!input) return [];
  return [...new Set((input.match(/https?:\/\/[^\s，。！？、,]+/g) ?? []).map((u) => u.trim()).filter(Boolean))];
}

export function normalizeVideoUrls(
  videoUrls?: string[] | null,
  legacyUrl?: string | null
): string[] {
  const raw: string[] = [];
  for (const item of videoUrls ?? []) {
    raw.push(...extractAllUrls(item));
  }
  if (!raw.length && legacyUrl) {
    raw.push(...extractAllUrls(legacyUrl));
  }
  return [...new Set(raw)];
}

function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^(www\.|m\.)/, '');
  if (host === 'youtu.be') return u.pathname.slice(1) || null;
  if (host !== 'youtube.com') return null;
  const v = u.searchParams.get('v');
  if (v) return v;
  const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
  return m ? m[1] : null;
}

export function parseVideoUrl(input: string | null | undefined): VideoLink | null {
  if (!input) return null;
  const raw = extractUrl(input.trim());
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const id = youtubeId(u);
  if (id) return { platform: 'youtube', url: raw, embedId: id };
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'xhslink.com' || host.endsWith('xiaohongshu.com') || host.endsWith('rednote.com')) {
    return { platform: 'xiaohongshu', url: raw };
  }
  return { platform: 'other', url: raw };
}

export function parseVideoUrls(
  videoUrls?: string[] | null,
  legacyUrl?: string | null
): VideoLink[] {
  return normalizeVideoUrls(videoUrls, legacyUrl)
    .map((u) => parseVideoUrl(u))
    .filter((v): v is VideoLink => v !== null);
}

/** Pick the highest-resolution available thumbnail from one or more video URLs, or null. */
export async function resolveYoutubeThumbnail(
  input: string | string[] | null | undefined
): Promise<string | null> {
  const urls = Array.isArray(input) ? normalizeVideoUrls(input) : extractAllUrls(input);
  for (const raw of urls) {
    const parsed = parseVideoUrl(raw);
    if (parsed?.platform !== 'youtube') continue;
    for (const variant of ['maxresdefault.jpg', 'sddefault.jpg', 'hqdefault.jpg']) {
      const url = `https://i.ytimg.com/vi/${parsed.embedId}/${variant}`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) return url;
      } catch {
        // Try next resolution / next video URL.
      }
    }
  }
  return null;
}
