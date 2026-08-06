import express, { Request, Response, NextFunction } from 'express';
import { runAllScrapers } from './scrapers/orchestrator';
import { normalizeProductName } from './search/normalize';
import { scoreProduct } from './search/score';
import { MIN_RELEVANCE } from './search/min-relevance';
import { Product } from './types';

const PORT = Number(process.env.PORT) || 3001;
const SCRAPER_TOKEN = process.env.SCRAPER_TOKEN;

if (!SCRAPER_TOKEN) {
  console.error('[scraper-service] FATAL: SCRAPER_TOKEN env var is not set.');
  process.exit(1);
}

const MAX_QUERY_LENGTH = 100;

function validateQuery(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_QUERY_LENGTH) return null;
  return trimmed;
}

function requireBearer(req: Request, res: Response, next: NextFunction): void {
  const auth = req.header('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== SCRAPER_TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

const app = express();
app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.post('/scrape', requireBearer, async (req: Request, res: Response) => {
  const query = validateQuery((req.body as { query?: unknown } | undefined)?.query);
  if (!query) {
    res.status(400).json({ error: 'query is required (1–100 chars)' });
    return;
  }

  try {
    const { products: raw, failures } = await runAllScrapers(query);

    const { tokens: queryTokens } = normalizeProductName(query);

    const filtered = raw
      .map((p: Product) => {
        const { tokens: pTokens } = normalizeProductName(p.name);
        const score = scoreProduct(pTokens, queryTokens);
        const relevance = queryTokens.length > 0 ? score / queryTokens.length : 0;
        return { ...p, score, relevance };
      })
      .filter((p) => p.score > 0 && p.relevance >= MIN_RELEVANCE)
      .sort((a, b) => a.price - b.price);

    res.json({
      totalScraped: raw.length,
      count: filtered.length,
      products: filtered,
      failures,
    });
  } catch (err) {
    console.error('[scraper-service] /scrape failed', err);
    res.status(500).json({ error: 'scrape_failed' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[scraper-service] listening on 0.0.0.0:${PORT}`);
});
