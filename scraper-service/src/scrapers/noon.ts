import { Page } from 'puppeteer';
import { Product } from '../types';

const DEBUG_SCRAPE = !!process.env.DEBUG_SCRAPE;

export async function scrapeNoon(
  page: Page,
  query: string,
  maxProducts = 15
): Promise<Product[]> {

  const url = `https://www.noon.com/egypt-ar/search?q=${encodeURIComponent(query)}`;
  console.log('[Noon] Navigating to:', url);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('[Noon] Page loaded');
  } catch (err) {
    console.error('[Noon] Navigation failed:', err);
    throw err;
  }

  const selectors = [
    '[data-qa="plp-product-box"]',
    'div[class*="PBoxLinkHandler"]',
  ];

  let selectorFound = false;
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 6000 });
      console.log(`[Noon] Found products with selector: ${selector}`);
      selectorFound = true;
      break;
    } catch {
      console.log(`[Noon] Selector ${selector} not found, trying next...`);
    }
  }

  if (!selectorFound) {
    console.error('[Noon] No product selectors found on page');
    return [];
  }

  // Quick scroll to load more products
  await page.evaluate(() => window.scrollBy(0, window.innerHeight));
  await new Promise(r => setTimeout(r, 500));

  const products = await page.evaluate((max, debug) => {
    const results: Record<string, unknown>[] = [];

    const items = Array.from(document.querySelectorAll('[data-qa="plp-product-box"]'));
    let noName = 0;
    let noPrice = 0;
    let noUrl = 0;

    console.log(`[Noon] Processing ${items.length} product containers (max: ${max})`);

    for (const item of items) {
      if (results.length >= max) break;

      try {
        const nameEl = item.querySelector('[data-qa="plp-product-box-name"]') ||
                       item.querySelector('h2[class*="title"]');
        const name = nameEl?.getAttribute('title') || nameEl?.textContent?.trim() || '';

        const linkEl = item.querySelector('a[class*="productBoxLink"]') || item.querySelector('a');
        const href = linkEl?.getAttribute('href') || '';
        const url = href.startsWith('http') ? href : `https://www.noon.com${href}`;

        const priceContainer = item.querySelector('[data-qa="plp-product-box-price"]');
        const priceAmountEl = priceContainer?.querySelector('strong[class*="amount"]');
        const priceText = priceAmountEl?.textContent?.trim() || '0';

        const price = parseFloat(priceText.replace(/,/g, '')) || 0;

        const imgEl = item.querySelector('img[class*="productImage"]') ||
                      item.querySelector('img[alt*="Image 1"]') ||
                      item.querySelector('img');
        let image = imgEl?.getAttribute('src') || '';

        if (!image || image.includes('placeholder')) {
          image = imgEl?.getAttribute('data-src') ||
                  imgEl?.getAttribute('data-lazy-src') ||
                  imgEl?.getAttribute('src') || '';
        }

        if (price > 0 && name) {
          // Keep partial cards: url/image may be missing, the UI only needs
          // name + price to render a row; discard only if name/price unrecoverable.
          results.push({
            name,
            price,
            currency: 'EGP',
            seller: 'noon',
            url: url || '',
            image,
            source: 'noon.com'
          });
        } else {
          if (!name) noName++;
          if (price <= 0) noPrice++;
          if (!url) noUrl++;
        }
      } catch (err) {
        console.error('[Noon] Error parsing item:', err);
        noName++;
      }
    }

    if (debug) {
      console.log(
        `[Noon:debug] rawCards=${items.length} kept=${results.length} noName=${noName} noPrice=${noPrice} noUrl=${noUrl}`
      );
    }

    return results;
  }, maxProducts, DEBUG_SCRAPE);

  console.log(`[Noon] Successfully extracted ${products.length} products`);
  return products as unknown as Product[];
}
