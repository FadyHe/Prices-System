import puppeteer, { Page } from 'puppeteer';
import { scrapeAmazon } from '@/lib/scrapers/amazon';
import { scrapeJumia } from '@/lib/scrapers/jumia';
import { scrapeNoon } from '@/lib/scrapers/noon';
import { scrapeSamsung } from '@/lib/scrapers/samsung';
import type { Product } from '@/lib/types';

// Configurable max products per site
const MAX_PER_SITE = 20; // Increased from 15 to 20
const DEBUG = true; // Set to false in production

/* -------------------- STEALTH -------------------- */

async function applyStealth(page: Page) {
  await page.setViewport({ width: 1366, height: 768 });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ar-EG,ar;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });

  await page.emulateTimezone('Africa/Cairo');

  // Enable console logs from the browser if in debug mode
  if (DEBUG) {
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Amazon]') || text.includes('[Noon]') || text.includes('[Samsung]') || text.includes('[Jumia]')) {
        console.log('Browser console:', text);
      }
    });
  }

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ar-EG', 'ar', 'en'],
    });

    (window as any).chrome = {
      runtime: {},
    };
  });
}

/* -------------------- HELPERS -------------------- */

async function safeScrape(
  label: string,
  fn: () => Promise<Product[]>
): Promise<{ products: Product[]; error?: string }> {
  const startTime = Date.now();
  try {
    console.log(`\n[${label}] Starting scrape...`);
    const res = await fn();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${label}] ✓ Found ${res.length} products in ${duration}s`);
    return { products: res };
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[${label}] ✗ Failed after ${duration}s:`, errorMsg);
    if (err instanceof Error && err.stack) {
      console.error(`[${label}] Stack:`, err.stack);
    }
    return { products: [], error: errorMsg };
  }
}

/* -------------------- MAIN SCRAPER (SEQUENTIAL) -------------------- */

async function scrapeAll(query: string, maxPerSite?: number): Promise<{
  products: Product[];
  errors: Record<string, string>;
  stats: Record<string, number>;
}> {
  const max = maxPerSite || MAX_PER_SITE;
  
  console.log('\n========================================');
  console.log(`Starting scrape for query: "${query}"`);
  console.log(`Max products per site: ${max}`);
  console.log('========================================\n');

  const browser = await puppeteer.launch({
    headless: true, // Change to false to see what's happening
    timeout: 90000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,768',
    ],
  });

  const products: Product[] = [];
  const errors: Record<string, string> = {};
  const stats: Record<string, number> = {};

  try {
    // Amazon
    const amazonPage = await browser.newPage();
    await applyStealth(amazonPage);
    const amazonResult = await safeScrape('Amazon', () => scrapeAmazon(amazonPage, query, max));
    products.push(...amazonResult.products);
    stats.Amazon = amazonResult.products.length;
    if (amazonResult.error) errors.Amazon = amazonResult.error;
    await amazonPage.close();

    // Jumia
    const jumiaPage = await browser.newPage();
    await applyStealth(jumiaPage);
    const jumiaResult = await safeScrape('Jumia', () => scrapeJumia(jumiaPage, query, max));
    products.push(...jumiaResult.products);
    stats.Jumia = jumiaResult.products.length;
    if (jumiaResult.error) errors.Jumia = jumiaResult.error;
    await jumiaPage.close();

    // Noon
    const noonPage = await browser.newPage();
    await applyStealth(noonPage);
    const noonResult = await safeScrape('Noon', () => scrapeNoon(noonPage, query, max));
    products.push(...noonResult.products);
    stats.Noon = noonResult.products.length;
    if (noonResult.error) errors.Noon = noonResult.error;
    await noonPage.close();

    // Samsung
    const samsungPage = await browser.newPage();
    await applyStealth(samsungPage);
    const samsungResult = await safeScrape('Samsung', () => scrapeSamsung(samsungPage, query, max));
    products.push(...samsungResult.products);
    stats.Samsung = samsungResult.products.length;
    if (samsungResult.error) errors.Samsung = samsungResult.error;
    await samsungPage.close();

  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log('Scraping Summary:');
  console.log(`Total products: ${products.length}`);
  console.log('Products per site:', stats);
  console.log(`Errors: ${Object.keys(errors).length}`);
  if (Object.keys(errors).length > 0) {
    console.log('Failed sites:', Object.keys(errors).join(', '));
  }
  console.log('========================================\n');

  return { products, errors, stats };
}

/* -------------------- API HANDLER -------------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body?.query;
    const maxPerSite = body?.maxPerSite; // Optional: allow frontend to specify

    if (!query || typeof query !== 'string') {
      return Response.json({ error: 'query is required' }, { status: 400 });
    }

    const { products, errors, stats } = await scrapeAll(query.trim(), maxPerSite);

    return Response.json({
      query,
      count: products.length,
      products,
      stats, // Include stats showing products per site
      ...(Object.keys(errors).length > 0 && { errors }), // Include errors if any
    });

  } catch (err) {
    console.error('API error:', err);
    return Response.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}