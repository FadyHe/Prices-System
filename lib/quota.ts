import { connectDB } from '@/lib/db/mongodb';
import { QuotaWindow } from '@/lib/db/models';

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

function windowLabel(ts: number, ms: number): string {
  return new Date(Math.floor(ts / ms) * ms).toISOString();
}

/**
 * Atomically reserve one unit of quota, or no-op past the ceiling. The
 * ceiling is enforced inside findOneAndUpdate (filter count < limit +
 * $inc), never by a check-then-write, so concurrent requests at the
 * boundary can't overshoot the limit.
 *
 * `key` is a stable identity string: the cookie token for anonymous
 * users (see lib/identity.ts, 2.2) or `user:${userId}` for signed-in
 * users — never a raw client-supplied IP.
 */
async function reserve(
  key: string,
  s: { kind: 'hour' | 'day'; ms: number; limit: number }
): Promise<boolean> {
  const window = windowLabel(Date.now(), s.ms);
  const expiresInSec = Math.ceil(s.ms / 1000) + 60;

  const res = await QuotaWindow.findOneAndUpdate(
    {
      key,
      kind: s.kind,
      window,
      count: { $lt: s.limit },
    },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(Date.now() + expiresInSec * 1000) },
    },
    { upsert: true, new: true }
  );
  // Filter (count < limit) fails to match once the doc exists at the
  // ceiling, so `res` is null — the reservation is denied atomically.
  return res !== null;
}

export async function checkAndRecord(opts: {
  quotaKey: string;
  plan?: string;
}): Promise<QuotaResult> {
  await connectDB();
  const { quotaKey } = opts;
  // Signed-in users are quota'd by plan; anonymous by the shared anon limits.
  const key = opts.plan ? `user:${quotaKey}:${opts.plan}` : `anon:${quotaKey}`;
  const limits = opts.plan ? QUOTA_BY_PLAN[opts.plan] ?? QUOTA_BY_PLAN.free! : ANON_LIMITS;

  // Reserve both windows. If the hour ceiling is already hit, admit the
  // request read-only (don't consume) and report the day remaining.
  const hourOk = await reserve(key, { kind: 'hour', ms: HOUR_MS, limit: limits.perHour });
  if (!hourOk) {
    // Re-read is only for remaining counts; the door is closed.
    return { allowed: false, remaining: { hour: 0, day: Math.max(0, limits.perDay - await usedCount(key, 'day')) }, limit: limits, reason: 'hour' };
  }
  const dayOk = await reserve(key, { kind: 'day', ms: DAY_MS, limit: limits.perDay });
  if (!dayOk) {
    return { allowed: false, remaining: { hour: 0, day: 0 }, limit: limits, reason: 'day' };
  }

  return {
    allowed: true,
    remaining: { hour: limits.perHour - await usedCount(key, 'hour'), day: limits.perDay - await usedCount(key, 'day') },
    limit: limits,
  };
}

async function usedCount(key: string, kind: 'hour' | 'day'): Promise<number> {
  const doc = await QuotaWindow.findOne({ key, kind, window: windowLabel(Date.now(), kind === 'hour' ? HOUR_MS : DAY_MS) });
  return doc?.count ?? 0;
}