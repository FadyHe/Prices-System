import { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthForm from '@/components/AuthForm';

export const metadata: Metadata = {
  title: 'إنشاء حساب',
  description:
    'اعمل حساب في قارنها مجاناً وقارن أسعار المنتجات من Amazon و Noon و Jumia.',
  alternates: { canonical: '/register' },
  openGraph: {
    title: 'إنشاء حساب — قارنها',
    description:
      'اعمل حساب في قارنها مجاناً وقارن أسعار المنتجات من Amazon و Noon و Jumia.',
    url: '/register',
  },
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-10">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}