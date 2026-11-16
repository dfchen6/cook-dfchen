// Tokenless Cloud Storage download URL. Only works for objects whose Storage rules allow
// public reads (recipes/**). Private restaurant images use getDownloadURL() tokens instead.
export function publicStorageUrl(objectPath: string): string {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const host =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'
      ? 'http://127.0.0.1:9199'
      : 'https://firebasestorage.googleapis.com';
  return `${host}/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

const OPTIMIZED_HOSTS = new Set(['firebasestorage.googleapis.com', 'i.ytimg.com', '127.0.0.1']);

/** True when `src` matches `images.remotePatterns` in next.config.ts (or is local). */
export function isOptimizableImageUrl(src: string): boolean {
  if (src.startsWith('/')) return true;
  try {
    return OPTIMIZED_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}
