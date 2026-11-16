import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      // Local Firebase Storage emulator
      { protocol: 'http', hostname: '127.0.0.1', port: '9199' },
    ],
  },
};

export default withNextIntl(nextConfig);
