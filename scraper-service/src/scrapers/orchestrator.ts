import puppeteer, { Page } from 'puppeteer';
import { Product } from '../types';
import { scrapeAmazon } from './amazon';
import { scrapeJumia } from './jumia';
import { scrapeNoon } from './noon';

const MAX_PER_SITE = 15;
const PER_SITE_TIMEOUT_MS = 30_000;

async function applyStealth(page: Page) {
  await page.setViewport({ width: 1280, height: 900 });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ar-EG,ar;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (type === 'image' || type === 'font' || type === 'media') {
      req.abort().catch(() => undefined);
    } else {
      req.continue().catch(() => undefined);
    }
  });

  // esbuild/tsx emits a __name helper for named functions. puppeteer's page.evaluate
  // serializes callback source and runs it in the page, where that helper is undefined,
  // so define a no-op polyfill on every new document to keep it present.
  await page.evaluateOnNewDocument(() => {
    (globalThis as any).__name =
      globalThis.__name || ((f: any, _name: string) => f);
  });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    (window as unknown as { chrome: { runtime: unknown } }).chrome = { runtime: {} };

    Object.defineProperty(navigator, 'languages', {
      get: () => ['ar-EG', 'ar', 'en'],
    });

    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
  });
}

/** Race a scraper against a hard timeout so one slow site cannot block the run. */
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms
    );
  });
  try {
    return (await Promise.race([p, timeout])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runOne(
  name: string,
  fn: (page: Page, query: string, max: number) => Promise<Product[]>,
  browser: import('puppeteer').Browser,
  query: string,
  max: number
): Promise<{ products: Product[]; elapsedMs: number; timedOut: boolean }> {
  const page = await browser.newPage();
  const start = Date.now();
  let timedOut = false;
  try {
    await applyStealth(page);
    try {
      const products = await withTimeout(fn(page, query, max), PER_SITE_TIMEOUT_MS, name);
      return { products, elapsedMs: Date.now() - start, timedOut: false };
    } catch (err) {
      // withTimeout rejects -> the site hit its 30s cap.
      if (err instanceof Error && err.message.includes('timed out after')) {
        timedOut = true;
        console.error(`[scrape] ${name} hit its ${PER_SITE_TIMEOUT_MS}ms timeout`);
      } else {
        console.error(`[scrape] ${name} failed`, err);
      }
      return { products: [], elapsedMs: Date.now() - start, timedOut };
    }
  } finally {
    await page.close().catch(() => undefined);
  }
}

/** Run scrapers with aggressive concurrency and early exit on timeout. */
export async function runAllScrapers(query: string): Promise<Product[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    timeout: 60_000,
  });

  try {
    const totalStart = Date.now();
    const results = await Promise.all([
      runOne('Amazon', scrapeAmazon, browser, query, MAX_PER_SITE),
      runOne('Jumia', scrapeJumia, browser, query, MAX_PER_SITE),
      runOne('Noon', scrapeNoon, browser, query, MAX_PER_SITE),
    ]);
    for (const r of results) {
      console.log(
        `[timing] ${r.timedOut ? 'TIMEOUT' : 'ok    '} elapsed=${r.elapsedMs}ms`
      );
    }
    console.log(`[timing] allScrapers total=${Date.now() - totalStart}ms`);
    return results.flatMap((r) => r.products);
  } finally {
    await browser.close();
  }
}
