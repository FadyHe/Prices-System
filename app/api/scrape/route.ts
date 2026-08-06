import { randomBytes } from 'crypto';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { audit, getClientIp } from '@/lib/audit';
import { checkAndRecord } from '@/lib/quota';
import { resolveIdentity } from '@/lib/identity';
import { connectDB } from '@/lib/db/mongodb';
import { ScrapeJob } from '@/lib/db/models';
import { triggerWorkflowDispatch } from '@/lib/github/dispatch';
import { runAllScrapers as runInProcess } from '@/lib/scrape/run';
import { normalizeForCache } from '@/lib/search/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_QUERY_LENGTH = 100;
// In-process scraping is the default path: it needs no GitHub Actions
// runner, so it works on localhost and production even while GH is
// queuing/failing. Set SCRAPE_MODE=github to force the async GH Actions
// path instead.
const SCRAPE_MODE = process.env.SCRAPE_MODE ?? 'inprocess';

function validateQuery(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_QUERY_LENGTH) return null;
  return trimmed;
}

function newJobId(): string {
  return randomBytes(12).toString('hex');
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const identity = resolveIdentity(req);

  let body: { query?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const query = validateQuery(body?.query);
  if (!query) {
    return Response.json(
      { error: 'query is required (1–100 chars)' },
      { status: 400 }
    );
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const plan = (session?.user as { plan?: string } | undefined)?.plan ?? 'free';

  const quota = await checkAndRecord({ quotaKey: identity.quotaKey, plan });
  if (!quota.allowed) {
    audit({
      userId,
      ip,
      action: 'scrape.quota_exceeded',
      query,
      meta: { reason: quota.reason, plan },
    }).catch(() => {});
    const message =
      quota.reason === 'day'
        ? 'وصلت للحد اليومي. حاول بكره أو رقّي حسابك.'
        : 'طلباتك كتير في الساعة دي. استنى شوية.';
    return Response.json(
      {
        error: message,
        quota: {
          remaining: quota.remaining,
          limit: quota.limit,
          reason: quota.reason,
        },
      },
      {
        status: 429,
        headers: identity.newCookie ? { 'Set-Cookie': identity.newCookie } : undefined,
      }
    );
  }

  const cacheKey = normalizeForCache(query);

  // ── In-process path (default) ─────────────────────────────────────────
  if (SCRAPE_MODE !== 'github') {
    const jobId = newJobId();
    try {
      const result = await runInProcess(query);

      try {
        await connectDB();
        await ScrapeJob.create({
          jobId,
          query,
          normalizedQuery: cacheKey,
          status: 'complete',
          userId,
          ip,
          plan,
          products: result.products,
          totalScraped: result.products.length,
          count: result.products.length,
          failures: result.failures,
          completedAt: new Date(),
        });
      } catch (err) {
        console.error('[scrape] persist failed', err);
        // Don't fail the user just because history persistence failed.
      }

      audit({
        userId,
        ip,
        action: 'scrape.success',
        query,
        meta: { plan, jobId, mode: 'inprocess' },
      }).catch(() => {});

      return Response.json(
        {
          jobId,
          status: 'complete',
          products: result.products,
          totalScraped: result.products.length,
          count: result.products.length,
          failures: result.failures,
          elapsedMs: result.elapsedMs,
          quota: { remaining: quota.remaining, limit: quota.limit },
        },
        { headers: identity.newCookie ? { 'Set-Cookie': identity.newCookie } : undefined }
      );
    } catch (err) {
      console.error('[scrape] in-process failed', err);
      audit({
        userId,
        ip,
        action: 'scrape.failed',
        query,
        meta: { plan, mode: 'inprocess', error: err instanceof Error ? err.message : String(err) },
      }).catch(() => {});
      return Response.json(
        { error: 'فشل البحث. حاول مرة أخرى.' },
        { status: 500 }
      );
    }
  }

  // ── GitHub Actions path (SCRAPE_MODE=github) ──────────────────────────
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return Response.json(
      { error: 'scraper backend is not configured' },
      { status: 503 }
    );
  }

  const jobId = newJobId();

  try {
    await connectDB();
    await ScrapeJob.create({
      jobId,
      query,
      normalizedQuery: cacheKey,
      status: 'pending',
      userId,
      ip,
      plan,
    });
  } catch (err) {
    console.error('[scrape] persist failed', err);
    return Response.json({ error: 'failed to create scrape job' }, { status: 500 });
  }

  try {
    await triggerWorkflowDispatch({
      repo,
      token,
      eventType: 'run-scrape',
      clientPayload: { query, jobId },
    });
  } catch (err) {
    console.error('[scrape] dispatch failed', err);
    ScrapeJob.updateOne(
      { jobId },
      { $set: { status: 'failed', error: 'dispatch_failed', completedAt: new Date() } }
    ).catch(() => {});
    return Response.json({ error: 'failed to start scraper job' }, { status: 502 });
  }

  audit({
    userId,
    ip,
    action: 'scrape.success',
    query,
    meta: { plan, jobId, quota: quota.remaining, mode: 'github-actions' },
  }).catch(() => {});

  return Response.json(
    {
      jobId,
      status: 'pending',
      quota: {
        remaining: quota.remaining,
        limit: quota.limit,
      },
    },
    { headers: identity.newCookie ? { 'Set-Cookie': identity.newCookie } : undefined }
  );
}
