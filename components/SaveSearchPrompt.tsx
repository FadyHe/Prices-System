'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Bookmark, X } from 'lucide-react';

const DISMISS_KEY = 'qarinha.savePrompt.dismissedAt';
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

export function SaveSearchPrompt() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status !== 'unauthenticated') return;

    const show = () => {
      const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
      const cooldownPassed =
        !dismissedAt || Date.now() - Number(dismissedAt) > COOLDOWN_MS;
      if (!cooldownPassed) return;
      const t = window.setTimeout(() => setOpen(true), 1500);
      // store timer so we can cancel if user hides before it fires
      timerRef = t;
    };

    let timerRef: number | null = null;
    const handler = () => show();
    window.addEventListener('qarinha.savePrompt', handler);
    return () => {
      window.removeEventListener('qarinha.savePrompt', handler);
      if (timerRef) window.clearTimeout(timerRef);
    };
  }, [status]);

  if (!open) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="احفظ البحث"
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-4 sm:pb-0 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="w-full sm:max-w-md glass gradient-border rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 text-purple">
            <Bookmark size={18} />
            <span className="text-sm font-semibold">نصيحة سريعة</span>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="إغلاق"
            className="text-muted hover:text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <h2 className="text-xl font-bold text-primary mb-2">
          عايز تحفظ نتيجة البحث؟
        </h2>
        <p className="text-sm text-secondary mb-5 leading-relaxed">
          أنشئ حساب مجاني عشان تقدر تحفظ نتائج البحث، تشوف السجل، وترجع لأي
          منتج في أي وقت.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/register"
            onClick={dismiss}
            className="btn btn-primary justify-center text-sm py-2.5"
          >
            أنشئ حساب مجاني
          </Link>
          <Link
            href="/login"
            onClick={dismiss}
            className="btn btn-outline justify-center text-sm py-2.5"
          >
            عندي حساب بالفعل
          </Link>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="mt-4 text-[11px] text-muted hover:text-secondary block mx-auto"
        >
          متابعة بدون حساب
        </button>
      </div>
    </div>
  );
}

export function fireSavePrompt(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('qarinha.savePrompt'));
}