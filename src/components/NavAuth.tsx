import { createClient } from '@/lib/supabase/server';
import NavAuthClient from './NavAuthClient';

const ADMIN_EMAIL = 'dfchen6@gmail.com';

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
