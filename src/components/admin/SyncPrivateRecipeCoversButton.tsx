'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PRIVATE_RECIPES } from '@/lib/private-recipes';
import { syncPrivateRecipeCoverBatch } from '@/app/[locale]/admin/actions';

export default function SyncPrivateRecipeCoversButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function handleSync() {
    setStatus(null);
    startTransition(async () => {
      const failed: string[] = [];
      let synced = 0;
      for (let index = 0; index < PRIVATE_RECIPES.length; index += 10) {
        const result = await syncPrivateRecipeCoverBatch(
          PRIVATE_RECIPES.slice(index, index + 10).map((recipe) => recipe.slug)
        );
        synced += result.synced;
        failed.push(...result.failed);
        setStatus(`Uploaded ${synced}/${PRIVATE_RECIPES.length} covers…`);
      }
      setStatus(failed.length ? `Uploaded ${synced}; ${failed.length} failed.` : `Uploaded all ${synced} covers.`);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleSync}
        disabled={pending}
        className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        {pending ? 'Uploading covers…' : 'Upload AI covers to Supabase'}
      </button>
      {status && <p className="text-sm text-stone-600 dark:text-stone-400">{status}</p>}
    </div>
  );
}
