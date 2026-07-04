import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';

import Footer from '@/components/Footer'
import './globals.css'
import Header from '@/components/Header'
import LightRays from '@/components/LightRays'
import Providers from '@/components/Providers'
import { SaveSearchPrompt } from '@/components/SaveSearchPrompt'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://qarinha.app';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-cairo',
  preload: true,
});

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'قارنها — قارن أسعار المنتجات من Amazon و Noon و Jumia',
    template: '%s | قارنها',
  },
  description:
    'قارن أسعار أي منتج من Amazon.eg و Noon و Jumia في ثوانٍ. نجمع لك أفضل العروض ونرتبها من الأرخص للأغلى لتوفير فلوسك.',
  applicationName: 'قارنها',
  keywords: [
    'مقارنة أسعار',
    'أرخص سعر',
    'Amazon مصر',
    'Noon',
    'Jumia',
    'عروض',
    'تسوق أونلاين',
    'قارنها',
    'price comparison egypt',
  ],
  authors: [{ name: 'قارنها' }],
  creator: 'قارنها',
  publisher: 'قارنها',
  category: 'shopping',
  alternates: {
    canonical: '/',
    languages: {
      'ar-EG': '/',
      ar: '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: '/',
    siteName: 'قارنها',
    title: 'قارنها — قارن أسعار المنتجات من Amazon و Noon و Jumia',
    description:
      'قارن أسعار أي منتج من Amazon.eg و Noon و Jumia في ثوانٍ. نجمع لك أفضل العروض ونرتبها من الأرخص للأغلى.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'قارنها — مقارنة أسعار المنتجات',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'قارنها — قارن أسعار المنتجات من Amazon و Noon و Jumia',
    description:
      'قارن أسعار أي منتج من Amazon.eg و Noon و Jumia في ثوانٍ. نجمع لك أفضل العروض ونرتبها من الأرخص للأغلى.',
    images: ['/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.svg', type: 'image/svg+xml' }],
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
<body className={cairo.variable}>
         <Providers>
           <Header />
           <div className="fixed inset-0 z-[-1] w-screen h-screen" suppressHydrationWarning>
             <LightRays
               raysOrigin="top-center-offset"
               raysColor="#777777"
               raysSpeed={1}
               lightSpread={1.5}
               rayLength={1.8}
               followMouse={true}
               mouseInfluence={0.09}
               noiseAmount={0.1}
               distortion={0}
               className="custom-rays"
               pulsating={false}
               fadeDistance={1}
               saturation={1}
             />
          </div>
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <SaveSearchPrompt />
        </Providers>
      </body>
    </html>
  )
}