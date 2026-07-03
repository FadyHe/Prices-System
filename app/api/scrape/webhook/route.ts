import { connectDB } from '@/lib/db/mongodb';
import { ScrapeJob } from '@/lib/db/models';
import { audit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Product {
  name: string;
  price: number;
  currency: string;
  seller: string;
  url: string;
  source: string;
  image?: string;
  score?: number;
  relevance?: number;
}

interface WebhookBody {
  jobId?: unknown;
  products?: unknown;
  totalScraped?: unknown;
  count?: unknown;
  error?: unknown;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function asProductArray(v: unknown): Product[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (p): p is Product =>
      !!p &&
      typeof p === 'object' &&
      typeof (p as Product).name === 'string' &&
      typeof (p as Product).price === 'number' &&
      typeof (p as Product).url === 'string' &&
      typeof (p as Product).source === 'string'
  );
}

export async function POST(req: Request) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    return Response.json({ error: 'webhook not configured' }, { status: 503 });
  }
  const auth = req.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = (await req.json()) as WebhookBody;
  } catch {
    return Response.json({ error: 'invalid body' }, { status: 400 });
  }

  const jobId = asString(body.jobId);
  if (!jobId) {
    return Response.json({ error: 'jobId required' }, { status: 400 });
  }

  await connectDB();
  const job = await ScrapeJob.findOne({ jobId });
  if (!job) {
    return Response.json({ error: 'job not found' }, { status: 404 });
  }

  const error = asString(body.error);
  if (error) {
    await ScrapeJob.updateOne(
      { jobId },
      { $set: { status: 'failed', error, completedAt: new Date() } }
    );
    await audit({
      userId: job.userId ? String(job.userId) : undefined,
      action: 'scrape.failed',
      query: job.query,
      meta: { jobId, error },
    });
    return Response.json({ ok: true, status: 'failed' });
  }

  const products = asProductArray(body.products);
  const totalScraped = asNumber(body.totalScraped) ?? products.length;
  const count = asNumber(body.count) ?? products.length;

  await ScrapeJob.updateOne(
    { jobId },
    {
      $set: {
        status: 'complete',
        products,
        totalScraped,
        count,
        completedAt: new Date(),
      },
    }
  );

  await audit({
    userId: job.userId ? String(job.userId) : undefined,
    action: 'scrape.success',
    query: job.query,
    resultCount: count,
    meta: { jobId, mode: 'github-actions', totalScraped },
  });

  return Response.json({ ok: true, status: 'complete' });
}
