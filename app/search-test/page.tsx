'use client';

import Image from 'next/image';
import { products } from "@/lib/products.js";
import { useState, useMemo } from "react";
import { normalizeProductName } from "@/lib/search/normalize";
import { scoreProduct } from "@/lib/search/score";
import { MIN_RELEVANCE } from "@/lib/search/min-relevance";

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%231e293b'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Cairo,sans-serif' font-size='14' fill='%2364748b'>لا توجد صورة</text></svg>";

function Page() {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!query.trim()) return products;

    const { tokens: queryTokens } = normalizeProductName(query);

    if (queryTokens.length === 0) return products;

    const scored = products.map((p) => {
      const { tokens: productTokens } = normalizeProductName(p.name);
      const score = scoreProduct(productTokens, queryTokens);
      const relevance = score / queryTokens.length;
      return { ...p, score, relevance };
    });

    const results = scored
      .filter((p) => p.score > 0 && p.relevance >= MIN_RELEVANCE)
      .sort((a, b) => b.score - a.score);

    return results;
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-10">
          مقارنة الأسعار
        </h1>

        <div className="mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full px-6 py-4 text-lg border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black focus:border-blue-500"
            dir="rtl"
          />
        </div>

        {filteredProducts.length > 0 ? (
          <ul className="space-y-6">
            {filteredProducts.map((p, i) => (
              <li key={i} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition p-6 flex gap-8 items-start">
                <Image
                  src={p.image}
                  alt={p.name}
                  width={160}
                  height={160}
                  unoptimized
                  className="w-40 h-40 object-contain rounded-lg bg-gray-100 flex-shrink-0"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src !== PLACEHOLDER_IMG) img.src = PLACEHOLDER_IMG;
                  }}
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
        ) : (
          <p className="text-center text-gray-600 text-lg mt-20">
            لا توجد نتائج مطابقة.
          </p>
        )}
      </div>
    </div>
  );
}

export default Page;