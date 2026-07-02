'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type Props = {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  path?: string;
  label?: string;
};

export default function ImageUploadInput({
  value,
  onChange,
  bucket = 'restaurant-images',
  path = `uploads/${crypto.randomUUID()}`,
  label = 'Image',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const uploadPath = `${path}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(uploadPath, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(uploadPath);
      onChange(publicUrl);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-600 dark:bg-stone-800';

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>

      {/* Preview */}
      {value && (
        <div className="relative h-32 w-full overflow-hidden rounded-lg border border-stone-200 dark:border-stone-700">
          <Image src={value} alt="" fill className="object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
          >
            ✕
          </button>
        </div>
      )}

      {/* URL input */}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        placeholder="https://... or upload below"
      />

      {/* File upload */}
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          {uploading ? 'Uploading...' : 'Upload file'}
        </button>
        {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
      </div>
    </div>
  );
}
