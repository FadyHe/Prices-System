import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { normalizeProductName } from '@/lib/search/normalize';
import { scoreProduct } from '@/lib/search/score';
import { audit, getClientIp } from '@/lib/audit';
import { checkAndRecord } from '@/lib/quota';
import type { Page } from 'puppeteer';

import type { Product } from '@/lib/types';

export const runtime = 'nodejs';

const MAX_PER_SITE = 200;
const MAX_QUERY_LENGTH = 100;

function validateQuery(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_QUERY_LENGTH) return null;
  return trimmed;
}

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
    // @ts-expect-error attaching chrome runtime shim for stealth
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

/* ================== SCRAPER ================== */

async function scrapeViaRemote(url: string, token: string, query: string): Promise<Product[]> {
  const normalizedUrl = url.replace(/\/$/, '');
  const fullUrl = normalizedUrl.startsWith('http') ? `${normalizedUrl}/scrape` : `https://${normalizedUrl}/scrape`;
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`remote scraper returned ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data.products) ? (data.products as Product[]) : [];
}

async function scrapeAll(query: string): Promise<Product[]> {
  const remoteUrl = process.env.SCRAPER_URL;
  const remoteToken = process.env.SCRAPER_TOKEN;
  if (remoteUrl && remoteToken) {
    return scrapeViaRemote(remoteUrl, remoteToken, query);
  }

  const puppeteer = (await import('puppeteer')).default;
  const { scrapeAmazon } = await import('@/lib/scrapers/amazon');
  const { scrapeJumia } = await import('@/lib/scrapers/jumia');
  const { scrapeNoon } = await import('@/lib/scrapers/noon');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

/* ================== API ROUTE ================== */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  let body: { query?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid body' }, { status: 400 });
  }
  const query = validateQuery(body?.query);
  if (!query) {
    return Response.json(
      { error: 'query is required (1–100 chars)' },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const plan = (session?.user as { plan?: string } | undefined)?.plan ?? 'free';

  const quota = await checkAndRecord({ userId, ip, plan });
  if (!quota.allowed) {
    await audit({
      userId,
      ip,
      action: 'scrape.quota_exceeded',
      query,
      meta: { reason: quota.reason, plan },
    });
    const message =
      quota.reason === 'day'
        ? 'وصلت للحد اليومي. حاول بكره أو رقّي حسابك.'
        : 'طلباتك كتير في الساعة دي. استنى شوية.';
    return Response.json(
      {
        error: message,
        quota: {
          remaining: quota.remaining,
          limit: quota.limit,
          reason: quota.reason,
        },
      },
      { status: 429 }
    );
  }

  const raw = await scrapeAll(query);

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

  await audit({
    userId,
    ip,
    action: 'scrape.success',
    query,
    resultCount: filtered.length,
    meta: { plan, quota: quota.remaining },
  });

  return Response.json({
    totalScraped: raw.length,
    count: filtered.length,
    products: filtered,
    quota: {
      remaining: quota.remaining,
      limit: quota.limit,
    },
  });
}
