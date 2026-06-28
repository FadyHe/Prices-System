import { Page } from 'puppeteer';
import { Product } from '../types';

// Improved scroll function that waits for new products to load
async function scrollAndWaitForProducts(page: Page, maxScrolls = 10) {
  let previousCount = 0;
  let scrollAttempts = 0;
  let noNewProductsCount = 0;

  while (scrollAttempts < maxScrolls && noNewProductsCount < 3) {
    // Get current product count
    const currentCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-qa="plp-product-box"]').length;
    });

    console.log(`[Noon] Scroll ${scrollAttempts + 1}: Found ${currentCount} products`);

    // If no new products loaded after scrolling, increment counter
    if (currentCount === previousCount) {
      noNewProductsCount++;
    } else {
      noNewProductsCount = 0; // Reset if new products loaded
    }

    previousCount = currentCount;

    // Scroll down in chunks
    await page.evaluate(async () => {
      // Scroll down by viewport height
      window.scrollBy(0, window.innerHeight);
      
      // Also try scrolling to a specific element if near bottom
      const products = Array.from(document.querySelectorAll('[data-qa="plp-product-box"]'));
      if (products.length > 0) {
        const lastProduct = products[products.length - 1];
        lastProduct.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Wait for new products to load
    await new Promise(r => setTimeout(r, 2000));

    // Try to trigger lazy loading by scrolling up a bit then down again
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

  // Wait for initial products to load
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

  // Initial wait for products to render
  await new Promise(r => setTimeout(r, 2000));

  // Scroll to load more products - increase scrolls to get more products
  const scrollsNeeded = Math.ceil(maxProducts / 5); // Roughly 5 products load per scroll
  await scrollAndWaitForProducts(page, Math.max(scrollsNeeded, 5));

  // Final wait for all images to load
  await new Promise(r => setTimeout(r, 2000));

  const products = await page.evaluate((max) => {
    const results: Record<string, unknown>[] = [];
    
    // Use the actual selector from the HTML
    const items = Array.from(document.querySelectorAll('[data-qa="plp-product-box"]'));
    
    console.log(`[Noon] Processing ${items.length} product containers (max: ${max})`);

    for (const item of items) {
      if (results.length >= max) break;

      try {
        // Product name
        const nameEl = item.querySelector('[data-qa="plp-product-box-name"]') ||
                       item.querySelector('h2[class*="title"]');
        const name = nameEl?.getAttribute('title') || nameEl?.textContent?.trim() || '';

        // Product link
        const linkEl = item.querySelector('a[class*="productBoxLink"]') || item.querySelector('a');
        const href = linkEl?.getAttribute('href') || '';
        const url = href.startsWith('http') ? href : `https://www.noon.com${href}`;

        // Product price
        const priceContainer = item.querySelector('[data-qa="plp-product-box-price"]');
        const priceAmountEl = priceContainer?.querySelector('strong[class*="amount"]');
        const priceText = priceAmountEl?.textContent?.trim() || '0';
        
        // Clean the price - remove commas and convert to number
        const price = parseFloat(priceText.replace(/,/g, '')) || 0;

        // Product image
        const imgEl = item.querySelector('img[class*="productImage"]') || 
                      item.querySelector('img[alt*="Image 1"]') ||
                      item.querySelector('img');
        let image = imgEl?.getAttribute('src') || '';
        
        // If image is placeholder, try data-src or lazy-src
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