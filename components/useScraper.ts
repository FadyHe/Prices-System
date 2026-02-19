import { useState, useMemo } from 'react';
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
async function fetchProducts(query: string): Promise<Product[]> {
  const res = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
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
export function useScraper() {
  const [scrapeQuery, setScrapeQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredProducts = useMemo(() => {
    if (products.length === 0) return [];
    if (!filterQuery.trim()) return products;
    return filterByRelevance(products, filterQuery);
  }, [products, filterQuery]);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeQuery.trim()) return;

    setLoading(true);
    setError('');
    setProducts([]);
    setFilterQuery('');

    try {
      const result = await fetchProducts(scrapeQuery.trim());
      setProducts(result);
    } catch {
      setError('Failed to fetch results. Check console + API.');
    } finally {
      setLoading(false);
    }
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
    handleScrape,
  };
}
