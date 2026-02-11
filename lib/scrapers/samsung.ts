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

export async function scrapeSamsung(
  page: Page,
  query: string,
  maxProducts: number = 15
): Promise<Product[]> {
  
  const url = `https://www.samsung.com/eg/search/?searchvalue=${encodeURIComponent(query)}`;
  console.log('[Samsung] Navigating to:', url);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    console.log('[Samsung] Page loaded');
  } catch (err) {
    console.error('[Samsung] Navigation failed:', err);
    throw err;
  }

  // Wait for products with multiple selector attempts
  const selectors = [
    '.aisearch-product',
    '.aisearch-product__price-current',
    '.product-card',
    '.product-item',
    '[class*="product"]',
    '[data-product-name]',
    'article'
  ];

  let selectorFound = false;
  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, { timeout: 10000 });
      console.log(`[Samsung] Found products with selector: ${selector}`);
      selectorFound = true;
      break;
    } catch (err) {
      console.log(`[Samsung] Selector ${selector} not found, trying next...`);
    }
  }

  if (!selectorFound) {
    console.error('[Samsung] No product selectors found on page');
    return [];
  }

  await autoScroll(page);
  // Wait longer for Samsung's dynamic content
  await new Promise(r => setTimeout(r, 5000));
  
  // Try to wait for price elements specifically
  try {
    await page.waitForSelector('.aisearch-product__price-current', { timeout: 10000 });
    console.log('[Samsung] Price elements found');
  } catch {
    console.log('[Samsung] Price elements not found after wait, continuing anyway');
  }

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
      
      // Remove currency symbols and text (including Arabic)
      cleaned = cleaned.replace(/EGP|ج\.م\.|ج\.م|جنيه|LE|Current Price:|Current Price/gi, '').trim();
      
      // Remove Arabic comma separator (٬ U+066C) and regular commas
      cleaned = cleaned.replace(/٬/g, '');
      cleaned = cleaned.replace(/,/g, '');
      
      // Remove all non-numeric characters except dots
      cleaned = cleaned.replace(/[^\d.]/g, '');
      
      // Handle multiple dots - keep only the last one as decimal separator
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      }
      
      // Parse the number
      const price = parseFloat(cleaned);
      
      console.log(`[Samsung] Price extraction: "${priceText}" -> ${price}`);
      
      // Sanity check - Samsung products can be expensive
      if (price > 0 && price < 10000000) {
        return price;
      }
      
      return 0;
    }

    const results: any[] = [];
    
    // Try multiple selector patterns for products - prioritize Samsung's actual structure
    const containerSelectors = [
      '.aisearch-product',
      '.product-card',
      '.product-item',
      '[class*="Product"]',
      '[data-product-name]',
      'article',
      '[class*="card"]'
    ];
    
    let items: Element[] = [];
    for (const selector of containerSelectors) {
      const found = Array.from(document.querySelectorAll(selector));
      if (found.length > 0) {
        items = found;
        console.log(`[Samsung] Using selector: ${selector}, found ${found.length} items`);
        break;
      }
    }

    for (const item of items) {
      if (results.length >= max) break;

      try {
        // Try multiple name selectors - prioritize Samsung's actual structure
        const nameSelectors = [
          '.aisearch-product__name',
          'a.aisearch-product__name',
          '[data-product-name]',
          '.product-title',
          '.product-name',
          '.aisearch-product__title',
          '[class*="title"]',
          '[class*="Title"]',
          'h3',
          'h2',
          'h4'
        ];
        let name = '';
        for (const sel of nameSelectors) {
          const el = item.querySelector(sel);
          const text = el?.textContent?.trim() || el?.getAttribute('title') || el?.getAttribute('data-product-name') || el?.getAttribute('aria-label');
          if (text && text !== 'Unknown') {
            name = text;
            break;
          }
        }

        // Try multiple link selectors - prioritize Samsung's actual structure
        let url = '';
        const linkSelectors = [
          'a.aisearch-product__name',
          'a.aisearch-product__image',
          '.aisearch-product__name-wrap a',
          '.aisearch-product__image-wrap a',
          'a[href*="/smartphones/"]',
          'a[href*="/eg/"]',
          'a'
        ];
        for (const sel of linkSelectors) {
          const linkEl = item.querySelector(sel);
          const href = linkEl?.getAttribute('href') || linkEl?.getAttribute('data-href-target');
          if (href) {
            url = href.startsWith('http') ? href : `https://www.samsung.com${href}`;
            break;
          }
        }

        // Try to get price from data-modelprice attribute first (cleaner data)
        let price = 0;
        const ctaWithPrice = item.querySelector('[data-modelprice]');
        if (ctaWithPrice) {
          const modelPrice = ctaWithPrice.getAttribute('data-modelprice');
          if (modelPrice) {
            price = parseFloat(modelPrice);
            console.log(`[Samsung] Got price from data-modelprice: ${price}`);
          }
        }

        // Fallback to price selectors with improved extraction
        if (price <= 0) {
          const priceSelectors = [
            '.aisearch-product__price-current',
            '.aisearch-product__price',
            '.aisearch-product__price-wrap',
            '.price',
            '.product-price',
            '[class*="price"]',
            '[class*="Price"]',
            '.amount',
            '.final-price',
            '[data-price]'
          ];
          for (const sel of priceSelectors) {
            const el = item.querySelector(sel);
            const priceText = el?.textContent?.trim() || el?.getAttribute('data-price');
            if (priceText) {
              const extracted = extractPrice(priceText);
              if (extracted > 0) {
                price = extracted;
                break;
              }
            }
          }
        }

        // Try multiple image selectors - prioritize Samsung's actual structure
        let image = '';
        const imgSelectors = [
          '.aisearch-product__image img',
          '.aisearch-product__image-wrap img',
          'img.image__main',
          'img.responsive-img',
          'img'
        ];
        for (const sel of imgSelectors) {
          const imgEl = item.querySelector(sel);
          if (imgEl) {
            image = imgEl.getAttribute('src') || 
                    imgEl.getAttribute('data-src') || 
                    imgEl.getAttribute('data-desktop-src') ||
                    imgEl.getAttribute('data-lazy-src') || '';
            if (image && !image.startsWith('http')) {
              image = `https://www.samsung.com${image}`;
            }
            if (image) break;
          }
        }

        // Debug logging
        console.log(`[Samsung] Item debug - Name: "${name}", Price: ${price}, URL: "${url ? 'found' : 'missing'}", Image: "${image ? 'found' : 'missing'}"`);

        if (price > 0 && name && url) {
          results.push({
            name,
            price,
            currency: 'EGP',
            seller: 'Samsung.com',
            url,
            image,
            source: 'Samsung Egypt'
          });
        } else {
          console.log(`[Samsung] Skipped item - Missing: ${!name ? 'name ' : ''}${price <= 0 ? 'price ' : ''}${!url ? 'url' : ''}`);
        }
      } catch (err) {
        console.error('[Samsung] Error parsing item:', err);
      }
    }

    console.log(`[Samsung] Total items found: ${items.length}, Valid products: ${results.length}`);

    return results;
  }, maxProducts);

  console.log(`[Samsung] Extracted ${products.length} products`);
  return products;
}