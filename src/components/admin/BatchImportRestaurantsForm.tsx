'use client';

import { useState, useTransition } from 'react';
import { batchImportRestaurants, type RestaurantInput } from '@/app/[locale]/admin/restaurants/actions';

const SCHEMA_EXAMPLE = `[
  {
    "name": "Din Tai Fung",
    "name_zh": "鼎泰丰",
    "cuisine": "Taiwanese",
    "address": "No.194, Xinyi Rd, Sec.2",
    "city": "Taipei",
    "country": "TW",
    "tags": ["dim sum", "soup dumplings", "michelin"],
    "overall_rating": 5,
    "price_level": 3,
    "visited_at": "2024-03-15",
    "notes": "Best XLB in the world. Get there early.",
    "cover_image": "https://...",
    "lat": 25.033,
    "lng": 121.543,
    "google_maps_url": "https://maps.google.com/?q=...",
    "dishes": [
      {
        "name": "Xiao Long Bao",
        "name_zh": "小笼包",
        "description": "Thin-skinned pork soup dumplings",
        "image_url": "https://...",
        "rating": 5,
        "recommended": true
      }
    ],
    "photos": [
      { "image_url": "https://...", "caption": "Interior" }
    ]
  }
]`;

type ImportResult = { name: string; error: string | null };

export default function BatchImportRestaurantsForm() {
  const [json, setJson] = useState('');
  const [parsed, setParsed] = useState<RestaurantInput[] | null>(null);
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
      setParsed(data as RestaurantInput[]);
    } catch (e) {
      setParseError((e as Error).message);
    }
  }

  function handleImport() {
    if (!parsed) return;
    startTransition(async () => {
      const res = await batchImportRestaurants(parsed);
      setResults(res);
    });
  }

  const successCount = results?.filter((r) => !r.error).length ?? 0;
  const failCount = results?.filter((r) => r.error).length ?? 0;

  return (
    <div className="space-y-6">
      <details className="rounded-lg border border-stone-200 dark:border-stone-700">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
          JSON Schema (copy as Gemini prompt context)
        </summary>
        <pre className="overflow-x-auto px-4 pb-4 text-xs text-stone-500 dark:text-stone-400">{SCHEMA_EXAMPLE}</pre>
      </details>

      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
          Paste JSON
        </label>
        <textarea
          rows={12}
          value={json}
          onChange={(e) => { setJson(e.target.value); setParsed(null); setResults(null); }}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-600 dark:bg-stone-800"
          placeholder='[{ "name": "...", ... }]'
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

      {parsed && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Parsed <strong>{parsed.length}</strong> restaurant{parsed.length !== 1 ? 's' : ''}. Review then import.
          </p>

          <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-800">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">#</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">City</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">Cuisine</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">Rating</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">Dishes</th>
                  <th className="px-3 py-2 text-left font-medium text-stone-500">Photos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {parsed.map((r, i) => (
                  <tr key={i} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                    <td className="px-3 py-2 text-stone-400">{i + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{r.name}</p>
                      {r.name_zh && <p className="text-xs text-stone-400">{r.name_zh}</p>}
                    </td>
                    <td className="px-3 py-2 text-stone-500">{r.city ?? '—'}</td>
                    <td className="px-3 py-2 text-stone-500">{r.cuisine ?? '—'}</td>
                    <td className="px-3 py-2 text-amber-400 text-xs">
                      {r.overall_rating ? '★'.repeat(r.overall_rating) : '—'}
                    </td>
                    <td className="px-3 py-2 text-stone-500">{r.dishes?.length ?? 0}</td>
                    <td className="px-3 py-2 text-stone-500">{r.photos?.length ?? 0}</td>
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
              {pending ? 'Importing...' : `Import ${parsed.length} Restaurant${parsed.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      {results && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {successCount > 0 && <span className="text-green-700 dark:text-green-400">{successCount} imported. </span>}
            {failCount > 0 && <span className="text-red-600 dark:text-red-400">{failCount} failed.</span>}
          </p>
          <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-700">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {results.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2">
                      {r.error
                        ? <span className="text-red-600 dark:text-red-400">Error: {r.error}</span>
                        : <span className="text-green-700 dark:text-green-400">OK</span>}
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
