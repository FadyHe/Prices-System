import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/db/mongodb';
import { EmailVerificationToken, User } from '@/lib/db/models';
import {
  hashPassword,
  isValidEmail,
  passwordIssues,
} from '@/lib/auth/password';
import { sendEmail, verificationEmail } from '@/lib/email/send';

export const runtime = 'nodejs';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'بيانات غير صحيحة' },
      { status: 400 }
    );
  }

  const name = (body.name ?? '').trim();
  const email = (body.email ?? '').toLowerCase().trim();
  const password = body.password ?? '';

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: 'الاسم مطلوب' },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: 'البريد الإلكتروني غير صحيح' },
      { status: 400 }
    );
  }
  const pwdIssue = passwordIssues(password);
  if (pwdIssue) {
    return NextResponse.json({ error: pwdIssue }, { status: 400 });
  }

  try {
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: 'هذا البريد مسجل بالفعل' },
        { status: 409 }
      );
    }
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
      provider: 'credentials',
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    await EmailVerificationToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });

    const baseUrl =
      process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${rawToken}&id=${user._id.toString()}`;
    const { subject, html, text } = verificationEmail(name, verifyUrl);
    await sendEmail({ to: email, subject, html, text });

    return NextResponse.json(
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[register] failed', err);
    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع. حاول مرة أخرى.' },
      { status: 500 }
    );
  }
}