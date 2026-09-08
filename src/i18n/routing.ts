import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'zh',
  // Chinese is the site's primary language — don't let the visitor's browser
  // Accept-Language header override it. Visitors can still switch manually
  // via LocaleToggle.
  localeDetection: false,
});
