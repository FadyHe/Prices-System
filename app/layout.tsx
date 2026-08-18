import type { Metadata, Viewport } from 'next';
import { Cairo, Aref_Ruqaa } from 'next/font/google';

import Footer from '@/components/Footer'
import './globals.css'
import Header from '@/components/Header'
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

/* Handwritten ledger voice — for the circled prices & journal copy */
const arefRuqaa = Aref_Ruqaa({
  subsets: ['arabic'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-hand',
  preload: true,
});

export const viewport: Viewport = {
  themeColor: '#f7f2e7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'light',
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
<body className={`${cairo.variable} ${arefRuqaa.variable}`}>
         <Providers>
           <Header />
          <main className="flex-1">
            {/* =============================================================================
        THESIS: The whole surface is a family price-ledger, the دفتر that Egyptian homes
        keep by hand to beat the high street. It refuses the dark-glass SaaS dashboard —
        instead every page is a warm ivory ruled notebook page: prices written in ink,
        the cheapest offer circled in one red pen line, stores stamped in true colors.
        OWN-WORLD: ivory paper with faint ruled ledger lines and a red margin rule; ink
        text in graphite/ink-blue; exactly one signal deal-red (#c4391f) for every
        circled best-price and the primary search action; handwritten Arabic (Aref Ruqaa)
        for the ledger's own words beside a crisp humanist UI sans (Cairo); paper-grain
        cards, flat at rest, lifted on interaction.
        STORY: A shopper types a product name into the ruled column, sees every store's
        real color, and the cheapest offer ringed in red like a careful bargain noted in
        the family book. Calm, honest, home.
        FIRST VIEWPORT: the landing page is the open ledger — ruled red-margin page, the
        search in the writing column, a handwritten sample entry with the Amazon.eg price
        circled "الأرخص", store marks in true colors, CTA in deal-red.
        FORM: direction roll index 4 = دفتر البيت (family ledger), seed key 7748c9cc.
        FINISH: unreviewed and undocumented is unfinished; this build is closed and DESIGN.md
        written from the built world.
      ============================================================================= */}
      {children}
          </main>
          <Footer />
          <SaveSearchPrompt />
        </Providers>
      </body>
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1431014878627404"
      crossorigin="anonymous"></script>
    </html>
  )
}