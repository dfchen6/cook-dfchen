'use client';

import { useState } from 'react';
import type { VideoLink } from '@/lib/video';

type Props = {
  videos: VideoLink[];
  title: string;
  heading: string;
  watchOnXiaohongshu: string;
  watchVideo: string;
  locale: string;
};

export default function RecipeVideos({
  videos,
  title,
  heading,
  watchOnXiaohongshu,
  watchVideo,
  locale,
}: Props) {
  const youtubeVideos = videos.filter(
    (v): v is Extract<VideoLink, { platform: 'youtube' }> => v.platform === 'youtube'
  );
  const externalVideos = videos.filter((v) => v.platform !== 'youtube');
  const [activeYt, setActiveYt] = useState(0);

  if (!videos.length) return null;

  const currentYt = youtubeVideos[activeYt] ?? youtubeVideos[0];

  return (
    <div className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{heading}</h2>
        {youtubeVideos.length > 1 && (
          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-stone-200 p-1 text-sm dark:border-stone-700">
            {youtubeVideos.map((yt, idx) => (
              <button
                key={yt.embedId}
                type="button"
                onClick={() => setActiveYt(idx)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  idx === activeYt
                    ? 'bg-stone-900 font-medium text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                }`}
              >
                ▶ {locale === 'zh' ? `教程 ${idx + 1}` : `Video ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {currentYt && (
        <div className="aspect-video w-full overflow-hidden rounded-xl">
          <iframe
            key={currentYt.embedId}
            src={`https://www.youtube.com/embed/${currentYt.embedId}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      {externalVideos.length > 0 && (
        <div className={currentYt ? 'mt-3 flex flex-col gap-2' : 'flex flex-col gap-2'}>
          {externalVideos.map((v, idx) => {
            const suffix = externalVideos.length > 1 ? ` ${idx + 1}` : '';
            return (
              <a
                key={v.url}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 rounded-xl border px-5 py-4 transition-colors ${
                  v.platform === 'xiaohongshu'
                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                <span className="text-2xl">{v.platform === 'xiaohongshu' ? '📕' : '▶'}</span>
                <span className="font-medium">
                  {(v.platform === 'xiaohongshu' ? watchOnXiaohongshu : watchVideo) + suffix}
                </span>
                <span className="ml-auto">↗</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
