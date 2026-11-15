import { redirect } from 'next/navigation';

// Restaurant management moved to the per-user /restaurants/manage page.
export default async function LegacyAdminRestaurantsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/restaurants/manage`);
}
