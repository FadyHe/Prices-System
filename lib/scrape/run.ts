import puppeteer, { Browser, Page } from 'puppeteer';
import { Product } from '@/lib/types';
import { scrapeAmazon } from '@/lib/scrapers/amazon';
import { scrapeJumia } from '@/lib/scrapers/jumia';
import { scrapeNoon } from '@/lib/scrapers/noon';
import { normalizeProductName } from '@/lib/search/normalize';
import { scoreProduct } from '@/lib/search/score';
import { MIN_RELEVANCE } from '@/lib/search/min-relevance';

const MAX_PER_SITE = 15;
const PER_SITE_TIMEOUT_MS = 30_000;

export interface SourceFailure {
  site: string;
  reason: string;
  detail?: string;
}

export interface ScrapeResult {
  products: Product[];
  failures: SourceFailure[];
  elapsedMs: number;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function runOne(
  name: string,
  fn: (page: Page, query: string, max: number) => Promise<Product[]>,
  browser: Browser,
  query: string,
  max: number,
  timeoutMs = PER_SITE_TIMEOUT_MS
): Promise<{ products: Product[]; failure?: SourceFailure }> {
  const page = await browser.newPage();
  try {
    // esbuild/tsx emits a __name helper for named functions; puppeteer's
    // page.evaluate serializes only the callback source and runs it in the
    // browser where that helper is undefined. Define a no-op polyfill on
    // every new document so evaluate callbacks keep working.
    await page.evaluateOnNewDocument(() => {
      (globalThis as unknown as Record<string, unknown>).__name =
        (globalThis as unknown as Record<string, unknown>).__name ||
        ((f: unknown) => f);
    });
    // Light jitter so concurrent sites don't all hit their CDNs at once.
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 500) + 150));
    const products = await withTimeout(fn(page, query, max), timeoutMs, name);
    if (products.length === 0) {
      return { products, failure: { site: name, reason: 'empty', detail: 'scraper returned 0 products' } };
    }
    return { products };
  } catch (err) {
    const reason =
      err instanceof Error && err.message.includes('timed out after') ? 'timeout' : 'parse_failed';
    return {
      products: [],
      failure: {
        site: name,
        reason,
        detail: err instanceof Error ? err.message : String(err),
      },
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

/**
 * In-process scrape: launch one headless browser, scrape Amazon/Jumia/Noon
 * concurrently (each capped at 30s), score + relevance-filter with the
 * shared lib/search module. This does NOT depend on GitHub Actions, so it
 * works on localhost and production alike even when GH runners are down.
 */
export async function runAllScrapers(query: string): Promise<ScrapeResult> {
  const start = Date.now();
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      // Noon rejects HTTP/2 with ERR_HTTP2_PROTOCOL_ERROR; force HTTP/1.1.
      '--disable-http2',
    ],
    timeout: 30_000,
  });
  try {
    const results = await Promise.all([
      runOne('Amazon', scrapeAmazon, browser, query, MAX_PER_SITE),
      runOne('Jumia', scrapeJumia, browser, query, MAX_PER_SITE),
      runOne('Noon', scrapeNoon, browser, query, MAX_PER_SITE),
    ]);
    const raw = results.flatMap((r) => r.products);
    const failures = results
      .map((r) => r.failure)
      .filter((f): f is SourceFailure => !!f);

    const { tokens: queryTokens } = normalizeProductName(query);
    const filtered = raw
      .map((p) => {
        const { tokens: pTokens } = normalizeProductName(p.name);
        const score = scoreProduct(pTokens, queryTokens);
        const relevance = queryTokens.length > 0 ? score / queryTokens.length : 0;
        return { ...p, score, relevance };
      })
      .filter((p) => p.score > 0 && p.relevance >= MIN_RELEVANCE)
      .sort((a, b) => a.price - b.price);

    return { products: filtered, failures, elapsedMs: Date.now() - start };
  } finally {
    await browser.close();
  }
}
