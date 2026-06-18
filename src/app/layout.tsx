import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "../index.css";

export const metadata: Metadata = {
  title: "Trinetra Digital Solution — Custom Website Development, CRM & Digital Marketing",
  description: "Trinetra Digital Solution builds premium custom business websites, custom CRM systems, and performance digital marketing campaigns for growing companies. Based in Gorakhpur, UP.",
  keywords: "website development India, CRM development India, digital marketing Gorakhpur, business websites, CRM software, custom lead management systems, Google Ads management, Meta Ads India, Trinetra Digital Solution",
  robots: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
  authors: [{ name: "Trinetra Digital Solution" }],
  alternates: {
    canonical: "https://trinetradigitalsolution.com/",
  },
  other: {
    "google-site-verification": "google58396e467e534b87",
    "theme-color": "#4F46E5",
    "msapplication-TileColor": "#4F46E5",
    "msapplication-TileImage": "/android-chrome-192x192.png",
    "geo.region": "IN-UP",
    "geo.placename": "Gorakhpur, Uttar Pradesh, India",
    "geo.position": "26.7606;83.3732",
    "ICBM": "26.7606, 83.3732",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Trinetra Digital",
    "format-detection": "telephone=yes",
  },
  openGraph: {
    type: "website",
    url: "https://trinetradigitalsolution.com/",
    siteName: "Trinetra Digital Solution",
    title: "Trinetra Digital Solution — Custom Website Development, CRM & Digital Marketing",
    description: "Build premium custom business websites, custom CRM software pipelines, and performant Google & Meta Ads lead generation. Serving businesses across India.",
    images: [
      {
        url: "https://trinetradigitalsolution.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Trinetra Digital Solution — Website and CRM Development",
      }
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    site: "@trinetradigital",
    title: "Trinetra Digital — Custom Website Development & CRM Systems",
    description: "We engineer custom high-speed business websites, custom CRM software pipelines, and strategic digital ads campaigns. Zero hidden costs.",
    images: ["https://trinetradigitalsolution.com/og-image.png"],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <head>
        {/* Preconnect hints */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />

        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* FOUC Prevention inline styles */}
        <style dangerouslySetInnerHTML={{__html: `
          html { background: #FFFFFF; }
          body { margin: 0; }
          #root { min-height: 100vh; }
        `}} />

        {/* Schemas */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://trinetradigitalsolution.com/#organization",
              "name": "Trinetra Digital Solution",
              "alternateName": "Trinetra Digital",
              "url": "https://trinetradigitalsolution.com/",
              "logo": {
                "@type": "ImageObject",
                "url": "https://trinetradigitalsolution.com/TrinetraLogo.png",
                "width": 512,
                "height": 512
              },
              "description": "Trinetra Digital Solution builds premium custom business websites, secure CRM software databases, and strategic lead generation campaigns for Indian businesses.",
              "foundingDate": "2024",
              "areaServed": {
                "@type": "Country",
                "name": "India"
              },
              "contactPoint": [
                {
                  "@type": "ContactPoint",
                  "telephone": "+91-8810721068",
                  "contactType": "sales",
                  "email": "info@trinetradigitalsolution.com",
                  "availableLanguage": ["English", "Hindi"],
                  "contactOption": "TollFree",
                  "areaServed": "IN"
                },
                {
                  "@type": "ContactPoint",
                  "telephone": "+91-8810721068",
                  "contactType": "customer support",
                  "availableLanguage": ["English", "Hindi"],
                  "areaServed": "IN"
                }
              ],
              "sameAs": [
                "https://wa.me/918810721068",
                "https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8",
                "https://www.google.com/maps?cid=5d6fHtwWNEDcY1rH8"
              ]
            })
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "@id": "https://trinetradigitalsolution.com/#localbusiness",
              "name": "Trinetra Digital Solution",
              "description": "Custom website development, custom CRM systems, and performance digital marketing services for Indian businesses. We build professional online presence and lead tracking software pipelines.",
              "url": "https://trinetradigitalsolution.com/",
              "telephone": "+91-8810721068",
              "email": "info@trinetradigitalsolution.com",
              "image": "https://trinetradigitalsolution.com/og-image.png",
              "priceRange": "₹₹",
              "currenciesAccepted": "INR",
              "paymentAccepted": "Cash, UPI, Bank Transfer",
              "sameAs": [
                "https://maps.app.goo.gl/5d6fHtwWNEDcY1rH8",
                "https://wa.me/918810721068"
              ],
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Gorakhpur",
                "addressRegion": "Uttar Pradesh",
                "postalCode": "273001",
                "addressCountry": "IN"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": 26.7606,
                "longitude": 83.3732
              },
              "openingHoursSpecification": [
                {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
                  "opens": "09:00",
                  "closes": "19:00"
                }
              ],
              "hasMap": "https://maps.google.com/?q=Gorakhpur,+Uttar+Pradesh,+India",
              "serviceArea": {
                "@type": "Country",
                "name": "India"
              },
              "knowsAbout": [
                "Website Development",
                "CRM Development",
                "Digital Marketing",
                "Google Ads Management",
                "Meta Ads",
                "CRM Systems",
                "Lead Management Systems",
                "Software Engineering"
              ]
            })
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProfessionalService",
              "@id": "https://trinetradigitalsolution.com/#service",
              "name": "Trinetra Digital Solution",
              "provider": {
                "@id": "https://trinetradigitalsolution.com/#organization"
              },
              "serviceType": [
                "Website Development",
                "CRM Development",
                "Digital Marketing",
                "Software Development",
                "Business Websites",
                "Lead Management Systems"
              ],
              "areaServed": "IN",
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Website, CRM and Digital Marketing Plans",
                "itemListElement": [
                  {
                    "@type": "Offer",
                    "name": "Starter Website Plan",
                    "description": "Custom layout design, high-speed responsive coding, basic search engine setup, 1-year hosting management.",
                    "price": "9999",
                    "priceCurrency": "INR",
                    "priceSpecification": {
                      "@type": "UnitPriceSpecification",
                      "price": "9999",
                      "priceCurrency": "INR",
                      "unitText": "one-time setup"
                    }
                  },
                  {
                    "@type": "Offer",
                    "name": "CRM Development Starter Plan",
                    "description": "Lead management database, Kanban pipeline tracking, customer records dashboard, and secure hosting config.",
                    "price": "24999",
                    "priceCurrency": "INR",
                    "priceSpecification": {
                      "@type": "UnitPriceSpecification",
                      "price": "24999",
                      "priceCurrency": "INR",
                      "unitText": "one-time investment"
                    }
                  },
                  {
                    "@type": "Offer",
                    "name": "Performance Marketing Starter Plan",
                    "description": "Meta Ads setup and management, Google search Ads setup, lead generation dashboard, standard monthly reporting.",
                    "price": "7999",
                    "priceCurrency": "INR",
                    "priceSpecification": {
                      "@type": "UnitPriceSpecification",
                      "price": "7999",
                      "priceCurrency": "INR",
                      "unitText": "monthly management"
                    }
                  }
                ]
              }
            })
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://trinetradigitalsolution.com/#website",
              "url": "https://trinetradigitalsolution.com/",
              "name": "Trinetra Digital Solution",
              "description": "Custom Website Development, CRM & Digital Marketing for Indian Businesses",
              "publisher": {
                "@id": "https://trinetradigitalsolution.com/#organization"
              },
              "inLanguage": "en-IN"
            })
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "What is Trinetra Digital Solution?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Trinetra Digital Solution is a premium technology services brand. We engineer highly optimized custom websites, design secure business CRM databases, and manage performance digital marketing campaigns for businesses across India."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How much does a custom business website cost?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Our Starter Website packages begin at ₹9,999 setup (+ ₹999/month hosting & maintenance). We also offer Business and custom database web packages engineered exactly to your unique organizational specs."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Are ad platform budgets included in your marketing fees?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No. Advertising budgets spent on Google Ads or Meta Ads are paid directly by the client to those platform accounts. Our fees cover strictly keyword audits, campaign setup, continuous creative optimization, and tracking configurations."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Where is Trinetra Digital Solution located?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Trinetra Digital Solution is registered and operated in Gorakhpur, Uttar Pradesh, India — 273001. We serve professional business clients across all states of India remotely with active support."
                  }
                }
              ]
            })
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://trinetradigitalsolution.com/"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Services",
                  "item": "https://trinetradigitalsolution.com/services"
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": "Pricing",
                  "item": "https://trinetradigitalsolution.com/pricing"
                }
              ]
            })
          }}
        />
      </head>
      <body className="bg-surface-2 text-ink-1 antialiased">
        {/* Facebook Pixel NoScript Fallback */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1560948965472462&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        
        {children}
        
        <SpeedInsights />

        {/* ── Scripts ────────────────────────────────────────────── */}
        {/* CookieHub Consent Setup */}
        <Script id="cookiehub-consent" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'denied'
            });
          `}
        </Script>
        <Script src="https://cdn.cookiehub.eu/c2/ba5c405c.js" strategy="beforeInteractive" />
        <Script id="cookiehub-load" strategy="afterInteractive">
          {`
            var cpm = {};
            window.cookiehub.load(cpm);
          `}
        </Script>

        {/* Google Analytics */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-M20T383PSP" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-M20T383PSP');
          `}
        </Script>

        {/* Facebook Pixel */}
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1560948965472462');
          `}
        </Script>
      </body>
    </html>
  );
}
