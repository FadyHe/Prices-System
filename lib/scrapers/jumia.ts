import { Page } from 'puppeteer';
import { Product } from '../types';

export async function scrapeJumia(
  page: Page,
  query: string,
  maxProducts = 15
): Promise<Product[]> {

  const url = `https://www.jumia.com.eg/catalog/?q=${encodeURIComponent(query)}`;
  console.log('[Jumia] Navigating to:', url);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
    console.log('[Jumia] Page loaded');
  } catch (err) {
    console.error('[Jumia] Navigation failed:', err);
    throw err;
  }

  await new Promise(r => setTimeout(r, 3000));

  const products: Product[] = [];

  while (products.length < maxProducts) {
    const pageProds = await page.evaluate(() => {
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

      const items = Array.from(document.querySelectorAll('article.prd, article.-paxs'));

      return items.map(item => {
        const linkEl = item.querySelector('a.core, a.link');
        const url = linkEl ? 'https://www.jumia.com.eg' + linkEl.getAttribute('href') : '';

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
      }).filter((item): item is Product => item !== null);
    });

    for (const p of pageProds) {
      if (products.length < maxProducts && !products.some(ex => ex.url === p.url)) {
        products.push(p);
      }
    }

    if (pageProds.length === 0) break;

    const nextBtn = await page.$('a[aria-label="Next page"], a[title="Next"]');
    if (!nextBtn) break;

    await Promise.all([
      nextBtn.click(),
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`[Jumia] Extracted ${products.length} products`);
  return products;
}