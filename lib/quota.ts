import { connectDB } from '@/lib/db/mongodb';
import { AuditLog } from '@/lib/db/models';

export interface QuotaLimits {
  perHour: number;
  perDay: number;
}

export const QUOTA_BY_PLAN: Record<string, QuotaLimits> = {
  free: { perHour: 10, perDay: 5 },
  pro: { perHour: 60, perDay: 50 },
  premium: { perHour: 200, perDay: 200 },
};

export const ANON_LIMITS: QuotaLimits = { perHour: 5, perDay: 10 };

export interface QuotaResult {
  allowed: boolean;
  remaining: { hour: number; day: number };
  limit: QuotaLimits;
  reason?: 'hour' | 'day';
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

async function countSince(userKey: { userId?: string; ip?: string }, since: number): Promise<number> {
  const filter: Record<string, unknown> = {
    action: 'scrape.success',
    createdAt: { $gte: new Date(Date.now() - since) },
  };
  if (userKey.userId) filter.userId = userKey.userId;
  else if (userKey.ip) filter.ip = userKey.ip;
  else return 0;
  return AuditLog.countDocuments(filter);
}

export async function checkAndRecord(opts: {
  userId?: string;
  ip: string;
  plan?: string;
}): Promise<QuotaResult> {
  await connectDB();
  const limits =
    opts.userId && opts.plan
      ? QUOTA_BY_PLAN[opts.plan] ?? QUOTA_BY_PLAN.free!
      : ANON_LIMITS;

  const key = { userId: opts.userId, ip: opts.ip };
  const usedHour = await countSince(key, HOUR_MS);
  const usedDay = await countSince(key, DAY_MS);

  if (usedHour >= limits.perHour) {
    return { allowed: false, remaining: { hour: 0, day: Math.max(0, limits.perDay - usedDay) }, limit: limits, reason: 'hour' };
  }
  if (usedDay >= limits.perDay) {
    return { allowed: false, remaining: { hour: Math.max(0, limits.perHour - usedHour), day: 0 }, limit: limits, reason: 'day' };
  }

  return {
    allowed: true,
    remaining: { hour: limits.perHour - usedHour - 1, day: limits.perDay - usedDay - 1 },
    limit: limits,
  };
}