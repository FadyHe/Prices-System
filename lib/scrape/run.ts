import puppeteer, { Browser, Page } from 'puppeteer';
import { Product } from '@/lib/types';
import {
  scrapeAmazon,
  amazonCaptchaDetected,
} from '@/lib/scrapers/amazon';
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

// Brower-prodding UAs get closer to a real desktop Chrome while staying
// modern enough to pass the current-gen client hints on Amazon/Noon.
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Port of the 8 anti-bot measures the OLD GitHub-Actions path
 * (scraper-service/src/scrapers/orchestrator.ts applyStealth) applied to every
 * page, minus puppeteer-extra. Here everything is plain puppeteer APIs: viewport,
 * UA, extra HTTP headers, request interception (block images/fonts/media), and
 * pre-document navigator/window spoofs injected via evaluateOnNewDocument.
 */
async function applyStealth(page: Page, extraHeaders: Record<string, string> = {}) {
  // RTL-friendly desktop viewport.
  await page.setViewport({ width: 1280, height: 900 });

  await page.setUserAgent(DESKTOP_UA);

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ar-EG,ar;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    ...extraHeaders,
  });

  // Drop the load heaviest resources we never parse → faster, less detectable.
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (type === 'image' || type === 'font' || type === 'media') {
      req.abort().catch(() => undefined);
    } else {
      req.continue().catch(() => undefined);
    }
  });

  // esbuild/tsx emits a __name helper for named functions; puppeteer's
  // page.evaluate serializes only the callback source and runs it in the
  // browser where that helper is undefined. Provide a no-op polyfill on every
  // new document so evaluate callbacks keep working.
  await page.evaluateOnNewDocument(() => {
    (globalThis as unknown as Record<string, unknown>).__name =
      (globalThis as unknown as Record<string, unknown>).__name ||
      ((f: unknown) => f);
  });

  // Navigator/window spoofing that puppeteer-extra-plugin-stealth used to do.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Mask Puppeteer's default "HeadlessChrome" brand.
    (window as unknown as { chrome: { runtime: unknown } }).chrome = { runtime: {} };

    Object.defineProperty(navigator, 'languages', {
      get: () => ['ar-EG', 'ar', 'en'],
    });

    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(window, 'outerWidth', { get: () => 1280 });
    Object.defineProperty(window, 'outerHeight', { get: () => 900 });

    // Notification permission query is a common headless tell.
    try {
      const originalQuery = window.navigator.permissions.query.bind(
        window.navigator.permissions
      );
      window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : originalQuery(parameters);
    } catch {
      /* already spoofed or permissions API absent */
    }
  });
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
  opts: {
    captchaCheck?: (page: Page) => boolean | Promise<boolean>;
    extraHeaders?: Record<string, string>;
  } = {}
): Promise<{ products: Product[]; failure?: SourceFailure }> {
  const page = await browser.newPage();
  try {
    await applyStealth(page, opts.extraHeaders);
    // Light jitter so concurrent sites don't all hit their CDNs at once.
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 500) + 150));
    const products = await withTimeout(fn(page, query, max), PER_SITE_TIMEOUT_MS, name);
    if (products.length === 0) {
      const captcha = opts.captchaCheck ? await opts.captchaCheck(page) : false;
      return {
        products,
        failure: {
          site: name,
          reason: captcha ? 'captcha_detected' : 'empty',
          detail: captcha
            ? 'CAPTCHA/robot-check page served instead of results'
            : 'scraper returned 0 products',
        },
      };
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
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,900',
      // Noon rejects HTTP/2 with ERR_HTTP2_PROTOCOL_ERROR; force HTTP/1.1.
      '--disable-http2',
    ],
    timeout: 30_000,
  });
  try {
    const results = await Promise.all([
      runOne('Amazon', scrapeAmazon, browser, query, MAX_PER_SITE, {
        captchaCheck: (p) => amazonCaptchaDetected(p),
      }),
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