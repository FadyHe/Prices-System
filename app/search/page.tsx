'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowUpDown,
  Filter,
  Loader2,
  PackageSearch,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
} from 'lucide-react';

import { useScraper, type Product } from '@/components/useScraper';
import { useSearchHistory } from '@/components/useSearchHistory';
import SearchBar from '@/components/SearchBar';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import ErrorBanner from '@/components/ErrorBanner';
import SourceBadge, { getSourceLabel } from '@/components/SourceBadge';
import { cn } from '@/lib/utils';

type SortKey = 'price-asc' | 'price-desc' | 'relevance';
type SourceFilter = 'all' | string;

const SUGGESTIONS = [
  'ايفون 15 برو ماكس',
  'جالكسي اس 24 الترا',
  'سماعات ايربودز برو',
  'بلايستيشن 5',
  'لاب توب Dell XPS',
];

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const initialSource = (searchParams.get('source') as SourceFilter) ?? 'all';

  const {
    scrapeQuery,
    filterQuery,
    setFilterQuery,
    products,
    filteredProducts,
    loading,
    error,
    hasSearched,
    handleScrape,
  } = useScraper(initialQuery);

  const [sort, setSort] = useState<SortKey>('price-asc');
  const [source, setSource] = useState<SourceFilter>(initialSource);

  const { add, entries, attachProducts } = useSearchHistory();
  const autoRanRef = useRef(false);

  // Auto-run search if a query is in the URL and we haven't yet
  useEffect(() => {
    if (
      initialQuery &&
      !autoRanRef.current &&
      !loading &&
      products.length === 0 &&
      !error
    ) {
      autoRanRef.current = true;
      handleScrape(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Persist to history when results arrive
  useEffect(() => {
    if (!loading && hasSearched && products.length > 0 && scrapeQuery) {
      const best = [...products].sort((a, b) => a.price - b.price)[0];
      add({
        query: scrapeQuery,
        resultCount: products.length,
        bestPrice: best?.price,
        bestSource: best?.source,
        savedProducts: products.slice(0, 20),
      });
    }
  }, [loading, hasSearched, products, scrapeQuery, add]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    for (const p of products) counts[p.source] = (counts[p.source] ?? 0) + 1;
    return counts;
  }, [products]);

  const availableSources = useMemo(
    () =>
      Object.keys(sourceCounts).filter(
        (k) => k !== 'all' && sourceCounts[k] > 0
      ),
    [sourceCounts]
  );

  const visibleProducts = useMemo(() => {
    let list = filteredProducts;
    if (source !== 'all') list = list.filter((p) => p.source === source);

    return [...list].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      return (b.relevance ?? 0) - (a.relevance ?? 0);
    });
  }, [filteredProducts, source, sort]);

  const bestPrice = useMemo(() => {
    if (products.length === 0) return null;
    return products.reduce((min, p) => (p.price < min.price ? p : min), products[0]);
  }, [products]);

  const savedUrls = useMemo(() => {
    const lastEntry = entries[0];
    return new Set((lastEntry?.savedProducts ?? []).map((p) => p.url));
  }, [entries]);

  const handleSubmit = (q: string) => {
    autoRanRef.current = true;
    router.replace(`/search?q=${encodeURIComponent(q)}`);
    handleScrape(q);
  };

  const handleSaveProduct = (product: Product) => {
    const lastEntry = entries[0];
    if (!lastEntry) return;
    const exists = (lastEntry.savedProducts ?? []).some(
      (p) => p.url === product.url
    );
    if (exists) return;
    attachProducts(
      lastEntry.id,
      [product, ...(lastEntry.savedProducts ?? [])].slice(0, 20)
    );
  };

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 py-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* Header bar */}
        <div className="glass flex flex-col gap-4 p-5 md:p-6 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-primary">
                {scrapeQuery ? (
                  <>
                    نتائج البحث عن{' '}
                    <span className="gradient-text">&ldquo;{scrapeQuery}&rdquo;</span>
                  </>
                ) : (
                  'ابحث عن منتج'
                )}
              </h1>
              {hasSearched && !loading && (
                <p className="text-secondary text-sm mt-1">
                  {products.length > 0
                    ? `${products.length} منتج من ${
                        availableSources.length
                      } متاجر`
                    : 'لا توجد نتائج مطابقة'}
                </p>
              )}
            </div>
          </div>

          <SearchBar
            initialQuery={scrapeQuery}
            onSubmit={handleSubmit}
            placeholder="ابحث عن منتج (مثل جالكسي اس 24)"
          />
        </div>

        {/* Error */}
        {error && <ErrorBanner message={error} />}

        {/* Loading skeleton */}
        {loading && <ResultsSkeleton />}

        {/* Best price highlight */}
        {!loading && bestPrice && (
          <div className="glass gradient-border relative overflow-hidden rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple/20 border border-purple/40 flex items-center justify-center text-purple shrink-0">
                <TrendingDown size={28} />
              </div>
              <div>
                <span className="pill text-xs mb-2 inline-flex">
                  <Sparkles size={14} /> أفضل عرض
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-primary line-clamp-1">
                  {bestPrice.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-secondary">
                  <SourceBadge source={bestPrice.source} />
                  <span>من {getSourceLabel(bestPrice.source)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="price-currency block">{bestPrice.currency}</span>
                <span className="price-best text-4xl font-extrabold block">
                  {bestPrice.price.toLocaleString('ar-EG')}
                </span>
              </div>
              <a
                href={bestPrice.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                اشترِ الآن
              </a>
            </div>
          </div>
        )}

        {/* Filters bar */}
        {!loading && products.length > 0 && (
          <div className="glass flex flex-col gap-4 p-4 md:p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-secondary text-sm">
              <SlidersHorizontal size={16} />
              <span className="font-semibold text-primary">فلاتر</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Source chips */}
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <span className="text-xs text-muted flex items-center gap-1">
                  <Filter size={12} /> المصدر
                </span>
                <button
                  type="button"
                  onClick={() => setSource('all')}
                  className={cn('pill text-xs', source === 'all' && 'pill-active')}
                >
                  الكل ({sourceCounts.all})
                </button>
                {availableSources.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSource(src)}
                    className={cn(
                      'pill text-xs',
                      source === src && 'pill-active'
                    )}
                  >
                    {getSourceLabel(src)} ({sourceCounts[src]})
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2 shrink-0">
                <ArrowUpDown size={16} className="text-muted" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="input py-2 px-3 text-sm"
                  aria-label="ترتيب"
                >
                  <option value="price-asc">السعر: الأقل أولاً</option>
                  <option value="price-desc">السعر: الأعلى أولاً</option>
                  <option value="relevance">الأكثر تطابقاً</option>
                </select>
              </div>
            </div>

            {/* Sub filter input */}
            <div className="relative">
              <input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="فلتر يدوي (مثلاً: سامسونج فقط)"
                className="input w-full pr-4 pl-12 py-2 text-sm"
                aria-label="فلتر يدوي"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                {visibleProducts.length}/{products.length}
              </span>
            </div>
          </div>
        )}

        {/* Results grid */}
        {!loading && products.length > 0 && visibleProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visibleProducts.map((p, i) => (
              <ProductCard
                key={`${p.url}-${i}`}
                product={p}
                isBest={bestPrice?.url === p.url}
                onSave={handleSaveProduct}
                saved={savedUrls.has(p.url)}
              />
            ))}
          </div>
        )}

        {/* Empty results from API */}
        {!loading && hasSearched && products.length === 0 && !error && (
          <EmptyState
            icon={<PackageSearch size={32} />}
            title="لا توجد نتائج"
            description={`لم نجد منتجات تطابق &ldquo;${scrapeQuery}&rdquo;. جرب كلمات بحث مختلفة أو تحقق من الإملاء.`}
            action={
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted">جرب أحد الاقتراحات:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSubmit(s)}
                      className="pill text-sm"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            }
          />
        )}

        {/* Empty filter results */}
        {!loading && products.length > 0 && visibleProducts.length === 0 && (
          <EmptyState
            icon={<SearchX size={32} />}
            title="لا توجد نتائج تطابق الفلاتر"
            description="جرّب إزالة فلتر المصدر أو مسح الفلتر اليدوي."
            action={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSource('all');
                    setFilterQuery('');
                  }}
                  className="btn btn-outline"
                >
                  مسح الفلاتر
                </button>
                <Link href="/search" className="btn btn-primary">
                  بحث جديد
                </Link>
              </div>
            }
          />
        )}

        {/* Initial state — no query yet */}
        {!loading && !hasSearched && !scrapeQuery && (
          <EmptyState
            icon={<PackageSearch size={32} />}
            title="ابدأ بالبحث عن أي منتج"
            description="نقارن لك الأسعار من Amazon و Noon و Jumia ونرتبهم من الأقل للأعلى."
            action={
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSubmit(s)}
                    className="pill text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="glass flex items-center justify-center gap-3 rounded-2xl p-6 text-secondary">
        <Loader2 size={20} className="animate-spin text-purple" />
        <span>جاري البحث في المتاجر...</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl overflow-hidden">
            <div className="skeleton aspect-square w-full" />
            <div className="p-5 flex flex-col gap-3">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-8 w-2/3 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-purple" />
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
