import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { AppProviders } from '@/components/layout/AppProviders';
import { ThemeScript } from '@/components/layout/ThemeScript';
import { Toaster } from '@/components/ui/Toaster';
import './globals.css';

/**
 * Two families, self-hosted at build time: no runtime request to Google, no
 * layout shift, and both are available with the radio off.
 *
 *   Poppins — headings and numerals. Geometric, confident, a little warmer
 *             than a grotesque; gives the board and cause titles their voice.
 *   Inter   — body, labels and dense UI. Unbeatable at 12-14px, and its
 *             tabular figures keep a column of dates from drifting.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['500', '600', '700'],
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Adalat Diary';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${APP_NAME} — Court diary for advocates`, template: `%s · ${APP_NAME}` },
  description:
    'Case records, cause lists and next dates for advocates. Works offline, syncs when you are back on a network.',
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: APP_NAME },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: { title: APP_NAME, description: 'Court diary for advocates.', type: 'website' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9ff' },
    { media: '(prefers-color-scheme: dark)', color: '#101623' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-[100dvh] flex-col bg-surface font-sans text-body-md text-on-surface antialiased">
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  );
}
