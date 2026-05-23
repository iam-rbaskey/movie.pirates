
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
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
         <title>Movie Pirates - Your Movie Universe</title>
          <meta name="description" content="Discover, rate, and review movies on Movie Pirates." />
          <meta name="google-site-verification" content="google76fa96448a07af65.html" />
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
              <Header />
              <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-28 pb-28 md:pb-8">
                {children}
              </main>
              <Footer />
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
