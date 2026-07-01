import puppeteer, { Page } from 'puppeteer';
import { Product } from '../types';
import { scrapeAmazon } from './amazon';
import { scrapeJumia } from './jumia';
import { scrapeNoon } from './noon';

const MAX_PER_SITE = 200;

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
    (window as unknown as { chrome: { runtime: unknown } }).chrome = { runtime: {} };

    Object.defineProperty(navigator, 'languages', {
      get: () => ['ar-EG', 'ar', 'en'],
    });

    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
  });
}

function randomDelay(min = 5000, max = 10000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

export async function runAllScrapers(query: string): Promise<Product[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    timeout: 90_000,
  });

  try {
    const all: Product[] = [];
    for (const { name, fn } of [
      { name: 'Amazon', fn: scrapeAmazon },
      { name: 'Jumia', fn: scrapeJumia },
      { name: 'Noon', fn: scrapeNoon },
    ] as const) {
      const page = await browser.newPage();
      try {
        await applyStealth(page);
        const res = await fn(page, query, MAX_PER_SITE);
        all.push(...res);
      } catch (err) {
        console.error(`[scrape] ${name} failed`, err);
      } finally {
        await page.close();
      }
      await randomDelay();
    }
    return all;
  } finally {
    await browser.close();
  }
}
