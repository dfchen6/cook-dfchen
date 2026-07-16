'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertRecipe } from '@/app/[locale]/admin/actions';
import type { RecipeImportItem } from '@/lib/supabase/types';

type IngredientRow = {
  name_zh: string;
  name_en: string;
  quantity: string;
  unit: string;
};

type Props = {
  locale: string;
  initial?: RecipeImportItem | null;
};

const emptyIngredient = (): IngredientRow => ({ name_zh: '', name_en: '', quantity: '', unit: '' });

export default function RecipeEditForm({ locale, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Basic fields
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [titleZh, setTitleZh] = useState(initial?.title_zh ?? '');
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? '');
  const [descZh, setDescZh] = useState(initial?.description_zh ?? '');
  const [descEn, setDescEn] = useState(initial?.description_en ?? '');
  const [instZh, setInstZh] = useState(initial?.instructions_zh ?? '');
  const [instEn, setInstEn] = useState(initial?.instructions_en ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtube_url ?? '');
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? '');
  const [prepTime, setPrepTime] = useState(String(initial?.prep_time_mins ?? ''));
  const [cookTime, setCookTime] = useState(String(initial?.cook_time_mins ?? ''));
  const [servings, setServings] = useState(String(initial?.servings ?? ''));
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [localePrimary, setLocalePrimary] = useState<'zh' | 'en'>(initial?.locale_primary ?? 'zh');
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [sharedWith, setSharedWith] = useState((initial?.shared_with ?? []).join(', '));
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients?.length
      ? initial.ingredients.map(({ name_zh, name_en, quantity, unit }) => ({ name_zh, name_en, quantity, unit }))
      : [emptyIngredient()]
  );

  function addIngredient() {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateIngredient(i: number, field: keyof IngredientRow, value: string) {
    setIngredients((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const data: RecipeImportItem = {
      slug,
      title_zh: titleZh,
      title_en: titleEn,
      description_zh: descZh || null,
      description_en: descEn || null,
      instructions_zh: instZh || null,
      instructions_en: instEn || null,
      youtube_url: youtubeUrl || null,
      cover_image: coverImage || null,
      prep_time_mins: prepTime ? Number(prepTime) : null,
      cook_time_mins: cookTime ? Number(cookTime) : null,
      servings: servings ? Number(servings) : null,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      locale_primary: localePrimary,
      is_public: isPublic,
      shared_with: isPublic ? [] : sharedWith.split(',').map((e) => e.trim()).filter(Boolean),
      ingredients: ingredients.filter((ing) => ing.name_zh || ing.name_en),
    };

    startTransition(async () => {
      const result = await upsertRecipe(data);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Saved! Slug: ${result.slug}`);
        if (!initial) {
          router.push(`/${locale}/admin`);
        }
      }
    });
  }

  const inputCls = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-600 dark:bg-stone-800';
  const labelCls = 'block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1';
  const sectionCls = 'mb-6';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identifiers */}
      <div className={sectionCls}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">Identifiers</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Slug *</label>
            <input required value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} placeholder="mapo-tofu" />
          </div>
          <div>
            <label className={labelCls}>Locale Primary</label>
            <select value={localePrimary} onChange={(e) => setLocalePrimary(e.target.value as 'zh' | 'en')} className={inputCls}>
              <option value="zh">Chinese (zh)</option>
              <option value="en">English (en)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Titles */}
      <div className={sectionCls}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">Titles</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Title ZH *</label>
            <input required value={titleZh} onChange={(e) => setTitleZh(e.target.value)} className={inputCls} placeholder="麻婆豆腐" />
          </div>
          <div>
            <label className={labelCls}>Title EN *</label>
            <input required value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className={inputCls} placeholder="Mapo Tofu" />
          </div>
        </div>
      </div>

      {/* Descriptions */}
      <div className={sectionCls}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">Description</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Description ZH</label>
            <textarea rows={2} value={descZh} onChange={(e) => setDescZh(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description EN</label>
            <textarea rows={2} value={descEn} onChange={(e) => setDescEn(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Media */}
      <div className={sectionCls}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">Media</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Cover Image URL</label>
            <input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className={inputCls} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>YouTube URL</label>
            <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className={inputCls} placeholder="https://youtube.com/watch?v=..." />
          </div>
        </div>
      </div>

      {/* Visibility */}
      <div className={sectionCls}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">Visibility</h3>
        <div className="flex items-center gap-2">
          <input
            id="is-public"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 dark:border-stone-600"
          />
          <label htmlFor="is-public" className="text-sm">Public (visible to everyone)</label>
        </div>
        {!isPublic && (
          <div className="mt-3">
            <label className={labelCls}>Shared with (comma-separated gmail addresses)</label>
            <input
              value={sharedWith}
              onChange={(e) => setSharedWith(e.target.value)}
              className={inputCls}
              placeholder="friend@gmail.com, family@gmail.com"
            />
            <p className="mt-1 text-xs text-stone-400">Only you and these people can view this recipe once they sign in.</p>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className={sectionCls}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">Meta</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className={labelCls}>Prep Time (min)</label>
            <input type="number" min={0} value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Cook Time (min)</label>
            <input type="number" min={0} value={cookTime} onChange={(e) => setCookTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Servings</label>
            <input type="number" min={1} value={servings} onChange={(e) => setServings(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="chinese, spicy" />
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className={sectionCls}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">Ingredients</h3>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_80px_80px_32px] gap-2 items-center">
              <input value={ing.name_zh} onChange={(e) => updateIngredient(i, 'name_zh', e.target.value)} className={inputCls} placeholder="食材名" />
              <input value={ing.name_en} onChange={(e) => updateIngredient(i, 'name_en', e.target.value)} className={inputCls} placeholder="Ingredient" />
              <input value={ing.quantity} onChange={(e) => updateIngredient(i, 'quantity', e.target.value)} className={inputCls} placeholder="Qty" />
              <input value={ing.unit} onChange={(e) => updateIngredient(i, 'unit', e.target.value)} className={inputCls} placeholder="Unit" />
              <button type="button" onClick={() => removeIngredient(i)} className="text-stone-400 hover:text-red-500 text-lg leading-none">x</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addIngredient} className="mt-2 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100">
          + Add ingredient
        </button>
        {ingredients.length > 0 && (
          <p className="mt-1 text-xs text-stone-400">Columns: ZH name · EN name · Quantity · Unit</p>
        )}
      </div>

      {/* Instructions */}
      <div className={sectionCls}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400">Instructions</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Instructions ZH</label>
            <textarea rows={8} value={instZh} onChange={(e) => setInstZh(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Instructions EN</label>
            <textarea rows={8} value={instEn} onChange={(e) => setInstEn(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Footer */}
      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{error}</p>}
      {success && <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">{success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
      >
        {pending ? 'Saving...' : 'Save Recipe'}
      </button>
    </form>
  );
}
