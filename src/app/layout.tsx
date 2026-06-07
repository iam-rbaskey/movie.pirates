
"use client";

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/ThemeProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import Script from 'next/script';
import { Inter, Bebas_Neue } from 'next/font/google';
import { LoadingProvider } from '@/context/LoadingContext';
import PageLoader from '@/components/PageLoader';
import { NavigationEvents } from '@/components/NavigationEvents';
import { Suspense } from 'react';
import ConditionalTelegramPopup from '@/components/ConditionalTelegramPopup';
import { usePathname } from 'next/navigation';


const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-bebas-neue',
});

// `export const metadata: Metadata = { ... }` is for Server Components only.
// For Client Components, we handle metadata dynamically if needed.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminPath = pathname?.startsWith('/admin');
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
         <title>Movie Pirates - Your Movie Universe</title>
          <meta name="description" content="Discover, rate, and review movies on Movie Pirates." />
          <meta name="google-site-verification" content="google76fa96448a07af65.html" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var ua = navigator.userAgent || '';
            var tvKeywords = [
              'smarttv', 'googletv', 'appletv', 'androidtv', 'roku', 'hbbtv', 'tizen', 
              'web0s', 'webos', 'viera', 'casttv', 'opera tv', 'sonydtv', 'playstation', 
              'xbox', 'dtv', 'smart-tv', 'bravia', 'philips-tv', 'sharp-tv', 'panasonic-tv',
              'lgnetcast', 'nettv', 'crkey', 'chromecast', 'vizio', 'apple tv', 'firetv', 'firestick'
            ];
            var isTv = tvKeywords.some(function(k) { return ua.toLowerCase().indexOf(k) > -1; });
            if (isTv) {
              document.documentElement.classList.add('is-tv');
              document.documentElement.setAttribute('data-is-tv', 'true');
            }
          })();
        ` }} />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1842234499258946"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
        </head>
      
      <body className={`${inter.variable} ${bebasNeue.variable} font-body antialiased bg-background text-foreground/80 grain-overlay`}>
        <LoadingProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <div className="flex flex-col min-h-screen">
              {!isAdminPath && <Header />}
              <main className={isAdminPath ? "flex-1 w-full" : "flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-28 pb-28 md:pb-8"}>
                {children}
              </main>
              {!isAdminPath && <Footer />}
            </div>
            <Toaster />
          </ThemeProvider>
          <PageLoader />
          <Suspense fallback={null}>
            <NavigationEvents />
          </Suspense>
          <ConditionalTelegramPopup />
        </LoadingProvider>
        <GoogleAnalytics />
        <Script type='text/javascript' src='//pl27064010.profitableratecpm.com/7d/62/56/7d6256c5e557f810588d7029d741ec65.js' strategy="lazyOnload"></Script>
        <Script id="adsense-config" strategy="lazyOnload">
          {`
            atOptions = {
              'key' : 'a6b4ac549b3996580694451011f8a6c5',
              'format' : 'iframe',
              'height' : 60,
              'width' : 468,
              'params' : {}
            };
          `}
        </Script>
        <Script type='text/javascript' src='//www.highperformanceformat.com/a6b4ac549b3996580694451011f8a6c5/invoke.js' strategy="lazyOnload"></Script>
      </body>
    </html>
  );
}
