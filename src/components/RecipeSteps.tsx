'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { RecipeStep } from '@/lib/parse-steps';

export default function RecipeSteps({ steps }: { steps: RecipeStep[] }) {
  const t = useTranslations('recipe');
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  const scrollToIndex = useCallback((index: number) => {
    const slide = slideRefs.current[index];
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const index = Math.round(track.scrollLeft / track.clientWidth);
        setActive((prev) => (prev === index ? prev : index));
      });
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (steps.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {steps.map((step, i) => (
          <div
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="w-full flex-none snap-start px-1"
          >
            <div className="flex min-h-64 flex-col rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900 sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white dark:bg-stone-100 dark:text-stone-900">
                  {i + 1}
                </span>
                {step.label && (
                  <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                    {step.label}
                  </h3>
                )}
              </div>
              <p className="flex-1 whitespace-pre-line text-lg leading-8 text-stone-700 dark:text-stone-300">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Prev / next controls — the scroller already handles touch swipe. */}
      {steps.length > 1 && (
        <>
          <button
            type="button"
            aria-label={t('prevStep')}
            disabled={active === 0}
            onClick={() => scrollToIndex(active - 1)}
            className="absolute left-0 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white p-2 text-stone-600 shadow-sm hover:text-stone-900 disabled:opacity-0 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={t('nextStep')}
            disabled={active === steps.length - 1}
            onClick={() => scrollToIndex(active + 1)}
            className="absolute right-0 top-1/2 hidden translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white p-2 text-stone-600 shadow-sm hover:text-stone-900 disabled:opacity-0 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 sm:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.94 10 7.21 6.29a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
        </>
      )}

      {/* Progress: counter + tappable dots */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {t('stepCounter', { current: active + 1, total: steps.length })}
        </span>
      </div>
      {steps.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t('stepCounter', { current: i + 1, total: steps.length })}
              onClick={() => scrollToIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active
                  ? 'w-6 bg-stone-900 dark:bg-stone-100'
                  : 'w-1.5 bg-stone-300 dark:bg-stone-700'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
