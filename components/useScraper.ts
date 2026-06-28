import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeProductName } from '@/lib/search/normalize';
import { scoreProduct } from '@/lib/search/score';

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

/** Fetch products from the scrape API */
async function fetchProducts(query: string, signal?: AbortSignal): Promise<Product[]> {
  const res = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!res.ok) throw new Error('API error');

  const data = await res.json();
  return (data.products as Product[]).sort((a, b) => a.price - b.price);
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
  const [scrapeQuery, setScrapeQuery] = useState(initialQuery);
  const [filterQuery, setFilterQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

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
      const result = await fetchProducts(query, controller.signal);
      if (requestId !== requestIdRef.current) return;
      setProducts(result);
    } catch (err) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('تعذر جلب النتائج. حاول مرة أخرى لاحقاً.');
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
