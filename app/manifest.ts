import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'قارنها — مقارنة الأسعار',
    short_name: 'قارنها',
    description:
      'قارن أسعار المنتجات من Amazon و Noon و Jumia في ثوانٍ. اعثر على أرخص عرض بسرعة وبدون عناء.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f2e7',
    theme_color: '#f7f2e7',
    lang: 'ar',
    dir: 'rtl',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
