'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  History,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { useSearchHistory } from '@/components/useSearchHistory';
import EmptyState from '@/components/EmptyState';
import SourceBadge from '@/components/SourceBadge';
import SearchBar from '@/components/SearchBar';
import { cn } from '@/lib/utils';

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'recent', label: 'الأحدث' },
  { id: 'pinned', label: 'المثبتة' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

const RELATIVE = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });

function timeAgo(ts: number) {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return RELATIVE.format(-diffSec, 'second');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return RELATIVE.format(-diffMin, 'minute');
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return RELATIVE.format(-diffH, 'hour');
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return RELATIVE.format(-diffD, 'day');
  return new Date(ts).toLocaleDateString('ar-EG');
}

export default function HistoryPage() {
  const router = useRouter();
  const { entries, hydrated, remove, clear, togglePin } = useSearchHistory();
  const [filter, setFilter] = useState<FilterId>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const visibleEntries = useMemo(() => {
    const list = [...entries];
    if (filter === 'pinned') return list.filter((e) => e.pinned);
    if (filter === 'recent') return list.slice(0, 10);
    return list;
  }, [entries, filter]);

  const stats = useMemo(() => {
    const total = entries.length;
    const pinned = entries.filter((e) => e.pinned).length;
    const totalProducts = entries.reduce((sum, e) => sum + e.resultCount, 0);
    return { total, pinned, totalProducts };
  }, [entries]);

  const handleRerun = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    clear();
    setConfirmClear(false);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Hero */}
        <section className="glass gradient-border relative overflow-hidden rounded-3xl p-8 md:p-10">
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-purple/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="pill">
                <History size={14} /> سجليك المحلي
              </span>
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-primary">
                سجل <span className="gradient-text">عمليات البحث</span>
              </h1>
              <p className="text-secondary mt-3 max-w-2xl">
                كل عمليات البحث بتتحفظ على جهازك — تقدر تعيد تشغيلها بنقرة واحدة أو تثبت المفضلة للرجوع ليها بسرعة.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="إجمالي عمليات البحث" value={stats.total} />
              <StatCard label="بحث مثبت" value={stats.pinned} accent="purple" />
              <StatCard
                label="منتجات تمت مقارنتها"
                value={stats.totalProducts}
                accent="blue"
              />
            </div>

            <SearchBar
              placeholder="ابحث عن منتج جديد..."
              onSubmit={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)}
            />
          </div>
        </section>

        {/* Toolbar */}
        <div className="glass flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn('pill text-sm', filter === f.id && 'pill-active')}
              >
                {f.label}
              </button>
            ))}
          </div>

          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className={cn(
                'btn text-sm py-2 px-4',
                confirmClear
                  ? 'bg-error/20 text-error hover:bg-error/30'
                  : 'bg-bg-secondary text-secondary hover:text-white'
              )}
            >
              <Trash2 size={16} />
              {confirmClear ? 'تأكيد المسح' : 'مسح السجل'}
            </button>
          )}
        </div>

        {/* Loading until localStorage hydrates */}
        {!hydrated && (
          <div className="glass rounded-2xl p-8 text-center text-secondary">
            جاري التحميل...
          </div>
        )}

        {/* Empty */}
        {hydrated && entries.length === 0 && (
          <EmptyState
            icon={<History size={32} />}
            title="السجل فاضي"
            description="ابدأ بإجراء بحث جديد وكل نتائجك هتتحفظ هنا تلقائياً."
            action={
              <Link href="/search" className="btn btn-primary">
                <Search size={16} />
                ابحث الآن
              </Link>
            }
          />
        )}

        {/* Filtered empty */}
        {hydrated && entries.length > 0 && visibleEntries.length === 0 && (
          <EmptyState
            icon={<Pin size={32} />}
            title="مفيش نتائج في هذا الفلتر"
            description="جرّب فلتر آخر أو اعرض السجل بالكامل."
            action={
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="btn btn-outline"
              >
                عرض الكل
              </button>
            }
          />
        )}

        {/* Grid */}
        {hydrated && visibleEntries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleEntries.map((entry) => (
              <article
                key={entry.id}
                className={cn(
                  'glass glass-hover flex flex-col gap-4 p-5 rounded-2xl transition-all',
                  entry.pinned && 'gradient-border ring-1 ring-purple/30'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Search size={14} className="text-muted shrink-0" />
                      <h3 className="text-lg font-bold text-primary truncate">
                        {entry.query}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Clock size={12} />
                      <span>{timeAgo(entry.timestamp)}</span>
                      <span>•</span>
                      <span>{entry.resultCount} منتج</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePin(entry.id)}
                    aria-label={entry.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                    className={cn(
                      'shrink-0 p-2 rounded-lg transition-colors',
                      entry.pinned
                        ? 'bg-purple/20 text-purple hover:bg-purple/30'
                        : 'text-muted hover:text-primary hover:bg-white/5'
                    )}
                  >
                    {entry.pinned ? <Pin size={16} /> : <PinOff size={16} />}
                  </button>
                </div>

                {entry.bestPrice !== undefined && entry.bestSource && (
                  <div className="flex items-center justify-between rounded-xl bg-bg-secondary/50 px-3 py-2.5 border border-white/5">
                    <div className="flex items-center gap-2 text-xs text-secondary">
                      <Sparkles size={12} className="text-purple" />
                      <span>أفضل سعر</span>
                      <SourceBadge source={entry.bestSource} />
                    </div>
                    <span className="font-bold gradient-text text-lg">
                      {entry.bestPrice.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleRerun(entry.query)}
                    className="btn btn-primary flex-1 justify-center text-sm"
                  >
                    <RotateCcw size={16} />
                    إعادة البحث
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    aria-label="حذف"
                    className="btn bg-bg-secondary text-secondary hover:text-error hover:bg-error/10 px-3"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {entry.pinned && (
                  <div className="flex items-center gap-2 text-xs text-purple">
                    <Pin size={12} />
                    <span>مثبت — لن يُمسح عند تفريغ السجل</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Tip */}
        {hydrated && entries.length > 0 && (
          <div className="glass border-purple/30 bg-purple/5 rounded-2xl p-4 flex items-center gap-3 text-sm">
            <Sparkles size={18} className="text-purple shrink-0" />
            <p className="text-secondary">
              <span className="text-primary font-semibold">نصيحة:</span> ثبت
              عمليات البحث المتكررة (بالضغط على{' '}
              <Pin size={12} className="inline" />) عشان تفضل موجودة حتى لو
              مسحت السجل.
            </p>
            <Link
              href="/search"
              className="ms-auto btn btn-outline text-xs py-1.5 px-3 shrink-0"
            >
              بحث جديد
              <ArrowLeft size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'purple' | 'blue';
}) {
  return (
    <div className="rounded-xl bg-bg-secondary/50 border border-white/5 p-4">
      <span className="text-xs text-muted block">{label}</span>
      <span
        className={cn(
          'text-3xl font-extrabold',
          accent === 'purple' && 'gradient-text',
          accent === 'blue' && 'text-accent'
        )}
      >
        {value.toLocaleString('ar-EG')}
      </span>
    </div>
  );
}
