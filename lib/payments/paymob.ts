/**
 * Paymob integration (PR2 — not yet wired).
 *
 * To enable:
 *  1. Sign up at https://paymob.com and grab the test secret key + integration IDs.
 *  2. Set env vars: PAYMOB_API_KEY, PAYMOB_HMAC_SECRET, PAYMOB_INTEGRATION_ID_CARD,
 *     PAYMOB_INTEGRATION_ID_MOBILE_WALLET, PAYMOB_BASE = https://accept.paymob.com (default).
 *  3. Create the three integration cards in the Paymob dashboard (Card / Mobile Wallet / Fawry).
 *  4. Wire the routes in app/api/payments/* and the pricing page.
 *  5. The webhook (app/api/payments/webhook/route.ts) MUST verify the HMAC of the
 *     incoming request body using PAYMOB_HMAC_SECRET before trusting it.
 */
import crypto from 'node:crypto';

export type PaymobPlan = 'pro' | 'premium';

export interface PaymobPlanConfig {
  plan: PaymobPlan;
  amountCents: number;
  currency: 'EGP';
  description: string;
}

export const PAYMOB_PLANS: Record<PaymobPlan, PaymobPlanConfig> = {
  pro: {
    plan: 'pro',
    amountCents: 9900, // 99 EGP / month
    currency: 'EGP',
    description: 'Pro — 50 searches/day',
  },
  premium: {
    plan: 'premium',
    amountCents: 19900, // 199 EGP / month
    currency: 'EGP',
    description: 'Premium — 200 searches/day',
  },
};

export function paymobEnv(): {
  apiKey: string;
  hmacSecret: string;
  integrationIdCard: string;
  base: string;
} | null {
  const apiKey = process.env.PAYMOB_API_KEY;
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  const integrationIdCard = process.env.PAYMOB_INTEGRATION_ID_CARD;
  const base = process.env.PAYMOB_BASE ?? 'https://accept.paymob.com';
  if (!apiKey || !hmacSecret || !integrationIdCard) return null;
  return { apiKey, hmacSecret, integrationIdCard, base };
}

export interface PaymobAuthResponse {
  token: string;
}

export interface PaymobIntentionResponse {
  id: string;
  client_secret: string;
}

export async function paymobCreateIntention(args: {
  amountCents: number;
  userId: string;
  userEmail: string;
  userName: string;
  plan: PaymobPlan;
}): Promise<PaymobIntentionResponse> {
  const env = paymobEnv();
  if (!env) throw new Error('Paymob env vars not configured');

  const res = await fetch(`${env.base}/v1/intention/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${env.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: args.amountCents,
      currency: 'EGP',
      payment_methods: [Number(env.integrationIdCard)],
      billing_data: {
        first_name: args.userName.split(' ')[0] ?? args.userName,
        last_name: args.userName.split(' ').slice(1).join(' ') || 'User',
        email: args.userEmail,
        apartment: 'NA',
        floor: 'NA',
        street: 'NA',
        building: 'NA',
        shipping_method: 'NA',
        postal_code: 'NA',
        city: 'Cairo',
        country: 'EG',
        state: 'NA',
      },
      extras: { plan: args.plan, userId: args.userId },
      special_reference: `${args.userId}:${args.plan}:${Date.now()}`,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paymob intention failed: ${res.status} ${text}`);
  }
  return (await res.json()) as PaymobIntentionResponse;
}

export function verifyPaymobHmac(
  query: Record<string, string>,
  hmacSecret: string
): boolean {
  // Paymob sends the HMAC over a specific concatenation of fields in a fixed order.
  // See: https://docs.paymob.com/docs/transaction-webhooks
  const order = [
    'amount_cents',
    'created_at',
    'currency',
    'error_occured',
    'has_parent_transaction',
    'id',
    'integration_id',
    'is_3d_secure',
    'is_auth',
    'is_capture',
    'is_refunded',
    'is_standalone_payment',
    'is_voided',
    'order',
    'owner',
    'pending',
    'source_data_pan',
    'source_data_sub_type',
    'source_data_type',
    'success',
  ];
  const concatenated = order.map((k) => query[k] ?? '').join('');
  const expected = crypto
    .createHmac('sha512', hmacSecret)
    .update(concatenated)
    .digest('hex');
  const provided = query.hmac ?? '';
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(provided, 'hex')
  );
}