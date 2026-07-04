import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'البحث ومقارنة الأسعار',
  description:
    'ابحث عن أي منتج وقارن أسعاره من Amazon و Noon و Jumia في مكان واحد. رتب حسب السعر أو الأكثر تطابقاً.',
  alternates: { canonical: '/search' },
  openGraph: {
    title: 'البحث ومقارنة الأسعار — قارنها',
    description:
      'ابحث عن أي منتج وقارن أسعاره من Amazon و Noon و Jumia في مكان واحد.',
    url: '/search',
  },
  robots: { index: true, follow: true },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
