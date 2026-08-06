import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db/mongodb';
import { SearchHistory } from '@/lib/db/models';
import { authOptions } from '@/lib/auth/options';
import type { Product } from '@/components/useScraper';

export const runtime = 'nodejs';

interface LocalEntry {
  id?: string;
  query: string;
  timestamp?: number;
  resultCount?: number;
  bestPrice?: number;
  bestSource?: string;
  pinned?: boolean;
  savedProducts?: Product[];
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

  let body: { entries?: LocalEntry[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (entries.length === 0) {
    return NextResponse.json({ merged: 0 });
  }

  await connectDB();

  const existing = await SearchHistory.find({ userId }).select(
    'query savedProducts'
  );
  const existingQueries = new Set(existing.map((e) => e.query.toLowerCase()));
  // Dedup by product URL so re-merging the same local history never
  // duplicates saved products inside a single entry.
  const existingUrls = new Set<string>();
  for (const e of existing) {
    for (const p of e.savedProducts ?? []) {
      if (p?.url) existingUrls.add(p.url);
    }
  }

  const fresh = entries
    .filter((e) => e.query && !existingQueries.has(e.query.toLowerCase()))
    .map((e) => ({
      ...e,
      savedProducts: (e.savedProducts ?? []).filter(
        (p) => p?.url && !existingUrls.has(p.url)
      ),
    }));

  if (fresh.length === 0) {
    return NextResponse.json({ merged: 0 });
  }

  await SearchHistory.insertMany(
    fresh.map((e) => ({
      userId,
      query: e.query.trim(),
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      resultCount: e.resultCount ?? 0,
      bestPrice: e.bestPrice,
      bestSource: e.bestSource,
      pinned: e.pinned ?? false,
      savedProducts: e.savedProducts ?? [],
    })),
    { ordered: false }
  );

  return NextResponse.json({ merged: fresh.length });
}