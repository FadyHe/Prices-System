import puppeteer, { Browser, Page } from 'puppeteer';

import { scrapeAmazon } from '@/lib/scrapers/amazon';
import { scrapeJumia } from '@/lib/scrapers/jumia';
import { scrapeNoon } from '@/lib/scrapers/noon';
import { scrapeGoogleShopping } from '@/lib/scrapers/googleShopping';
import { normalizeProductName } from '@/lib/search/normalize';
import { scoreProduct } from '@/lib/search/score';

import type { Product } from '@/lib/types';

export const runtime = 'nodejs';

const MAX_PER_SITE = 200;

/* ================== STEALTH ================== */
async function applyStealth(page: Page) {
  await page.setViewport({ width: 1280, height: 900 });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ar-EG,ar;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // @ts-ignore
    window.chrome = { runtime: {} };

    Object.defineProperty(navigator, 'languages', {
      get: () => ['ar-EG', 'ar', 'en'],
    });

    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
  });
}

/** Small random delay to appear more human */
function randomDelay(min = 5000, max = 10000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

/* ================== SCRAPE HELPERS ================== */
async function runScraper(
  browser: Browser,
  name: string,
  scraper: (page: Page, q: string, max: number) => Promise<Product[]>,
  query: string
): Promise<Product[]> {
  console.log(`▶️ Starting ${name} scraper`);

  const page = await browser.newPage();
  await applyStealth(page);

  try {
    const result = await scraper(page, query, MAX_PER_SITE);
    console.log(`✅ ${name} done → ${result.length} products`);
    return result;
  } catch (err) {
    console.error(`❌ ${name} failed`, err);
    return [];
  } finally {
    await page.close();
  }
}

/* ================== MAIN SCRAPER ================== */
async function scrapeAll(query: string): Promise<Product[]> {
  const browser = await puppeteer.launch({
    headless: false, // خليه false وانت بتفهم اللي بيحصل
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    timeout: 90_000,
  });

  const allProducts: Product[] = [];

  try {
    // 1️⃣ Amazon
    const amazon = await runScraper(
      browser,
      'Amazon',
      scrapeAmazon,
      query
    );
    allProducts.push(...amazon);

    await randomDelay();

    // 2️⃣ Jumia
    const jumia = await runScraper(
      browser,
      'Jumia',
      scrapeJumia,
      query
    );
    allProducts.push(...jumia);

    await randomDelay();

    // 3️⃣ Noon
    const noon = await runScraper(
      browser,
      'Noon',
      scrapeNoon,
      query
    );
    allProducts.push(...noon);

    await randomDelay();

    // 4️⃣ Google Shopping
    const google = await runScraper(
      browser,
      'Google Shopping',
      scrapeGoogleShopping,
      query
    );
    allProducts.push(...google);

  } finally {
    await browser.close();
  }

  return allProducts;
}

/* ================== API ROUTE ================== */
export async function POST(req: Request) {
  const body = await req.json();
  const query = body?.query;

  if (!query || typeof query !== 'string') {
    return Response.json(
      { error: 'query is required' },
      { status: 400 }
    );
  }

  const raw = await scrapeAll(query.trim());

  // --- Server-side relevance filtering ---
  const { tokens: queryTokens } = normalizeProductName(query);
  const MIN_RELEVANCE = 0.3;

  const filtered = raw
    .map((p) => {
      const { tokens: pTokens } = normalizeProductName(p.name);
      const score = scoreProduct(pTokens, queryTokens);
      const relevance = queryTokens.length > 0 ? score / queryTokens.length : 0;
      return { ...p, score, relevance };
    })
    .filter((p) => p.score > 0 && p.relevance >= MIN_RELEVANCE)
    .sort((a, b) => a.price - b.price);

  console.log(`🔍 Filter: ${raw.length} scraped → ${filtered.length} relevant (query tokens: [${queryTokens.join(', ')}])`);

  return Response.json({
    totalScraped: raw.length,
    count: filtered.length,
    products: filtered,
  });
}
