'use client';

import { useState, useTransition } from 'react';
import { batchImportRecipes } from '@/app/[locale]/admin/actions';
import type { RecipeImportItem } from '@/lib/supabase/types';

const SCHEMA_EXAMPLE = `[
  {
    "slug": "mapo-tofu",
    "title_zh": "麻婆豆腐",
    "title_en": "Mapo Tofu",
    "description_zh": "经典川菜",
    "description_en": "A classic Sichuan dish",
    "instructions_zh": "1. 热锅...",
    "instructions_en": "1. Heat wok...",
    "youtube_url": "https://youtube.com/watch?v=VIDEO_ID",
    "cover_image": null,
    "prep_time_mins": 10,
    "cook_time_mins": 15,
    "servings": 2,
    "tags": ["chinese", "spicy"],
    "locale_primary": "zh",
    "ingredients": [
      { "name_zh": "豆腐", "name_en": "Tofu", "quantity": "300", "unit": "g" },
      { "name_zh": "猪肉末", "name_en": "Ground Pork", "quantity": "100", "unit": "g" }
    ]
  }
]`;

type ImportResult = { slug: string; error: string | null };

export default function BatchImportForm() {
  const [json, setJson] = useState('');
  const [parsed, setParsed] = useState<RecipeImportItem[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [pending, startTransition] = useTransition();

  function handleParse() {
    setParseError(null);
    setParsed(null);
    setResults(null);
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) throw new Error('Top-level must be a JSON array');
      setParsed(data as RecipeImportItem[]);
    } catch (e) {
      setParseError((e as Error).message);
    }
  }

  function handleImport() {
    if (!parsed) return;
    startTransition(async () => {
      const res = await batchImportRecipes(parsed);
      setResults(res);
    });
  }

  const successCount = results?.filter((r) => !r.error).length ?? 0;
  const failCount = results?.filter((r) => r.error).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Schema hint */}
      <details className="rounded-lg border border-stone-200 dark:border-stone-700">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
          JSON Schema (copy as Gemini prompt context)
        </summary>
        <pre className="overflow-x-auto px-4 pb-4 text-xs text-stone-500 dark:text-stone-400">{SCHEMA_EXAMPLE}</pre>
      </details>

      {/* Paste area */}
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
          Paste Gemini JSON output
        </label>
        <textarea
          rows={12}
          value={json}
          onChange={(e) => { setJson(e.target.value); setParsed(null); setResults(null); }}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-600 dark:bg-stone-800"
          placeholder='[{ "slug": "...", ... }]'
        />
      </div>

      <button
        type="button"
        onClick={handleParse}
        disabled={!json.trim()}
        className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-40 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        Parse &amp; Preview
      </button>

      {parseError && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          Parse error: {parseError}
        </p>
      )}

      {/* Preview table */}
      {parsed && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Parsed <strong>{parsed.length}</strong> recipe{parsed.length !== 1 ? 's' : ''}. Review below, then import.
          </p>

          <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">#</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">Slug</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">ZH Title</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">EN Title</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">YouTube</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">Ingredients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {parsed.map((r, i) => (
                  <tr key={i} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                    <td className="px-3 py-2 text-stone-400">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs text-stone-600 dark:text-stone-400">{r.slug}</td>
                    <td className="px-3 py-2">{r.title_zh}</td>
                    <td className="px-3 py-2 text-stone-600 dark:text-stone-400">{r.title_en}</td>
                    <td className="px-3 py-2">
                      {r.youtube_url ? (
                        <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
                          Yes
                        </span>
                      ) : (
                        <span className="text-stone-300 dark:text-stone-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-stone-500">{r.ingredients?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!results && (
            <button
              type="button"
              onClick={handleImport}
              disabled={pending}
              className="rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
            >
              {pending ? 'Importing...' : `Import ${parsed.length} Recipe${parsed.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {successCount > 0 && <span className="text-green-700 dark:text-green-400">{successCount} imported successfully. </span>}
            {failCount > 0 && <span className="text-red-600 dark:text-red-400">{failCount} failed.</span>}
          </p>
          <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {results.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono text-xs">{r.slug}</td>
                    <td className="px-3 py-2">
                      {r.error ? (
                        <span className="text-red-600 dark:text-red-400">Error: {r.error}</span>
                      ) : (
                        <span className="text-green-700 dark:text-green-400">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
