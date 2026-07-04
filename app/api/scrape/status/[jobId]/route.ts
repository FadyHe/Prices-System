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
