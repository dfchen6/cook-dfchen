import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Auth is verified per request from the `__session` cookie (see src/lib/auth.ts),
// so the middleware only handles locale routing now.
export default createIntlMiddleware(routing);

export const config = {
  matcher: ['/((?!api|auth|_next|.*\\..*).*)'],
};
