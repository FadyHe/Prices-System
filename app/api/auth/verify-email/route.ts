import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/db/mongodb';
import { EmailVerificationToken, User } from '@/lib/db/models';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const id = url.searchParams.get('id');

  if (!token || !id) {
    return NextResponse.redirect(new URL('/login?verified=invalid', req.url));
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    await connectDB();
    const record = await EmailVerificationToken.findOne({
      tokenHash,
      userId: id,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return NextResponse.redirect(new URL('/login?verified=expired', req.url));
    }

    record.consumedAt = new Date();
    await record.save();

    await User.updateOne(
      { _id: id },
      { $set: { emailVerified: true, emailVerifiedAt: new Date() } }
    );

    return NextResponse.redirect(new URL('/login?verified=1', req.url));
  } catch (err) {
    console.error('[verify-email] failed', err);
    return NextResponse.redirect(new URL('/login?verified=error', req.url));
  }
}