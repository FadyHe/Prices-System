import { Page } from 'puppeteer';
import { Product } from '../types';

async function scrollAndWaitForProducts(page: Page, maxScrolls = 10) {
  let previousCount = 0;
  let scrollAttempts = 0;
  let noNewProductsCount = 0;

  while (scrollAttempts < maxScrolls && noNewProductsCount < 3) {
    const currentCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-qa="plp-product-box"]').length;
    });

    console.log(`[Noon] Scroll ${scrollAttempts + 1}: Found ${currentCount} products`);

    if (currentCount === previousCount) {
      noNewProductsCount++;
    } else {
      noNewProductsCount = 0;
    }

    previousCount = currentCount;

    await page.evaluate(async () => {
      window.scrollBy(0, window.innerHeight);
      const products = Array.from(document.querySelectorAll('[data-qa="plp-product-box"]'));
      if (products.length > 0) {
        const lastProduct = products[products.length - 1];
        lastProduct.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    if (scrollAttempts % 2 === 0) {
      await page.evaluate(() => window.scrollBy(0, -100));
      await new Promise(r => setTimeout(r, 500));
      await page.evaluate(() => window.scrollBy(0, 200));
      await new Promise(r => setTimeout(r, 1500));
    }

    scrollAttempts++;
  }

  console.log(`[Noon] Finished scrolling. Total products visible: ${previousCount}`);
}

export async function scrapeNoon(
  page: Page,
  query: string,
  maxProducts = 15
): Promise<Product[]> {

  const url = `https://www.noon.com/egypt-ar/search?q=${encodeURIComponent(query)}`;
  console.log('[Noon] Navigating to:', url);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
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
      await page.waitForSelector(selector, { timeout: 10000 });
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

  await new Promise(r => setTimeout(r, 2000));

  const scrollsNeeded = Math.ceil(maxProducts / 5);
  await scrollAndWaitForProducts(page, Math.max(scrollsNeeded, 5));

  await new Promise(r => setTimeout(r, 2000));

  const products = await page.evaluate((max) => {
    const results: Record<string, unknown>[] = [];

    const items = Array.from(document.querySelectorAll('[data-qa="plp-product-box"]'));

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

        if (price > 0 && name && url) {
          results.push({
            name,
            price,
            currency: 'EGP',
            seller: 'noon',
            url,
            image,
            source: 'noon.com'
          });
        }
      } catch (err) {
        console.error('[Noon] Error parsing item:', err);
      }
    }

    return results;
  }, maxProducts);

  console.log(`[Noon] Successfully extracted ${products.length} products`);
  return products as unknown as Product[];
}
