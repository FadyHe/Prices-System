import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export const metadata = {
  title: 'تسجيل الدخول — قارنها',
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