// Single source of truth for the admin account (server-side only).
// Falls back to the known owner email when OWNER_EMAIL is not set in the environment.
export const ADMIN_EMAIL = process.env.OWNER_EMAIL ?? 'dfchen6@gmail.com';

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email === ADMIN_EMAIL;
}
