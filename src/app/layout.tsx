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

// Runs before Next's client bundles. Android 7's Chromium lacks a couple of
// baseline methods that dependencies may use; keeping this ES5 avoids a parse
// failure before the application has a chance to load.
const LEGACY_BROWSER_SCRIPT = `(function(){
  if(!Object.fromEntries){Object.fromEntries=function(entries){var output={};for(var i=0;i<entries.length;i++){output[entries[i][0]]=entries[i][1];}return output;};}
  if(!Promise.prototype.finally){Promise.prototype.finally=function(callback){var constructor=this.constructor;return this.then(function(value){return constructor.resolve(callback()).then(function(){return value;});},function(reason){return constructor.resolve(callback()).then(function(){throw reason;});});};}
}())`;

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
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
  // A non-media tag lets the theme picker keep Android's installed-app
  // status bar in sync. The pre-paint theme script updates it for dark mode.
  themeColor: '#f8f9ff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
        <script dangerouslySetInnerHTML={{ __html: LEGACY_BROWSER_SCRIPT }} />
        {/* Older Android Chrome recognises this even when it ignores parts of
            the Web App Manifest. iOS receives the appleWebApp metadata above. */}
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="app-viewport flex min-h-screen flex-col bg-surface font-sans text-body-md text-on-surface antialiased">
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  );
}
