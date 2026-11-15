import { redirect } from 'next/navigation';

// Restaurant editing moved to the per-user /restaurants/manage/edit/[id] page.
export default async function LegacyAdminRestaurantEditPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect(`/${locale}/restaurants/manage/edit/${id}`);
}
