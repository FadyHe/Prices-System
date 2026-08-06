import { Page } from 'puppeteer';
import { Product } from '../types';
import path from 'path';

async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 200;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/** Check if Amazon returned a CAPTCHA page instead of results */
async function isCaptchaPage(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return !!(
      document.querySelector('#captchacharacters') ||
      document.querySelector('form[action*="validateCaptcha"]') ||
      document.querySelector('input#captchacharacters') ||
      document.title.toLowerCase().includes('robot check') ||
      document.title.toLowerCase().includes('sorry')
    );
  });
}

/** Small random delay to appear more human */
function randomDelay(min = 500, max = 1000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeAmazon(
  page: Page,
  query: string,
  maxProducts = 15
): Promise<Product[]> {

const allProducts: Product[] = [];
  // Default to a single results page; only fetch page 2 when page 1 came back thin
  // (fewer than ADAPTIVE_PAGE2_THRESHOLD raw products) so short-tail queries still
  // have a chance to fill up to MAX_PER_SITE.
  const ADAPTIVE_PAGE2_THRESHOLD = 8;
  let maxPages = 1;

  for (let currentPage = 1; currentPage <= maxPages; currentPage++) {
    if (allProducts.length >= maxProducts) break;

    const url =
      `https://www.amazon.eg/s?k=${encodeURIComponent(query)}&page=${currentPage}`;

    console.log(`[Amazon] Navigating to page ${currentPage}:`, url);

// Retry transient navigation failures (ERR_INVALID_RESPONSE is intermittent anti-bot).
    let loaded = false;
    for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        console.log(`[Amazon] Page ${currentPage} loaded (attempt ${attempt})`);
        loaded = true;
      } catch (err) {
        console.error(`[Amazon] Navigation failed (attempt ${attempt}):`, err.message);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if (!loaded) break;

    const captcha = await isCaptchaPage(page);
    if (captcha) {
      const title = await page.title();
      console.warn(`[Amazon] CAPTCHA detected! Page title: "${title}"`);

      try {
        const ssPath = path.join(process.cwd(), `amazon-captcha-debug-${Date.now()}.png`);
        await page.screenshot({ path: ssPath, fullPage: true });
        console.log(`[Amazon] Debug screenshot saved: ${ssPath}`);
      } catch {}

      break;
    }

    const selectors = [
      'div[data-component-type="s-search-result"]',
      'div.s-result-item',
      'div[data-asin]',
      '.s-main-slot .s-result-item'
    ];

    let selectorFound = false;
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        selectorFound = true;
        break;
      } catch {}
    }

    if (!selectorFound) {
      const title = await page.title();
      console.warn(`[Amazon] No product selectors found. Page title: "${title}". Stopping.`);

      try {
        const ssPath = path.join(process.cwd(), `amazon-empty-debug-${Date.now()}.png`);
        await page.screenshot({ path: ssPath, fullPage: true });
        console.log(`[Amazon] Debug screenshot saved: ${ssPath}`);
      } catch {}

      break;
    }

await autoScroll(page);
     await new Promise(r => setTimeout(r, 500));

    const products = await page.evaluate((max) => {
      function convertArabicToWestern(str: string): string {
        const a = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
        const w = ['0','1','2','3','4','5','6','7','8','9'];
        let result = str;
        for (let i = 0; i < a.length; i++) {
          result = result.split(a[i]).join(w[i]);
        }
        return result;
      }

      function extractPrice(priceText: string): number {
        if (!priceText) return 0;
        let cleaned = convertArabicToWestern(priceText);
        cleaned = cleaned.replace(/EGP|ج\.م\.|جنيه|LE/gi, '');
        cleaned = cleaned.replace(/[^\d.,]/g, '').replace(/,/g, '');
        const parts = cleaned.split('.');
        if (parts.length > 2) {
          cleaned = parts[0] + '.' + parts.slice(1).join('');
        }
        const price = parseFloat(cleaned);
        return price > 0 && price < 1_000_000 ? price : 0;
      }

      const results: Record<string, unknown>[] = [];
      const items = Array.from(
        document.querySelectorAll('div[data-asin]:not([data-asin=""])')
      );

      for (const item of items) {
        if (results.length >= max) break;

        const nameEl =
          item.querySelector('h2 a span') ||
          item.querySelector('h2 span') ||
          item.querySelector('.a-text-normal');

        const linkEl =
          item.querySelector('h2 a') ||
          item.querySelector('a.a-link-normal[href*="/dp/"]') ||
          item.querySelector('a[href*="/dp/"]');

        const priceEl =
          item.querySelector('.a-price span.a-offscreen') ||
          item.querySelector('span.a-price-whole') ||
          item.querySelector('span[data-a-color="price"] .a-offscreen') ||
          item.querySelector('.a-color-price');

        const imgEl =
          item.querySelector('img.s-image') ||
          item.querySelector('img[data-image-latency="s-product-image"]');

        const name = nameEl?.textContent?.trim() || '';
        const href = linkEl?.getAttribute('href') || '';
        const priceText = priceEl?.textContent || '';
        const image = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';

        const price = extractPrice(priceText);

        if (name && price > 0) {
          const fullUrl = href
            ? 'https://www.amazon.eg' + href.split('/ref=')[0]
            : '';

          results.push({
            name,
            price,
            currency: 'EGP',
            seller: 'Amazon.eg',
            url: fullUrl,
            image,
            source: 'Amazon.eg'
          });
        }
      }

      return results;
    }, maxProducts - allProducts.length);

    console.log(`[Amazon] Page ${currentPage} extracted ${products.length}`);

    allProducts.push(...(products as unknown as Product[]));

    // Adaptive: if page 1 returned thin, fetch page 2 to fill up to maxProducts.
    if (currentPage === 1 && allProducts.length < Math.min(ADAPTIVE_PAGE2_THRESHOLD, maxProducts)) {
      maxPages = 2;
    }

    if (currentPage < maxPages && allProducts.length < maxProducts) {
      await randomDelay(500, 1000);
    }
  }

  console.log(`[Amazon] Total products collected: ${allProducts.length}`);
  return allProducts.slice(0, maxProducts);
}
