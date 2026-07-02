'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { RestaurantPhoto } from '@/lib/supabase/types';

export default function PhotoGallery({ photos }: { photos: RestaurantPhoto[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!photos.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setLightbox(photo.image_url)}
            className="group relative aspect-square overflow-hidden rounded-lg"
          >
            <Image
              src={photo.image_url}
              alt={photo.caption ?? ''}
              fill
              className="object-cover transition group-hover:scale-105"
            />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 px-2 py-1.5 opacity-0 transition group-hover:opacity-100">
                <p className="text-xs text-white">{photo.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
            <button
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-900 shadow-lg"
              onClick={() => setLightbox(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
