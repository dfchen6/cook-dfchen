'use client';

import { useTransition } from 'react';
import { deleteRecipe } from '@/app/[locale]/admin/actions';

export default function DeleteRecipeButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete "${title}"?`)) return;
    startTransition(() => deleteRecipe(id));
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
