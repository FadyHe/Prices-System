import { Suspense } from 'react';
import type { Metadata } from 'next';
import AuthForm from '@/components/AuthForm';

export const metadata: Metadata = {
  title: 'تسجيل الدخول',
  description: 'سجّل دخولك في قارنها عشان تحفظ نتائج البحث والمنتجات المفضلة.',
  alternates: { canonical: '/login' },
  openGraph: {
    title: 'تسجيل الدخول — قارنها',
    description: 'سجّل دخولك في قارنها عشان تحفظ نتائج البحث والمنتجات المفضلة.',
    url: '/login',
  },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-4 py-10">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}