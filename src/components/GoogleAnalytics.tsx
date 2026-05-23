"use client"

import Script from 'next/script';


const GoogleAnalytics = () => {
  const gaMeasurementId = "G-RNC0BR5ZX9";

  // Don't render in development or if the ID is missing
  if (process.env.NODE_ENV !== 'production' || !gaMeasurementId) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaMeasurementId}');
          `,
        }}
      />
    </>
  );
};

export default GoogleAnalytics;
