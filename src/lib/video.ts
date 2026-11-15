export type VideoLink =
  | { platform: 'youtube'; url: string; embedId: string }
  | { platform: 'xiaohongshu'; url: string }
  | { platform: 'other'; url: string };

// Xiaohongshu's share button copies text like "【标题】… http://xhslink.com/a/xxx 复制本条信息…",
// so pull the first URL out of whatever was pasted.
export function extractUrl(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s，。！？、]+/);
  return match ? match[0] : null;
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
  if (host === 'xhslink.com' || host.endsWith('xiaohongshu.com')) {
    return { platform: 'xiaohongshu', url: raw };
  }
  return { platform: 'other', url: raw };
}
