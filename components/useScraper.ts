import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { normalizeProductName } from '@/lib/search/normalize';
import { scoreProduct } from '@/lib/search/score';
import { fireSavePrompt } from '@/components/SaveSearchPrompt';

export interface Product {
  name: string;
  price: number;
  currency: string;
  seller: string;
  url: string;
  source: string;
  image: string;
  score?: number;
  relevance?: number;
}

interface JobStatus {
  jobId: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  totalScraped?: number;
  count?: number;
  error?: string | null;
  products?: Product[];
}

/** Submit a search query and get a jobId back. */
async function submitJob(query: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal,
  });
  if (!res.ok) {
    let msg = 'API error';
    try {
      const data = await res.json();
      if (data?.error) msg = String(data.error);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as { jobId: string };
  return data.jobId;
}

/** Poll the status endpoint until the job is no longer pending/running. */
async function pollJob(
  jobId: string,
  signal: AbortSignal,
  timeoutMs: number,
  onPoll?: () => void
): Promise<JobStatus> {
  const start = Date.now();
  let interval = 800;
  const maxInterval = 2500;
  while (true) {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    if (Date.now() - start > timeoutMs) {
      throw new Error('timeout');
    }
    onPoll?.();
    const res = await fetch(`/api/scrape/status/${jobId}`, {
      method: 'GET',
      cache: 'no-store',
      signal,
    });
    if (!res.ok) {
      throw new Error(`status ${res.status}`);
    }
    const data = (await res.json()) as JobStatus;
    if (data.status === 'complete' || data.status === 'failed') {
      return data;
    }
    await new Promise<void>((r) => setTimeout(r, interval));
    interval = Math.min(maxInterval, Math.floor(interval * 1.3));
  }
}

/** Score and filter products against a query string */
function filterByRelevance(
  products: Product[],
  query: string,
  minRelevance = 0.5
): Product[] {
  const { tokens: queryTokens } = normalizeProductName(query);
  if (queryTokens.length === 0) return products;

  return products
    .map((p) => {
      const { tokens: pTokens } = normalizeProductName(p.name);
      const score = scoreProduct(pTokens, queryTokens);
      const relevance = score / queryTokens.length;
      return { ...p, score, relevance };
    })
    .filter((p) => p.score! > 0 && p.relevance! >= minRelevance)
    .sort((a, b) => a.price - b.price);
}

/** Hook that manages scraping, filtering, and all related state */
export function useScraper(initialQuery: string = '') {
  const { status } = useSession();
  const [scrapeQuery, setScrapeQuery] = useState(initialQuery);
  const [filterQuery, setFilterQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const savePromptFiredRef = useRef(false);

  const filteredProducts = useMemo(() => {
    if (products.length === 0) return [];
    if (!filterQuery.trim()) return products;
    return filterByRelevance(products, filterQuery);
  }, [products, filterQuery]);

  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const handleScrape = async (e?: React.FormEvent | string) => {
    if (typeof e !== 'string' && e?.preventDefault) e.preventDefault();
    const query = (typeof e === 'string' ? e : scrapeQuery).trim();
    if (!query) return;
    setScrapeQuery(query);

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError('');
    setProducts([]);
    setFilterQuery('');
    setHasSearched(true);

    try {
      const jobId = await submitJob(query, controller.signal);
      if (requestId !== requestIdRef.current) return;
      const result = await pollJob(jobId, controller.signal, 180_000);
      if (requestId !== requestIdRef.current) return;

      if (result.status === 'failed') {
        setError(result.error || 'فشل البحث. حاول مرة أخرى.');
        return;
      }

      const list = (result.products ?? []).sort(
        (a, b) => a.price - b.price
      );
      setProducts(list);
      if (
        status === 'unauthenticated' &&
        !savePromptFiredRef.current &&
        list.length > 0
      ) {
        savePromptFiredRef.current = true;
        fireSavePrompt();
      }
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (err instanceof Error && err.message === 'timeout') {
        setError('البحث استغرق وقت طويل. حاول مرة أخرى.');
        return;
      }
      const msg = err instanceof Error ? err.message : 'API error';
      setError(msg || 'تعذر جلب النتائج. حاول مرة أخرى لاحقاً.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  const reset = () => {
    setProducts([]);
    setError('');
    setFilterQuery('');
    setHasSearched(false);
  };

  return {
    scrapeQuery,
    setScrapeQuery,
    filterQuery,
    setFilterQuery,
    products,
    filteredProducts,
    loading,
    error,
    hasSearched,
    handleScrape,
    reset,
  };
}
