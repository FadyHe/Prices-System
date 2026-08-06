import { connectDB } from '@/lib/db/mongodb';
import { ScrapeJob } from '@/lib/db/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(_req: Request, ctx: RouteParams) {
  const { jobId } = await ctx.params;
  if (!jobId || !/^[a-f0-9]{1,64}$/i.test(jobId)) {
    return Response.json({ error: 'invalid jobId' }, { status: 400 });
  }

  await connectDB();
  const job = await ScrapeJob.findOne({ jobId }).lean();
  if (!job) {
    return Response.json({ error: 'job not found' }, { status: 404 });
  }

  // Auto-fail jobs whose GH Actions run never reported back (lost webhook,
  // silently dropped dispatch, job queued past its cap). GH Actions
  // `timeout-minutes: 7` is the authoritative ceiling; anything still
  // 'pending'/'running' after 8 minutes wall-clock is unrecoverable. This
  // stops a stuck job from being re-served by the dedup cache and lets the
  // client surface a real failure instead of polling forever.
  const STALE_MS = 8 * 60 * 1000;
  if (
    (job.status === 'pending' || job.status === 'running') &&
    Date.now() - new Date(job.createdAt).getTime() > STALE_MS
  ) {
    await ScrapeJob.updateOne(
      { jobId },
      { $set: { status: 'failed', error: 'timeout', completedAt: new Date() } }
    );
    return Response.json(
      {
        jobId: job.jobId,
        query: job.query,
        status: 'failed',
        totalScraped: 0,
        count: 0,
        error: 'timeout',
        createdAt: job.createdAt,
        completedAt: new Date(),
        products: [],
      },
      { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
    );
  }

  return Response.json(
    {
      jobId: job.jobId,
      query: job.query,
      status: job.status,
      totalScraped: job.totalScraped ?? 0,
      count: job.count ?? 0,
      error: job.error ?? null,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? null,
      products: job.status === 'complete' ? job.products ?? [] : [],
    },
    {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    }
  );
}
