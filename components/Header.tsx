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
  MailCheck,
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
  // One coordinated open panel ('search' | 'menu' | null) so the search
  // overlay and mobile menu can never both be open, and body scroll locks
  // whenever either is.
  const [panel, setPanel] = useState<'search' | 'menu' | null>(null);
  const searchOpen = panel === 'search';
  const mobileOpen = panel === 'menu';
  const [query, setQuery] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAuthed = status === 'authenticated' && !!session?.user;
  const showVerifyBanner =
    isAuthed && !bannerDismissed && !session?.user?.emailVerified;

  useKeyboardShortcut(() => {
    setPanel('search');
    requestAnimationFrame(() => inputRef.current?.focus());
  }, 'k');

  // Lock body scroll while EITHER overlay is open (search or mobile menu).
  useEffect(() => {
    if (!panel) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [panel]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close overlays on route change
    setPanel(null);
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
    setPanel(null);
    setQuery('');
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setPanel(null);
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
            'border-b transition-all duration-300',
            scrolled
              ? 'bg-bg-primary/90 backdrop-blur-xl border-[var(--paper-border)] shadow-[0_8px_26px_-14px_rgba(60,45,20,0.4)]'
              : 'bg-bg-primary/70 backdrop-blur-md border-transparent'
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
              {/* Logo (left in standard flex, right in RTL) */}
              <div className="flex items-center shrink-0">
                <Logo />
              </div>

              {/* Center nav (desktop - lg and up) */}
              <nav className="hidden lg:flex items-center justify-center shrink-0">
                <ul className="flex items-center gap-1 p-1 rounded-full bg-bg-card border border-[var(--paper-border-soft)]">
                  {NAV_LINKS.map((link) => {
                    const active = isActive(link.href);
                    return (
                      <li key={link.href} className="relative">
                        <Link
                          href={link.href}
                          className={cn(
                            'relative px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 whitespace-nowrap block',
                            active
                              ? 'text-deal'
                              : 'text-secondary hover:text-primary'
                          )}
                        >
                          {link.label}
                          {active && (
                            <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-deal" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Actions (right in standard flex, left in RTL) */}
              <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPanel('search');
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  aria-label="بحث سريع"
                  className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-full bg-bg-card border border-[var(--paper-border-soft)] text-secondary hover:text-primary hover:border-deal/50 transition-colors text-sm whitespace-nowrap shrink-0"
                >
                  <Search size={15} className="shrink-0" />
                  <span className="hidden xl:inline">ابحث عن منتج</span>
                  <kbd className="hidden xl:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary/80 border border-[var(--paper-border-soft)] text-muted">
                    ⌘K
                  </kbd>
                </button>

                <Link
                  href="/search"
                  className="hidden xl:inline-flex btn btn-primary h-9 px-3.5 text-sm items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Sparkles size={15} className="shrink-0" />
                  <span>ابدأ المقارنة</span>
                </Link>

                {isAuthed ? (
                  <div className="shrink-0">
                    <UserMenu />
                  </div>
                ) : (
                  <Link
                    href="/login"
                    aria-label="تسجيل الدخول"
                    className="inline-flex items-center justify-center h-9 px-3 rounded-full bg-bg-card border border-[var(--paper-border-soft)] text-secondary hover:text-deal hover:border-deal/50 transition-colors text-sm font-medium whitespace-nowrap gap-1.5 shrink-0"
                  >
                    <LogIn size={16} className="shrink-0" />
                    <span className="hidden sm:inline">دخول</span>
                  </Link>
                )}

                <button
                  type="button"
                  aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                  aria-expanded={mobileOpen}
                  onClick={() => setPanel(panel === 'menu' ? null : 'menu')}
                  className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-full bg-bg-card border border-[var(--paper-border-soft)] text-primary hover:border-deal/40 transition-colors shrink-0"
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
            'lg:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
            mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="bg-bg-primary/95 backdrop-blur-xl border-b border-[var(--paper-border-soft)] px-4 py-4 shadow-lg">
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setPanel(null)}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                        active
                          ? 'bg-deal/10 text-deal border border-deal/30'
                          : 'text-secondary hover:text-primary hover:bg-bg-card border border-transparent'
                      )}
                    >
                      <span>{link.label}</span>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-deal shrink-0" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--paper-border-soft)]">
              <button
                type="button"
                onClick={() => {
                  setPanel('search');
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="btn btn-outline flex-1 justify-center text-sm whitespace-nowrap gap-1.5"
              >
                <Search size={15} /> بحث
              </button>
              {!isAuthed ? (
                <Link
                  href="/login"
                  onClick={() => setPanel(null)}
                  className="btn btn-primary flex-1 justify-center text-sm whitespace-nowrap gap-1.5"
                >
                  <LogIn size={15} /> دخول
                </Link>
              ) : (
                <Link
                  href="/search"
                  onClick={() => setPanel(null)}
                  className="btn btn-primary flex-1 justify-center text-sm whitespace-nowrap gap-1.5"
                >
                  <Sparkles size={15} /> ابدأ المقارنة
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Push page content below the fixed header */}
      <div aria-hidden className="h-16" />

      {showVerifyBanner && (
        <div className="bg-deal/10 border-b border-deal/25 text-deal">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MailCheck size={16} className="shrink-0" />
              <span className="truncate sm:whitespace-normal">
                أكّد بريدك الإلكتروني عشان تقدر تحفظ نتائج البحث.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/login"
                className="text-deal hover:text-deal/80 underline underline-offset-2 whitespace-nowrap font-medium"
              >
                أعد إرسال الرسالة
              </Link>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setBannerDismissed(true)}
                className="text-deal/80 hover:text-deal p-1"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command-bar search overlay */}
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="بحث"
          className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4 bg-[#2a241a]/55 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPanel(null);
              setQuery('');
            }
          }}
        >
          <div className="w-full max-w-2xl ledger-paper rounded-2xl overflow-hidden shadow-2xl">
            <form onSubmit={submitSearch} className="relative">
              <Search
                size={20}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-deal"
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="ابحث عن منتج (مثل جالكسي اس 24)"
                className="w-full bg-transparent text-lg text-primary placeholder:text-muted py-5 pr-12 pl-12 focus:outline-none"
                aria-label="بحث"
              />
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  setQuery('');
                }}
                aria-label="إغلاق"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                <kbd className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary/80 border border-[var(--paper-border-soft)]">
                  Esc
                </kbd>
              </button>
            </form>

            <div className="border-t border-[var(--paper-border-soft)] px-4 py-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted flex items-center gap-1 whitespace-nowrap">
                <Sparkles size={12} /> اقتراحات
              </span>
              {SUGGESTED_QUERIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQuery(s);
                    router.push(`/search?q=${encodeURIComponent(s)}`);
                    setPanel(null);
                    setQuery('');
                  }}
                  className="pill text-xs whitespace-nowrap"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="px-4 py-2 border-t border-[var(--paper-border-soft)] flex items-center justify-between text-[11px] text-muted">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <kbd className="font-mono px-1 py-0.5 rounded bg-bg-secondary/80 border border-[var(--paper-border-soft)]">
                    ↵
                  </kbd>
                  للبحث
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <kbd className="font-mono px-1 py-0.5 rounded bg-bg-secondary/80 border border-[var(--paper-border-soft)]">
                    Esc
                  </kbd>
                  للإغلاق
                </span>
              </div>
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
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
      className="group inline-flex items-center gap-2.5 shrink-0 whitespace-nowrap"
      aria-label="قارنها — الصفحة الرئيسية"
    >
      <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-bg-card border border-[var(--paper-border)] shadow-[var(--shadow-sm)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3 shrink-0">
        <span className="absolute inset-0 rounded-xl ring-1 ring-deal/25 ring-offset-0" />
        <Image
          src="/explore-svgrepo-com.svg"
          alt=""
          width={20}
          height={20}
          className="brightness-0 opacity-80"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base sm:text-lg font-extrabold tracking-tight text-primary whitespace-nowrap">
          قارن<span className="text-deal">ها</span>
        </span>
        <span className="text-[10px] text-muted mt-0.5 hidden xl:block whitespace-nowrap">
          قارن أسعارك في ثوانٍ
        </span>
      </span>
    </Link>
  );
}