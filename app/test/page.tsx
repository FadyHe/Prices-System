'use client';

import { useState, useMemo } from 'react';
import { normalizeProductName } from "@/lib/search/normalize";
import { scoreProduct } from "@/lib/search/score";

interface Product {
  name: string;
  price: number;
  currency: string;
  seller: string;
  url: string;
  source: string;
  image: string;
}

const PLACEHOLDER = 'https://via.placeholder.com/200x200?text=No+Image';

export default function ScraperTest() {
  const [scrapeQuery, setScrapeQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [scrapedProducts, setScrapedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter scraped products using relevance scoring
  const filteredProducts = useMemo(() => {
    if (scrapedProducts.length === 0) return [];
    if (!filterQuery.trim()) return scrapedProducts;

    const { tokens: queryTokens } = normalizeProductName(filterQuery);
    if (queryTokens.length === 0) return scrapedProducts;

    const scored = scrapedProducts.map((p) => {
      const { tokens: productTokens } = normalizeProductName(p.name);
      const score = scoreProduct(productTokens, queryTokens);
      const relevance = score / queryTokens.length;
      return { ...p, score, relevance };
    });

    const minRelevance = 0.5;
    return scored
      .filter((p) => p.score > 0 && p.relevance >= minRelevance)
      .sort((a, b) => a.price - b.price);
  }, [scrapedProducts, filterQuery]);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scrapeQuery.trim()) return;

    setLoading(true);
    setError('');
    setScrapedProducts([]);
    setFilterQuery('');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: scrapeQuery.trim() }),
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      const sorted = (data.products as Product[]).sort((a, b) => a.price - b.price);
      setScrapedProducts(sorted);
    } catch (err) {
      setError('Failed to fetch results. Check console + API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-10">
          مقارنة الأسعار
        </h1>

        {/* Scrape search bar */}
        <form onSubmit={handleScrape} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-6">
          <input
            type="text"
            value={scrapeQuery}
            onChange={(e) => setScrapeQuery(e.target.value)}
            placeholder="ابحث عن منتج (مثل جالكسي اس 24)"
            className="flex-1 text-black px-6 py-4 text-lg rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500 shadow-sm text-right"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !scrapeQuery.trim()}
            className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-lg transition"
          >
            {loading ? 'جاري البحث...' : 'بحث'}
          </button>
        </form>

        {/* Filter search bar - only shows after scraping */}
        {scrapedProducts.length > 0 && (
          <div className="max-w-2xl mx-auto mb-8">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="فلتر النتائج..."
              className="w-full text-black px-6 py-3 text-base rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-green-500 shadow-sm text-right"
              dir="rtl"
            />
            <p className="text-center text-gray-500 text-sm mt-2">
              عرض {filteredProducts.length} من أصل {scrapedProducts.length} منتج
            </p>
          </div>
        )}

        {error && <p className="text-center text-red-600 text-lg mb-8">{error}</p>}

        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          </div>
        )}

        {filteredProducts.length > 0 && (
          <ul className="space-y-6">
            {filteredProducts.map((p, i) => (
              <li key={i} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition p-6 flex gap-8 items-start">
                <img
                  src={p.image || PLACEHOLDER}
                  alt={p.name}
                  className="w-40 h-40 object-contain rounded-lg bg-gray-100 flex-shrink-0"
                  onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3 line-clamp-2">
                    {p.name}
                  </h3>
                  <div className="flex items-baseline gap-3 mb-4 justify-end">
                    <span className="text-xl text-gray-600">{p.currency}</span>
                    <span className="text-4xl font-bold text-blue-600">
                      {p.price.toLocaleString('ar-EG')}
                    </span>
                  </div>
                  <div className="text-base text-gray-600 space-y-1 mb-6">
                    <p>البائع: <span className="font-medium">{p.seller}</span></p>
                    <p>المصدر: <span className="font-medium">{p.source}</span></p>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
                  >
                    عرض المنتج →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && scrapedProducts.length > 0 && filteredProducts.length === 0 && (
          <p className="text-center text-gray-600 text-lg mt-20">
            لا توجد نتائج مطابقة للفلتر.
          </p>
        )}
      </div>
    </div>
  );
}