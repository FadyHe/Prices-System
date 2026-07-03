import { randomBytes } from 'crypto';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { audit, getClientIp } from '@/lib/audit';
import { checkAndRecord } from '@/lib/quota';
import { connectDB } from '@/lib/db/mongodb';
import { ScrapeJob } from '@/lib/db/models';
import { triggerWorkflowDispatch } from '@/lib/github/dispatch';

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

  const quota = await checkAndRecord({ userId, ip, plan });
  if (!quota.allowed) {
    await audit({
      userId,
      ip,
      action: 'scrape.quota_exceeded',
      query,
      meta: { reason: quota.reason, plan },
    });
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
      { status: 429 }
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

  const jobId = newJobId();
  await connectDB();
  await ScrapeJob.create({
    jobId,
    query,
    status: 'pending',
    userId,
    ip,
    plan,
  });

  await audit({
    userId,
    ip,
    action: 'scrape.success',
    query,
    meta: { plan, jobId, quota: quota.remaining, mode: 'github-actions' },
  });

  try {
    await triggerWorkflowDispatch({
      repo,
      token,
      eventType: 'run-scrape',
      clientPayload: { query, jobId },
    });
  } catch (err) {
    console.error('[scrape] dispatch failed', err);
    await ScrapeJob.updateOne(
      { jobId },
      {
        $set: {
          status: 'failed',
          error: 'dispatch_failed',
          completedAt: new Date(),
        },
      }
    );
    return Response.json(
      { error: 'failed to start scraper job' },
      { status: 502 }
    );
  }

  return Response.json({
    jobId,
    status: 'pending',
    quota: {
      remaining: quota.remaining,
      limit: quota.limit,
    },
  });
}
