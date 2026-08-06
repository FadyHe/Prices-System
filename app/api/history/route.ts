import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db/mongodb';
import { SearchHistory, toHistoryResponse } from '@/lib/db/models';
import { authOptions } from '@/lib/auth/options';
import type { Product } from '@/components/useScraper';

export const runtime = 'nodejs';

interface PostBody {
  query: string;
  resultCount?: number;
  bestPrice?: number;
  bestSource?: string;
  savedProducts?: Product[];
  pinned?: boolean;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ entries: [] }, { status: 200 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ entries: [] }, { status: 200 });
  }

  await connectDB();
  const docs = await SearchHistory.find({ userId })
    .sort({ timestamp: -1 })
    .limit(100)
    .lean();
  return NextResponse.json({
    entries: docs.map((d) =>
      toHistoryResponse({
        ...d,
        _id: d._id,
        timestamp: d.timestamp,
        resultCount: d.resultCount,
        bestPrice: d.bestPrice,
        bestSource: d.bestSource,
        pinned: d.pinned,
        savedProducts: d.savedProducts,
      } as never)
    ),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.query?.trim()) {
    return NextResponse.json({ error: 'query required' }, { status: 400 });
  }

  await connectDB();
  const doc = await SearchHistory.create({
    userId,
    query: body.query.trim(),
    resultCount: body.resultCount ?? 0,
    bestPrice: body.bestPrice,
    bestSource: body.bestSource,
    // Drop any saved product that lacks a name/price/url — a partial card
    // with no url is a dead link and shouldn't be persisted (also guards
    // against schema-level url:required on older/edge stores).
    savedProducts: (body.savedProducts ?? []).filter(
      (p) => p && p.name && p.url
    ),
    pinned: body.pinned ?? false,
  });
  return NextResponse.json({ entry: toHistoryResponse(doc) }, { status: 201 });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  await connectDB();
  await SearchHistory.deleteMany({ userId, pinned: { $ne: true } });
  return NextResponse.json({ ok: true });
}