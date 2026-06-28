'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ChevronDown,
  LogIn,
  Menu,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import UserMenu from '@/components/UserMenu';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/search', label: 'البحث' },
  { href: '/history', label: 'السجل' },
  { href: '/#how-it-works', label: 'بيشتغل ازاي' },
] as const;

const SUGGESTED_QUERIES = [
  'ايفون 15',
  'جالكسي اس 24',
  'سماعات ايربودز',
  'لاب توب لينوفو',
];

function useScrollDirection(threshold = 8) {
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  const lastDir = useRef<'up' | 'down'>('up');

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      if (Math.abs(y - lastY.current) < threshold) return;
      const dir = y > lastY.current ? 'down' : 'up';
      lastY.current = y;
      if (dir !== lastDir.current) {
        lastDir.current = dir;
        if (y > 80) setVisible(dir === 'up');
        else setVisible(true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return { visible, scrolled };
}

function useKeyboardShortcut(handler: () => void, key: string) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key) {
        e.preventDefault();
        handler();
      }
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key === '/') {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler, key]);
}

function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { visible, scrolled } = useScrollDirection();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isAuthed = status === 'authenticated' && !!session?.user;

  useKeyboardShortcut(() => {
    setSearchOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, 'k');

  useEffect(() => {
    if (!searchOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [searchOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close mobile menu on route change
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#')) return false;
    const next = pathname.slice(href.length);
    return pathname === href || next.startsWith('/');
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchOpen(false);
    setQuery('');
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setQuery('');
    }
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : '-translate-y-full'
        )}
      >
        <div
          className={cn(
            'border-b transition-colors duration-300',
            scrolled
              ? 'bg-bg-primary/80 backdrop-blur-xl border-white/10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]'
              : 'bg-bg-primary/40 backdrop-blur-md border-transparent'
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-3 items-center h-16 gap-4">
              {/* Logo (left) */}
              <div className="flex items-center justify-start">
                <Logo />
              </div>

              {/* Center nav (desktop) */}
              <nav className="hidden md:flex items-center justify-center">
                <ul className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
                  {NAV_LINKS.map((link) => {
                    const active = isActive(link.href);
                    return (
                      <li key={link.href} className="relative">
                        <Link
                          href={link.href}
                          className={cn(
                            'relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200',
                            active
                              ? 'text-white'
                              : 'text-secondary hover:text-white'
                          )}
                        >
                          {link.label}
                          {active && (
                            <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-accent via-purple to-accent" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Actions (right) */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(true);
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  aria-label="بحث سريع"
                  className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-full bg-white/5 border border-white/10 text-secondary hover:text-white hover:bg-white/10 transition-colors text-sm"
                >
                  <Search size={15} />
                  <span className="hidden lg:inline">ابحث عن منتج</span>
                  <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary/80 border border-white/10 text-muted">
                    ⌘K
                  </kbd>
                </button>

                <Link
                  href="/search"
                  className="hidden md:inline-flex btn btn-primary h-9 px-4 text-sm items-center"
                >
                  <Sparkles size={15} />
                  ابدأ المقارنة
                </Link>

                {isAuthed ? (
                  <UserMenu />
                ) : (
                  <Link
                    href="/login"
                    aria-label="تسجيل الدخول"
                    className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 text-secondary hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <LogIn size={16} />
                  </Link>
                )}

                <button
                  type="button"
                  aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                  aria-expanded={mobileOpen}
                  onClick={() => setMobileOpen((v) => !v)}
                  className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 text-primary hover:bg-white/10 transition-colors"
                >
                  {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
            mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="bg-bg-primary/95 backdrop-blur-xl border-b border-white/10 px-4 py-4">
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                        active
                          ? 'bg-purple/15 text-white border border-purple/30'
                          : 'text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                      )}
                    >
                      <span>{link.label}</span>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setSearchOpen(true);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="btn btn-outline flex-1 justify-center text-sm"
              >
                <Search size={15} /> بحث
              </button>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="btn btn-primary flex-1 justify-center text-sm"
              >
                <LogIn size={15} /> دخول
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Push page content below the fixed header */}
      <div aria-hidden className="h-16" />

      {/* Command-bar search overlay */}
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="بحث"
          className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSearchOpen(false);
              setQuery('');
            }
          }}
        >
          <div className="w-full max-w-2xl glass gradient-border rounded-2xl overflow-hidden shadow-2xl">
            <form onSubmit={submitSearch} className="relative">
              <Search
                size={20}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-purple"
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="ابحث عن منتج (مثل جالكسي اس 24)"
                className="w-full bg-transparent text-lg text-white placeholder:text-muted pr-12 pl-12 py-5 focus:outline-none"
                aria-label="بحث"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery('');
                }}
                aria-label="إغلاق"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                <kbd className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary/80 border border-white/10">
                  Esc
                </kbd>
              </button>
            </form>

            <div className="border-t border-white/5 px-4 py-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted flex items-center gap-1">
                <Sparkles size={12} /> اقتراحات
              </span>
              {SUGGESTED_QUERIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQuery(s);
                    router.push(`/search?q=${encodeURIComponent(s)}`);
                    setSearchOpen(false);
                    setQuery('');
                  }}
                  className="pill text-xs"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[11px] text-muted">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="font-mono px-1 py-0.5 rounded bg-bg-secondary/80 border border-white/10">
                    ↵
                  </kbd>
                  للبحث
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="font-mono px-1 py-0.5 rounded bg-bg-secondary/80 border border-white/10">
                    Esc
                  </kbd>
                  للإغلاق
                </span>
              </div>
              <span className="inline-flex items-center gap-1">
                <ChevronDown size={12} /> قارنها
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;

export function Logo() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 shrink-0"
      aria-label="قارنها — الصفحة الرئيسية"
    >
      <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple shadow-[0_0_18px_-2px_rgba(139,92,246,0.6)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
        <Image
          src="/explore-svgrepo-com.svg"
          alt=""
          width={22}
          height={22}
          className="brightness-0 invert"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight text-white">
          قارن<span className="text-purple">ها</span>
        </span>
        <span className="text-[10px] text-muted mt-0.5 hidden sm:block">
          قارن أسعارك في ثوانٍ
        </span>
      </span>
    </Link>
  );
}