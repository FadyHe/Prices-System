import puppeteer, { Page } from 'puppeteer';
import { Product } from '../types';
import { scrapeAmazon } from './amazon';
import { scrapeJumia } from './jumia';
import { scrapeNoon } from './noon';

const MAX_PER_SITE = 30;
const PER_SITE_TIMEOUT_MS = 75_000;

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
): Promise<Product[]> {
  const page = await browser.newPage();
  try {
    await applyStealth(page);
    return await withTimeout(fn(page, query, max), PER_SITE_TIMEOUT_MS, name);
  } catch (err) {
    console.error(`[scrape] ${name} failed`, err);
    return [];
  } finally {
    await page.close().catch(() => undefined);
  }
}

/** Sequential — kept for backwards compat / debugging. */
export async function runAllScrapers(query: string): Promise<Product[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    timeout: 90_000,
  });

  try {
    const results = await Promise.all([
      runOne('Amazon', scrapeAmazon, browser, query, MAX_PER_SITE),
      runOne('Jumia', scrapeJumia, browser, query, MAX_PER_SITE),
      runOne('Noon', scrapeNoon, browser, query, MAX_PER_SITE),
    ]);
    return results.flat();
  } finally {
    await browser.close();
  }
}
