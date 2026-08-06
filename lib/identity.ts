import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// IMPORTANT: NEXTAUTH_SECRET is used as the HMAC key (same secret NextAuth
// already relies on server-side). If it is unset, anon identity degrades
// to per-request tokens which resets anonymous quota every request — but
// it must never throw on a forged/tampered cookie (that would make
// anonymous scraping return 500s). Callers still get a working fresh token.

// Signed, opaque cookie used to key ANONYMOUS quota/rate limits. Unlike
// reading x-forwarded-for (trivially spoofed by any client), the cookie
// value is a random token bound to a request-time HMAC, so forging another
// identity requires knowing NEXTAUTH_SECRET. Signed-in users are keyed by
// their userId instead and never touch this cookie.
//
// Cookie value format: <token>.<sig> where sig = HMAC-SHA256(token).

export const ANON_COOKIE = 'qarinha_anon';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const TOKEN_BYTES = 16;

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('[identity] NEXTAUTH_SECRET is not set, cannot issue anon identity cookie');
  }
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

/** Verify cookie value; returns the token on success, null if missing/forged/expired. */
export function verifyAnonCookie(value: string | undefined | null): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const token = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = sign(token);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  // constant-time compare so timing doesn't leak the signature
  if (!timingSafeEqual(a, b)) return null;
  return token;
}

/** Create a fresh random identity token and the Set-Cookie header value for it. */
export function newAnonCookie(): { token: string; cookie: string } {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  const cookie = `${ANON_COOKIE}=${token}.${sign(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
  return { token, cookie };
}

/**
 * Resolve a stable identity key for quota/rate limiting.
 * - Signed-in users: `user:<id>` (cookie ignored).
 * - Anonymous: the existing verified anon-token, or a fresh one (its
 *   Set-Cookie header is returned for the caller to attach to a response).
 */
export function resolveIdentity(req: Request): {
  quotaKey: string;
  newCookie?: string;
} {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookieValue = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ANON_COOKIE}=`))
    ?.slice(ANON_COOKIE.length + 1) ?? null;

  const token = verifyAnonCookie(cookieValue);
  if (token) return { quotaKey: token };

  const { token: fresh, cookie } = newAnonCookie();
  return { quotaKey: fresh, newCookie: cookie };
}