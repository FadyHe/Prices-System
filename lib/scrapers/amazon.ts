import { Page } from 'puppeteer';
import { Product } from '../types';

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

export async function scrapeAmazon(
  page: Page,
  query: string,
  maxProducts = 15
): Promise<Product[]> {

  const url = `https://www.amazon.eg/s?k=${encodeURIComponent(query)}`;
  console.log('[Amazon] Navigating to:', url);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    console.log('[Amazon] Page loaded');
  } catch (err) {
    console.error('[Amazon] Navigation failed:', err);
    throw err;
  }

  // Wait for product results with multiple selector attempts
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
      console.log(`[Amazon] Found products with selector: ${selector}`);
      selectorFound = true;
      break;
    } catch (err) {
      console.log(`[Amazon] Selector ${selector} not found, trying next...`);
    }
  }

  if (!selectorFound) {
    console.error('[Amazon] No product selectors found on page');
    return [];
  }

  await autoScroll(page);
  await new Promise(r => setTimeout(r, 2000));

  const products = await page.evaluate((max) => {
    // Helper function to convert Arabic numerals to Western numerals
    function convertArabicToWestern(str: string): string {
      const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      const westernNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      
      let result = str;
      for (let i = 0; i < arabicNumerals.length; i++) {
        result = result.split(arabicNumerals[i]).join(westernNumerals[i]);
      }
      return result;
    }

    // Helper function to extract and clean price
    function extractPrice(priceText: string): number {
      if (!priceText) return 0;
      
      // Convert Arabic numerals to Western
      let cleaned = convertArabicToWestern(priceText);
      
      // Remove currency symbols and text
      cleaned = cleaned.replace(/EGP|ج\.م\.|جنيه|LE/gi, '').trim();
      
      // Remove all non-numeric characters except dots and commas
      cleaned = cleaned.replace(/[^\d.,]/g, '');
      
      // Remove commas (thousand separators)
      cleaned = cleaned.replace(/,/g, '');
      
      // Handle multiple dots
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
      
      // Parse the number
      const price = parseFloat(cleaned);
      
      // Sanity check
      if (price > 0 && price < 1000000) {
        return price;
      }
      
      return 0;
    }

    const results: any[] = [];
    
    // Try multiple selector patterns for products
    const itemSelectors = [
      'div[data-component-type="s-search-result"]',
      'div.s-result-item[data-asin]:not([data-asin=""])',
      'div[data-asin]',
      '.s-main-slot .s-result-item'
    ];
    
    let items: Element[] = [];
    for (const selector of itemSelectors) {
      const found = Array.from(document.querySelectorAll(selector));
      if (found.length > 0) {
        items = found;
        console.log(`Using selector: ${selector}, found ${found.length} items`);
        break;
      }
    }

    for (const item of items) {
      if (results.length >= max) break;

      try {
        // Try multiple name selectors
        const nameSelectors = ['h2 a span', 'h2 span', '.a-text-normal', 'h2'];
        let name = '';
        for (const sel of nameSelectors) {
          const el = item.querySelector(sel);
          if (el?.textContent?.trim()) {
            name = el.textContent.trim();
            break;
          }
        }

        // Try multiple link selectors
        const linkSelectors = ['h2 a', 'a.a-link-normal', 'a'];
        let url = '';
        for (const sel of linkSelectors) {
          const el = item.querySelector(sel);
          const href = el?.getAttribute('href');
          if (href && href.includes('/dp/')) {
            url = href.startsWith('http') ? href : 'https://www.amazon.eg' + href.split('/ref=')[0];
            break;
          }
        }

        // Try multiple price selectors with improved extraction
        const priceSelectors = [
          '.a-price span.a-offscreen',
          '.a-price .a-price-whole',
          'span.a-price-whole',
          '.a-price',
          'span[data-a-color="price"]'
        ];
        let price = 0;
        for (const sel of priceSelectors) {
          const el = item.querySelector(sel);
          const priceText = el?.textContent?.trim();
          if (priceText) {
            const extracted = extractPrice(priceText);
            if (extracted > 0) {
              price = extracted;
              break;
            }
          }
        }

        // Try multiple image selectors
        const imgSelectors = ['img.s-image', 'img', '[data-image-source]'];
        let image = '';
        for (const sel of imgSelectors) {
          const el = item.querySelector(sel);
          const src = el?.getAttribute('src') || el?.getAttribute('data-src') || el?.getAttribute('data-image-source');
          if (src && src.startsWith('http')) {
            image = src;
            break;
          }
        }

        if (price > 0 && name && url) {
          results.push({
            name,
            price,
            currency: 'EGP',
            seller: 'Amazon.eg',
            url,
            image: image || '',
            source: 'Amazon.eg'
          });
        }
      } catch (err) {
        console.error('Error parsing item:', err);
      }
    }

    return results;
  }, maxProducts);

  console.log(`[Amazon] Extracted ${products.length} products`);
  return products;
}