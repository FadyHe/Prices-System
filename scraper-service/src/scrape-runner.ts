import { writeFileSync } from 'fs';
import { runAllScrapers } from './scrapers/orchestrator';
import { normalizeProductName } from './search/normalize';
import { scoreProduct } from './search/score';

const MIN_RELEVANCE = 0.3;

/** Entry point for the GitHub Actions scrape job (run via `npx tsx src/scrape-runner.ts`). */
async function main(): Promise<void> {
  const query = process.env.QUERY;
  if (!query) {
    console.error('QUERY env var is required');
    process.exit(1);
  }
  const jobId = process.env.JOB_ID || 'manual';

  const start = Date.now();
  const raw = await runAllScrapers(query);

  const { tokens: queryTokens } = normalizeProductName(query);
  const filtered = raw
    .map((p) => {
      const { tokens: pTokens } = normalizeProductName(p.name);
      const score = scoreProduct(pTokens, queryTokens);
      const relevance = queryTokens.length > 0 ? score / queryTokens.length : 0;
      return { ...p, score, relevance };
    })
    .filter((p) => p.score > 0 && p.relevance >= MIN_RELEVANCE)
    .sort((a, b) => a.price - b.price);

  const out = {
    jobId,
    totalScraped: raw.length,
    count: filtered.length,
    products: filtered,
  };
  writeFileSync('result.json', JSON.stringify(out));
  console.log(`scraped=${raw.length} kept=${filtered.length} elapsedMs=${Date.now() - start}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
