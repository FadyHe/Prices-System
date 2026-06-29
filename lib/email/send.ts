type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'no-reply@qarinha.app';

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      '[email] SMTP not configured; logging verification email instead.'
    );
    console.warn(`[email] to=${msg.to} subject=${msg.subject}`);
    console.warn(msg.text ?? msg.html.replace(/<[^>]+>/g, ''));
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
}

export function verificationEmail(
  name: string,
  verifyUrl: string
): { subject: string; html: string; text: string } {
  const subject = 'أكّد بريدك الإلكتروني على قارنها';
  const html = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width:560px; margin:0 auto; padding:24px; background:#0f172a; color:#e2e8f0; border-radius:12px;">
      <h2 style="color:#a78bfa; margin:0 0 12px 0;">أهلاً ${name} 👋</h2>
      <p>شكراً لتسجيلك في <strong>قارنها</strong>. اضغط الزر ده لتأكيد بريدك الإلكتروني وتفعيل حسابك:</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${verifyUrl}" style="background:#7c3aed; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block;">
          تأكيد البريد الإلكتروني
        </a>
      </p>
      <p style="font-size:13px; color:#94a3b8;">لو الزر مش شغّال، انسخ اللينك ده في المتصفح:</p>
      <p style="word-break:break-all; font-size:12px; color:#64748b;">${verifyUrl}</p>
      <p style="font-size:13px; color:#94a3b8;">اللينك ده هينتهي خلال ساعة واحدة.</p>
    </div>
  `;
  const text = `أهلاً ${name}\nأكّد بريدك الإلكتروني: ${verifyUrl}\nاللينك هينتهي خلال ساعة.`;
  return { subject, html, text };
}