import { createClient } from '@/lib/supabase/server';
import { ADMIN_EMAIL } from '@/lib/admin';
import NavAuthClient from './NavAuthClient';

export default async function NavAuth({ locale }: { locale: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <NavAuthClient
      locale={locale}
      email={user?.email ?? null}
      isAdmin={user?.email === ADMIN_EMAIL}
    />
  );
}
