import { randomBytes } from 'crypto';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { audit, getClientIp } from '@/lib/audit';
import { checkAndRecord } from '@/lib/quota';
import { resolveIdentity } from '@/lib/identity';
import { connectDB } from '@/lib/db/mongodb';
import { ScrapeJob } from '@/lib/db/models';
import { triggerWorkflowDispatch } from '@/lib/github/dispatch';
import { normalizeForCache } from '@/lib/search/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_QUERY_LENGTH = 100;

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
    return Response.json({ error: 'invalid body' }, { status: 400 });
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
      { status: 429, headers: identity.newCookie ? { 'Set-Cookie': identity.newCookie } : undefined }
    );
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) {
    return Response.json(
      { error: 'scraper backend is not configured' },
      { status: 503 }
    );
  }

  // Dedup identical recent searches against the DB (shared across all
  // serverless instances, unlike a per-instance Map) to avoid fanning out
  // duplicate repository_dispatch jobs within a short window.
  const cacheKey = normalizeForCache(query);
  await connectDB();
  const recentJob = await ScrapeJob.findOne({
    normalizedQuery: cacheKey,
    status: { $in: ['pending', 'running'] },
    createdAt: { $gt: new Date(Date.now() - 60_000) },
  }).select('jobId');
  if (recentJob?.jobId) {
    return Response.json({
      jobId: recentJob.jobId,
      status: 'pending',
      cached: true,
      quota: { remaining: quota.remaining, limit: quota.limit },
    });
  }

  const jobId = newJobId();

  // Persist the job BEFORE dispatch so (a) a client polling
  // /scrape/status/[jobId] right after this never 404s, and (b) the
  // dispatch-failure path below has a real doc to update. A DB failure
  // must surface as an error, not a 200 referencing a job that doesn't exist.
  try {
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
    return Response.json(
      { error: 'failed to create scrape job' },
      { status: 500 }
    );
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
      {
        $set: {
          status: 'failed',
          error: 'dispatch_failed',
          completedAt: new Date(),
        },
      }
    ).catch(() => {});
    return Response.json(
      { error: 'failed to start scraper job' },
      { status: 502 }
    );
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
