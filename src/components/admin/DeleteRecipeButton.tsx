'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRecipe } from '@/app/[locale]/admin/actions';

export default function DeleteRecipeButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete "${title}"?`)) return;
    startTransition(async () => {
      const result = await deleteRecipe(id);
      if (!result.error) router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
    >
      {pending ? '…' : 'Delete'}
    </button>
  );
}
