import { Page } from 'puppeteer';
import { Product } from '../types';

/**
 * Jumia serves a "لحظة" (one moment) bot-check interstitial to headless Chrome,
 * so Puppeteer can never see product cards from a datacenter IP. The same
 * request over plain fetch() with a desktop UA returns the full server-rendered
 * catalog, with results embedded as JSON in `window.__STORE__`. So we bypass the
 * browser entirely for Jumia and parse that JSON. Puppeteer DOM scraping remains
 * as a fallback for environments where fetch is blocked.
 */
export async function scrapeJumia(
  page: Page,
  query: string,
  maxProducts = 15
): Promise<Product[]> {
  const { products, status } = await scrapeViaFetch(query, maxProducts);
  if (products.length > 0) {
    console.log(`[Jumia] Extracted ${products.length} products (via fetch)`);
    return products;
  }

  // 403 from a datacenter IP means Jumia's edge blocks this caller; the
  // browser fallback hits the same "لحظة" interstitial and only wastes time.
  if (status === 403) {
    console.warn('[Jumia] fetch 403 (IP blocked) — skipping browser DOM fallback');
    return [];
  }

  console.log('[Jumia] fetch returned nothing, falling back to browser DOM');
  return scrapeViaPuppeteer(page, query, maxProducts);
}

async function scrapeViaFetch(
  query: string,
  maxProducts: number
): Promise<{ products: Product[]; status: number }> {
  const url = `https://www.jumia.com.eg/ar/catalog/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'accept-language': 'ar-EG,ar;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.warn(`[Jumia] fetch HTTP ${res.status}`);
      return { products: [], status: res.status };
    }
    const html = await res.text();
    const marker = 'window.__STORE__=';
    const i = html.indexOf(marker);
    if (i === -1) {
      console.warn(`[Jumia] No __STORE__ in response (len=${html.length})`);
      return { products: [], status: res.status };
    }
    const m = html.slice(i + marker.length).match(/\}\s*;\s*<\/script>/);
    if (!m || m.index === undefined) {
      console.warn('[Jumia] Could not find end of __STORE__ JSON');
      return { products: [], status: res.status };
    }
    const store = JSON.parse(html.slice(i + marker.length, i + marker.length + m.index + 1));
    if (!Array.isArray(store?.products)) return { products: [], status: res.status };

    const products = store.products
      .map((p: any): Product | null => {
        const name = p.displayName || p.name || '';
        const priceText = p.prices?.rawPrice ?? p.prices?.price ?? '';
        const price = parseFloat(String(priceText).replace(/[^\d.]/g, ''));
        const href = p.url || '';
        if (!name || !price || price <= 0 || !href) return null;
        return {
          name,
          price,
          currency: 'EGP',
          seller: 'Jumia',
          url: href.startsWith('http') ? href : 'https://www.jumia.com.eg' + href,
          image: p.image || '',
          source: 'Jumia.eg',
        };
      })
      .filter((p: Product | null): p is Product => p !== null)
      .slice(0, maxProducts);
    return { products, status: res.status };
  } catch (err) {
    console.warn('[Jumia] fetch failed:', err instanceof Error ? err.message : err);
    return { products: [], status: 0 };
  }
}

async function scrapeViaPuppeteer(page: Page, query: string, maxProducts: number): Promise<Product[]> {
  const url = `https://www.jumia.com.eg/ar/catalog/?q=${encodeURIComponent(query)}`;
  console.log('[Jumia] Navigating to:', url);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[Jumia] Page loaded');
  } catch (err) {
    console.error('[Jumia] Navigation failed:', err);
    throw err;
  }

  try {
    await page.waitForSelector('article.prd, article.-paxs', { timeout: 3000 });
  } catch {
    const title = await page.title();
    console.warn(`[Jumia] No product cards after wait. title="${title}". Returning empty.`);
    return [];
  }

  const products = await page.evaluate((max) => {
    function convertArabicToWestern(str: string): string {
      const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      let result = str;
      for (let i = 0; i < arabicNumerals.length; i++) {
        result = result.split(arabicNumerals[i]).join(westernNumerals[i]);
      }
      return result;
    }

    function extractPrice(priceText: string): number {
      if (!priceText) return 0;
      let cleaned = convertArabicToWestern(priceText);
      cleaned = cleaned.replace(/EGP|ج\.م\.|جنيه|LE/gi, '').trim();
      cleaned = cleaned.replace(/[^\d.,]/g, '');
      cleaned = cleaned.replace(/,/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
      const price = parseFloat(cleaned);
      if (price > 0 && price < 1000000) {
        return price;
      }
      return 0;
    }

    const items = Array.from(document.querySelectorAll('article.prd, article.-paxs'));

    return items.map(item => {
      const linkEl = item.querySelector('a.core, a.link');
      const hrefAttr = linkEl?.getAttribute('href') || '';
      const url = linkEl ? (hrefAttr.startsWith('http') ? hrefAttr : 'https://www.jumia.com.eg' + hrefAttr) : '';

      const name = item.querySelector('h3.name, div.name')?.textContent?.trim() || 'Unknown';

      const priceEl = item.querySelector('div.prc, div.-price');
      const priceText = priceEl?.textContent?.trim() || '0';
      const price = extractPrice(priceText);

      const imgEl = item.querySelector('img');
      const image = imgEl?.getAttribute('data-src') || imgEl?.getAttribute('src') || '';

      if (price > 0 && name !== 'Unknown' && url) {
        return {
          name,
          price,
          currency: 'EGP',
          seller: 'Jumia',
          url,
          image,
          source: 'Jumia.eg'
        };
      }
      return null;
    }).filter((item): item is Product => item !== null).slice(0, max);
  }, maxProducts);

  console.log(`[Jumia] Extracted ${products.length} products (from DOM)`);
  return products;
}
