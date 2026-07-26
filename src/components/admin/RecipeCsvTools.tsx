'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { batchImportRecipes, getRecipesForCsvExport } from '@/app/[locale]/admin/actions';
import { parseRecipeCsv, recipesToCsv } from '@/lib/recipe-csv';
import type { RecipeImportItem } from '@/lib/supabase/types';

const MAX_FILE_SIZE = 750 * 1024;

type ImportResult = { slug: string; error: string | null };

export default function RecipeCsvTools() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<RecipeImportItem[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setItems(null);
    setResults(null);
    setErrors([]);
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrors(['CSV files must be 750 KB or smaller.']);
      return;
    }

    const { items: parsedItems, errors: parseErrors } = parseRecipeCsv(await file.text());
    setErrors(parseErrors);
    setItems(parseErrors.length ? null : parsedItems);
  }

  function handleExport() {
    setExportError(null);
    startTransition(async () => {
      try {
        const csv = recipesToCsv(await getRecipesForCsvExport());
        const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = href;
        link.download = `recipes-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(href);
      } catch {
        setExportError('Export failed. Please try again.');
      }
    });
  }

  function handleImport() {
    if (!items) return;
    startTransition(async () => {
      const importResults = await batchImportRecipes(items);
      setResults(importResults);
      if (importResults.some((result) => !result.error)) router.refresh();
    });
  }

  const successCount = results?.filter((result) => !result.error).length ?? 0;
  const failureCount = results?.filter((result) => result.error).length ?? 0;

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">CSV backup and import</h2>
          <p className="mt-1 text-sm text-stone-500">
            One recipe per row. Ingredients and shared emails are preserved in JSON columns.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={pending}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          {pending ? 'Working…' : 'Export all recipes as CSV'}
        </button>
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-stone-600 file:mr-4 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200 dark:text-stone-400 dark:file:bg-stone-800 dark:file:text-stone-300"
        />
        <p className="mt-1 text-xs text-stone-400">Maximum file size: 750 KB. Imports update existing recipes by slug.</p>
      </div>

      {exportError && <p className="text-sm text-red-600 dark:text-red-400">{exportError}</p>}
      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <p className="font-medium">The CSV could not be imported:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.slice(0, 10).map((error) => <li key={error}>{error}</li>)}
          </ul>
          {errors.length > 10 && <p className="mt-1">And {errors.length - 10} more errors.</p>}
        </div>
      )}

      {items && !results && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-stone-50 p-3 dark:bg-stone-800">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Ready to import <strong>{items.length}</strong> recipe{items.length === 1 ? '' : 's'}.
          </p>
          <button
            type="button"
            onClick={handleImport}
            disabled={pending}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            {pending ? 'Importing…' : 'Import CSV'}
          </button>
        </div>
      )}

      {results && (
        <p className="text-sm">
          {successCount > 0 && <span className="text-green-700 dark:text-green-400">{successCount} imported. </span>}
          {failureCount > 0 && <span className="text-red-600 dark:text-red-400">{failureCount} failed.</span>}
        </p>
      )}
    </section>
  );
}
