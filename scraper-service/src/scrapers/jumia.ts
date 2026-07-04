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
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('[Jumia] Page loaded');
  } catch (err) {
    console.error('[Jumia] Navigation failed:', err);
    throw err;
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
    }).filter((item): item is Product => item !== null).slice(0, max);
  }, maxProducts);

  console.log(`[Jumia] Extracted ${products.length} products`);
  return products;
}