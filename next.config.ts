import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'cook-copilot';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      // Local Firebase Storage emulator
      { protocol: 'http', hostname: '127.0.0.1', port: '9199' },
    ],
  },
  // Reverse-proxy Firebase Auth helper endpoints on our own domain so OAuth
  // runs first-party (avoids cross-origin sessionStorage partitioning errors).
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/__/auth/:path*',
          destination: `https://${firebaseProjectId}.firebaseapp.com/__/auth/:path*`,
        },
        {
          source: '/__/firebase/:path*',
          destination: `https://${firebaseProjectId}.firebaseapp.com/__/firebase/:path*`,
        },
      ],
    };
  },
};

export default withNextIntl(nextConfig);
