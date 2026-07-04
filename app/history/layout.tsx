import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'سجل البحث',
  description:
    'ارجع لنتائج مقارناتك السابقة، احفظ المنتجات المفضلة، وتابع أرخص العروض اللي شفتها.',
  alternates: { canonical: '/history' },
  openGraph: {
    title: 'سجل البحث — قارنها',
    description: 'ارجع لنتائج مقارناتك السابقة و احفظ المنتجات المفضلة.',
    url: '/history',
  },
  robots: { index: false, follow: true },
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
