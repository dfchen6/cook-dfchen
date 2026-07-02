'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRestaurant } from '@/app/[locale]/admin/restaurants/actions';

export default function DeleteRestaurantButton({ id, name, locale }: { id: string; name: string; locale: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm(`Delete "${name}"?`)) return;
    startTransition(async () => {
      await deleteRestaurant(id);
      router.refresh();
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
