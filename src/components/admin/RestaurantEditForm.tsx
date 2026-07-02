'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertRestaurant, type DishInput, type PhotoInput } from '@/app/[locale]/admin/restaurants/actions';
import type { RestaurantWithDetails } from '@/lib/supabase/types';
import ImageUploadInput from './ImageUploadInput';

type Props = {
  locale: string;
  initial?: RestaurantWithDetails | null;
};

const emptyDish = (): DishInput => ({ name: '', name_zh: '', description: '', image_url: '', rating: null, recommended: true });
const inputCls = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-600 dark:bg-stone-800';
const labelCls = 'block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1';
const sectionCls = 'mb-8';
const headingCls = 'mb-3 text-sm font-semibold uppercase tracking-wider text-stone-400';

export default function RestaurantEditForm({ locale, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Basic
  const [name, setName] = useState(initial?.name ?? '');
  const [nameZh, setNameZh] = useState(initial?.name_zh ?? '');
  const [cuisine, setCuisine] = useState(initial?.cuisine ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [notes, setNotes] = useState(initial?.notes ?? '');

  // Location
  const [lat, setLat] = useState(String(initial?.lat ?? ''));
  const [lng, setLng] = useState(String(initial?.lng ?? ''));
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initial?.google_maps_url ?? '');

  // Meta
  const [rating, setRating] = useState(String(initial?.overall_rating ?? ''));
  const [priceLevel, setPriceLevel] = useState(String(initial?.price_level ?? ''));
  const [visitedAt, setVisitedAt] = useState(initial?.visited_at ?? '');

  // Media
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? '');

  // Dishes
  const [dishes, setDishes] = useState<DishInput[]>(
    initial?.restaurant_dishes?.length
      ? initial.restaurant_dishes.map(({ name, name_zh, description, image_url, rating, recommended }) => ({
          name, name_zh, description, image_url, rating, recommended,
        }))
      : [emptyDish()]
  );

  // Photos
  const [photos, setPhotos] = useState<PhotoInput[]>(
    initial?.restaurant_photos?.map(({ image_url, caption }) => ({ image_url, caption })) ?? []
  );

  function updateDish(i: number, patch: Partial<DishInput>) {
    setDishes((prev) => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  }
  function removeDish(i: number) { setDishes((prev) => prev.filter((_, idx) => idx !== i)); }
  function addDish() { setDishes((prev) => [...prev, emptyDish()]); }

  function addPhoto() { setPhotos((prev) => [...prev, { image_url: '', caption: '' }]); }
  function updatePhoto(i: number, patch: Partial<PhotoInput>) {
    setPhotos((prev) => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  }
  function removePhoto(i: number) { setPhotos((prev) => prev.filter((_, idx) => idx !== i)); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const data = {
      ...(initial?.id ? { id: initial.id } : {}),
      name,
      name_zh: nameZh || null,
      cuisine: cuisine || null,
      address: address || null,
      city: city || null,
      country: country || null,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      notes: notes || null,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      google_maps_url: googleMapsUrl || null,
      overall_rating: rating ? Number(rating) : null,
      price_level: priceLevel ? Number(priceLevel) : null,
      visited_at: visitedAt || null,
      cover_image: coverImage || null,
      dishes: dishes.filter((d) => d.name.trim()),
      photos: photos.filter((p) => p.image_url.trim()),
    };

    startTransition(async () => {
      const result = await upsertRestaurant(data);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Saved!');
        if (!initial) router.push(`/${locale}/admin/restaurants`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">

      {/* Basic Info */}
      <div className={sectionCls}>
        <h3 className={headingCls}>Basic Info</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Name (EN) *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Din Tai Fung" />
          </div>
          <div>
            <label className={labelCls}>Name (ZH)</label>
            <input value={nameZh} onChange={(e) => setNameZh(e.target.value)} className={inputCls} placeholder="鼎泰丰" />
          </div>
          <div>
            <label className={labelCls}>Cuisine</label>
            <input value={cuisine} onChange={(e) => setCuisine(e.target.value)} className={inputCls} placeholder="Chinese, Japanese, Italian..." />
          </div>
          <div>
            <label className={labelCls}>Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="dim sum, soup dumplings, michelin" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="123 Main St" />
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="Shanghai" />
          </div>
          <div>
            <label className={labelCls}>Country</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} placeholder="CN" />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className={sectionCls}>
        <h3 className={headingCls}>Details</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className={labelCls}>My Rating (1–5)</label>
            <select value={rating} onChange={(e) => setRating(e.target.value)} className={inputCls}>
              <option value="">—</option>
              {[1,2,3,4,5].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Price Level</label>
            <select value={priceLevel} onChange={(e) => setPriceLevel(e.target.value)} className={inputCls}>
              <option value="">—</option>
              <option value="1">$ (budget)</option>
              <option value="2">$$ (moderate)</option>
              <option value="3">$$$ (pricey)</option>
              <option value="4">$$$$ (fine dining)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Date Visited</label>
            <input type="date" value={visitedAt} onChange={(e) => setVisitedAt(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls}>Notes / Review</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Overall impressions, what stood out..." />
        </div>
      </div>

      {/* Location */}
      <div className={sectionCls}>
        <h3 className={headingCls}>Location (for map view)</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Latitude</label>
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} className={inputCls} placeholder="31.2304" />
          </div>
          <div>
            <label className={labelCls}>Longitude</label>
            <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} className={inputCls} placeholder="121.4737" />
          </div>
          <div>
            <label className={labelCls}>Google Maps URL</label>
            <input value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} className={inputCls} placeholder="https://maps.google.com/..." />
          </div>
        </div>
      </div>

      {/* Cover image */}
      <div className={sectionCls}>
        <h3 className={headingCls}>Cover Photo</h3>
        <div className="max-w-sm">
          <ImageUploadInput
            value={coverImage}
            onChange={setCoverImage}
            path={`restaurants/${initial?.id ?? crypto.randomUUID()}/cover`}
            label="Cover image"
          />
        </div>
      </div>

      {/* Dishes */}
      <div className={sectionCls}>
        <h3 className={headingCls}>Recommended Dishes</h3>
        <div className="space-y-4">
          {dishes.map((dish, i) => (
            <div key={i} className="rounded-xl border border-stone-200 p-4 dark:border-stone-700">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-stone-400">Dish {i + 1}</span>
                <button type="button" onClick={() => removeDish(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Name (EN) *</label>
                  <input value={dish.name} onChange={(e) => updateDish(i, { name: e.target.value })} className={inputCls} placeholder="Xiao Long Bao" />
                </div>
                <div>
                  <label className={labelCls}>Name (ZH)</label>
                  <input value={dish.name_zh ?? ''} onChange={(e) => updateDish(i, { name_zh: e.target.value })} className={inputCls} placeholder="小笼包" />
                </div>
                <div>
                  <label className={labelCls}>Rating (1–5)</label>
                  <select value={dish.rating ?? ''} onChange={(e) => updateDish(i, { rating: e.target.value ? Number(e.target.value) : null })} className={inputCls}>
                    <option value="">—</option>
                    {[1,2,3,4,5].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={dish.recommended ?? true}
                      onChange={(e) => updateDish(i, { recommended: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    Mark as "Must Try"
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Description</label>
                  <input value={dish.description ?? ''} onChange={(e) => updateDish(i, { description: e.target.value })} className={inputCls} placeholder="Thin-skinned soup dumplings filled with..." />
                </div>
                <div className="sm:col-span-2">
                  <ImageUploadInput
                    value={dish.image_url ?? ''}
                    onChange={(url) => updateDish(i, { image_url: url })}
                    path={`restaurants/${initial?.id ?? crypto.randomUUID()}/dishes/${i}`}
                    label="Dish photo"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addDish} className="mt-3 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100">
          + Add dish
        </button>
      </div>

      {/* Photos */}
      <div className={sectionCls}>
        <h3 className={headingCls}>Photo Gallery</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {photos.map((photo, i) => (
            <div key={i} className="rounded-xl border border-stone-200 p-3 dark:border-stone-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-stone-400">Photo {i + 1}</span>
                <button type="button" onClick={() => removePhoto(i)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
              <ImageUploadInput
                value={photo.image_url}
                onChange={(url) => updatePhoto(i, { image_url: url })}
                path={`restaurants/${initial?.id ?? crypto.randomUUID()}/photos/${i}`}
                label="Photo"
              />
              <div className="mt-2">
                <label className={labelCls}>Caption</label>
                <input value={photo.caption ?? ''} onChange={(e) => updatePhoto(i, { caption: e.target.value })} className={inputCls} placeholder="Optional caption" />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addPhoto} className="mt-3 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100">
          + Add photo
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{error}</p>}
      {success && <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">{success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
      >
        {pending ? 'Saving...' : 'Save Restaurant'}
      </button>
    </form>
  );
}
