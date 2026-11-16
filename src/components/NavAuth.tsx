import { getCurrentUser, isAdminUser } from '@/lib/auth';
import NavAuthClient from './NavAuthClient';

export default async function NavAuth({ locale }: { locale: string }) {
  const user = await getCurrentUser();
  return (
    <NavAuthClient
      locale={locale}
      email={user?.email ?? null}
      isAdmin={isAdminUser(user)}
    />
  );
}
