'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/search', label: 'البحث' },
  { href: '/history', label: 'السجل' },
  { href: '/#how-it-works', label: 'بيشتغل ازاي' },
];

function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#')) return false;
    const next = pathname.slice(href.length);
    return pathname === href || next.startsWith('/');
  };

  return (
    <header className="mt-5 sticky top-0 z-40 backdrop-blur-md bg-bg-primary/70 border-b border-white/5">
      <nav className="flex flex-row items-center justify-between gap-4 lg:justify-between lg:gap-8 px-6 md:px-10">
        <Logo />

        <div className="hidden md:flex flex-row items-center gap-2 md:gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'pill',
                isActive(link.href) && 'pill-active'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex flex-row items-center gap-3">
          <Link
            href="/search"
            className="btn btn-outline text-sm py-2 px-4"
          >
            بحث سريع
          </Link>
          <Link
            href="/history"
            className="btn btn-primary text-sm py-2 px-4"
          >
            ابدأ الآن
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-primary p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-white/5 px-6 py-4 bg-bg-primary/95 backdrop-blur-md">
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'pill justify-start',
                  isActive(link.href) && 'pill-active'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2 border-t border-white/5 mt-2">
              <Link
                href="/search"
                onClick={() => setOpen(false)}
                className="btn btn-outline flex-1 justify-center text-sm"
              >
                بحث سريع
              </Link>
              <Link
                href="/history"
                onClick={() => setOpen(false)}
                className="btn btn-primary flex-1 justify-center text-sm"
              >
                السجل
              </Link>
            </div>
          </div>
        </div>
      )}

      <hr className="hr" />
    </header>
  );
}

export default Header;

export function Logo() {
  return (
    <Link href="/" className="flex flex-row items-center gap-3 group shrink-0">
      <Image
        src="/explore-svgrepo-com.svg"
        alt="Logo"
        width={38}
        height={38}
        className="transition-transform duration-300 group-hover:scale-110"
      />
      <h1 className="text-2xl font-bold text-white tracking-tight">
        قارن<span className="text-purple">ها</span>
      </h1>
    </Link>
  );
}
