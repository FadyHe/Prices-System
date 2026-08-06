import { Page } from 'puppeteer-core';
import { Product } from '../types';

export async function scrapeGoogleShopping(
  page: Page,
  query: string,
  maxProducts: number = 10
): Promise<Product[]> {
  const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
    query
  )}`;

  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 90000,
  });

  // استنى أي كارت منتج
  await page.waitForSelector('div.sh-dgr__grid-result', { timeout: 20000 }).catch(() => {});

  const products = await page.evaluate((max) => {
    const cards = Array.from(
      document.querySelectorAll('div.sh-dgr__grid-result')
    );

    const results: Record<string, unknown>[] = [];

    for (const card of cards) {
      if (results.length >= max) break;

      // الاسم
      const nameEl =
        card.querySelector('h3') ||
        card.querySelector('div.tAxDx');

      const name = nameEl?.textContent?.trim() || '';

      // السعر
      const priceEl =
        card.querySelector('span.a8Pemb') ||
        card.querySelector('span.OFFNJ');

      const priceText = priceEl?.textContent || '';
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

      // التاجر
      const sellerEl =
        card.querySelector('div.aULzUe') ||
        card.querySelector('span.aULzUe');

      const seller = sellerEl?.textContent?.trim() || 'Unknown';

      // اللينك
      const linkEl = card.querySelector('a');
      const relativeUrl = linkEl?.getAttribute('href') || '';
      const url = relativeUrl.startsWith('http')
        ? relativeUrl
        : `https://www.google.com${relativeUrl}`;

      // الصورة
      const imgEl = card.querySelector('img');
      const image = imgEl?.getAttribute('src') || '';

      if (!name || !price || Number.isNaN(price)) continue;

      results.push({
        name,
        price,
        currency: 'EGP',
        seller,
        url,
        image,
        source: 'Google Shopping',
      });
    }

    return results;
  }, maxProducts);

  return products as unknown as Product[];
}
