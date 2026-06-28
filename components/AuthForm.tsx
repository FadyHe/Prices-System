'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ChangeEvent,
  FormEvent,
  useState,
} from 'react';
import { ArrowLeft, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react';

interface AuthFormProps {
  mode: 'login' | 'register';
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'فشل إنشاء الحساب');
          setLoading(false);
          return;
        }
      }
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        setError('البريد أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('حدث خطأ غير متوقع. حاول مرة أخرى.');
      setLoading(false);
    }
  }

  async function onGoogle() {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl });
  }

  const field =
    (label: string, type: string, value: string, onChange: (v: string) => void, Icon: typeof Mail, placeholder: string) => (
      <label className="block">
        <span className="text-sm text-secondary mb-1.5 block">{label}</span>
        <div className="relative">
          <Icon
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type={type}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
            required
            placeholder={placeholder}
            autoComplete={
              type === 'password'
                ? mode === 'login'
                  ? 'current-password'
                  : 'new-password'
                : type === 'email'
                  ? 'email'
                  : 'name'
            }
            className="input w-full pr-10 pl-4 py-2.5"
          />
        </div>
      </label>
    );

  return (
    <div className="w-full max-w-md flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-primary">
          {mode === 'login' ? (
            <>
              مرحباً بعودتك إلى{' '}
              <span className="gradient-text">قارنها</span>
            </>
          ) : (
            <>
              إنشاء حساب{' '}
              <span className="gradient-text">جديد</span>
            </>
          )}
        </h1>
        <p className="text-secondary mt-2 text-sm">
          {mode === 'login'
            ? 'سجّل دخولك للمزامنة بين الأجهزة وحفظ السجل'
            : 'أنشئ حسابك في ثوانٍ وابدأ المقارنة'}
        </p>
      </div>

      <div className="glass rounded-2xl p-6 flex flex-col gap-4">
        <button
          type="button"
          onClick={onGoogle}
          disabled={googleLoading}
          className="btn w-full justify-center bg-white text-gray-800 hover:bg-white/90 font-semibold"
        >
          {googleLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          المتابعة باستخدام Google
        </button>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex-1 h-px bg-white/10" />
          أو
          <span className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === 'register' &&
            field('الاسم', 'text', name, setName, UserIcon, 'اسمك الكامل')}
          {field('البريد الإلكتروني', 'email', email, setEmail, Mail, 'you@example.com')}
          {field(
            'كلمة المرور',
            'password',
            password,
            setPassword,
            Lock,
            '••••••••'
          )}

          {error && (
            <div className="glass border-error/40 bg-error/10 text-error text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
                <ArrowLeft size={16} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-secondary">
          {mode === 'login' ? (
            <>
              ما عندكش حساب؟{' '}
              <Link
                href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-purple hover:underline font-medium"
              >
                أنشئ واحد دلوقتي
              </Link>
            </>
          ) : (
            <>
              عندك حساب بالفعل؟{' '}
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-purple hover:underline font-medium"
              >
                سجّل دخولك
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.4 29.5 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.4 29.5 4.5 24 4.5 16.3 4.5 9.6 8.7 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c5.4 0 10.3-2.1 14-5.4l-6.5-5.5C29.5 34.1 26.9 35 24 35c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.4 38.7 16.2 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2.1 3.8-3.8 5.1l6.5 5.5C40.9 36 43.5 30.5 43.5 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}