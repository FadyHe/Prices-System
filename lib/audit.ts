import { connectDB } from '@/lib/db/mongodb';
import { AuditLog } from '@/lib/db/models';

export type Action =
  | 'scrape.success'
  | 'scrape.quota_exceeded'
  | 'scrape.rate_limited'
  | 'auth.register'
  | 'auth.verify_email'
  | 'auth.signin';

export interface AuditInput {
  userId?: string;
  ip?: string;
  action: Action;
  query?: string;
  resultCount?: number;
  meta?: Record<string, unknown>;
}

export async function audit(input: AuditInput): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      userId: input.userId,
      ip: input.ip,
      action: input.action,
      query: input.query,
      resultCount: input.resultCount,
      meta: input.meta,
    });
  } catch (err) {
    console.error('[audit] failed', err);
  }
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? '0.0.0.0';
}