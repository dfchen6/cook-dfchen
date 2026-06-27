import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';
import Nav from '@/components/Nav';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: '食谱 · Recipes',
  description: 'A personal recipe collection',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'en' | 'zh')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={geist.variable}>
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <NextIntlClientProvider messages={messages}>
          <Nav locale={locale} />
          <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
