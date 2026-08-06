'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, History, LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (status !== 'authenticated' || !session?.user) return null;

  const { name, email, image } = session.user;
  const initials = (name || email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-2 h-9 px-2 sm:pl-2 sm:pr-3 rounded-full bg-bg-card border border-[var(--paper-border-soft)] text-secondary hover:text-primary hover:border-deal/50 transition-colors'
        )}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name ?? ''}
            className="w-7 h-7 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-deal text-white text-xs font-bold flex items-center justify-center">
            {initials}
          </span>
        )}
        <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
          {name ?? email}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-2 w-64 ledger-paper rounded-2xl border border-[var(--paper-border)] overflow-hidden z-50 shadow-2xl"
        >
          <div className="px-4 py-3 border-b border-[var(--paper-border-soft)]">
            <p className="text-sm font-semibold text-primary truncate">
              {name ?? 'مرحباً'}
            </p>
            {email && (
              <p className="text-xs text-muted truncate">{email}</p>
            )}
          </div>
          <div className="py-1">
            <Link
              href="/history"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:bg-deal/5 hover:text-deal transition-colors"
            >
              <History size={16} />
              سجل البحث
            </Link>
            <Link
              href="/history"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:bg-deal/5 hover:text-deal transition-colors"
            >
              <UserIcon size={16} />
              حسابي
            </Link>
          </div>
          <div className="border-t border-[var(--paper-border-soft)] py-1">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              role="menuitem"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-colors"
            >
              <LogOut size={16} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </div>
  );
}