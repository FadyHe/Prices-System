import { Page } from 'puppeteer';
import { Product } from '../types';

export async function scrapeJumia(
  page: Page,
  query: string,
  maxProducts = 15
): Promise<Product[]> {
  const url = `https://www.jumia.com.eg/ar/catalog/?q=${encodeURIComponent(query)}`;
  console.log('[Jumia] Navigating to:', url);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[Jumia] Page loaded');
  } catch (err) {
    console.error('[Jumia] Navigation failed:', err);
    throw err;
  }

  // Jumia embeds search results as JSON in the page's `window.__STORE__` script
  // (name/price/image/url). Reading that sidesteps the "لحظة" (one moment)
  // bot-check interstitial that renders a blank grid for datacenter IPs and
  // avoids waiting for client-side DOM hydration.
  const storeProducts = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    let store: { products?: Array<Record<string, unknown>> } | null = null;
    for (const s of scripts) {
      const t = s.textContent || '';
      const i = t.indexOf('window.__STORE__=');
      if (i !== -1) {
        try {
          store = JSON.parse(t.slice(i + 'window.__STORE__='.length).replace(/;\s*$/, ''));
          break;
        } catch {
          store = null;
        }
      }
    }
    if (!store || !Array.isArray(store.products)) return null;

    return store.products.map((p: any) => {
      const name = p.displayName || p.name || '';
      const priceText = p.prices?.rawPrice ?? p.prices?.price ?? '';
      const price = parseFloat(String(priceText).replace(/[^\d.]/g, ''));
      const href = p.url || '';
      const image = p.image || '';
      return { name, price, href, image };
    }).filter((p: any) => p.name && p.price > 0);
  });

  if (storeProducts && storeProducts.length > 0) {
    const products: Product[] = storeProducts.slice(0, maxProducts).map((p: any) => ({
      name: p.name,
      price: p.price,
      currency: 'EGP',
      seller: 'Jumia',
      url: p.href.startsWith('http') ? p.href : 'https://www.jumia.com.eg' + p.href,
      image: p.image,
      source: 'Jumia.eg'
    }));
    console.log(`[Jumia] Extracted ${products.length} products (from __STORE__)`);
    return products;
  }

  // Fallback: wait for client-rendered product cards, then scrape the DOM.
  try {
    await page.waitForSelector('article.prd, article.-paxs', { timeout: 10000 });
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
