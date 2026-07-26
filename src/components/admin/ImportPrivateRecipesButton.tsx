'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { importPrivateRecipes } from '@/app/[locale]/admin/actions';
import SyncPrivateRecipeCoversButton from '@/components/admin/SyncPrivateRecipeCoversButton';

export default function ImportPrivateRecipesButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleImport() {
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const importResult = await importPrivateRecipes();
        setResult(importResult);
        router.refresh();
      } catch {
        setError('Import failed. Please try again.');
      }
    });
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">My private recipe collection</h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Imports the prepared recipes as private and unshared. Running it again updates them by slug.
          </p>
        </div>
        <button
          type="button"
          onClick={handleImport}
          disabled={pending}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          {pending ? 'Importing…' : 'Import private recipes'}
        </button>
      </div>
      {result && (
        <p className="mt-3 text-sm text-stone-700 dark:text-stone-300">
          Imported {result.imported} recipes{result.failed ? `; ${result.failed} failed.` : '.'}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <SyncPrivateRecipeCoversButton />
    </div>
  );
}
