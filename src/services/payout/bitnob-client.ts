/**
 * Bitnob sandbox client — real HTTP calls, HMAC-SHA256 auth.
 *
 * This is the canonical Bitnob integration file per Commerce CLAUDE.md.
 * Auth: HMAC-SHA256 (X-Auth-Client / X-Auth-Timestamp / X-Auth-Nonce / X-Auth-Signature).
 * Base URL: https://api.bitnob.com (sandbox credentials route to sandbox).
 *
 * Activated when USE_REAL_BITNOB=true.
 * Env vars: BITNOB_CLIENT_ID, BITNOB_CLIENT_SECRET, BITNOB_WEBHOOK_SECRET.
 */

import { createHmac, randomBytes } from 'crypto';
import type { PayoutResult, PayoutStatus, BankAccount } from '@/types/shared';
import { satsToNgn } from '@/lib/currency';

const BASE = 'https://api.bitnob.com';

// ── Auth ──────────────────────────────────────────────────────────────────────

function creds() {
  const clientId = process.env.BITNOB_CLIENT_ID;
  const secretKey = process.env.BITNOB_CLIENT_SECRET;
  if (!clientId || !secretKey) throw new Error('BITNOB_CLIENT_ID and BITNOB_CLIENT_SECRET are required');
  return { clientId, secretKey };
}

function postHeaders(clientId: string, secretKey: string, body: string): HeadersInit {
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString('hex');
  const sig = createHmac('sha256', secretKey).update(`${clientId}:${ts}:${nonce}:${body}`).digest('hex');
  return { 'Content-Type': 'application/json', 'X-Auth-Client': clientId, 'X-Auth-Timestamp': ts, 'X-Auth-Nonce': nonce, 'X-Auth-Signature': sig };
}

function getHeaders(clientId: string, secretKey: string): HeadersInit {
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString('hex');
  const sig = createHmac('sha256', secretKey).update(`${clientId}:${ts}:${nonce}:`).digest('hex');
  return { 'Content-Type': 'application/json', 'X-Auth-Client': clientId, 'X-Auth-Timestamp': ts, 'X-Auth-Nonce': nonce, 'X-Auth-Signature': sig };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const { clientId, secretKey } = creds();
  const payload = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: postHeaders(clientId, secretKey, payload), body: payload });
  if (!res.ok) { const t = await res.text().catch(() => res.statusText); throw new Error(`Bitnob ${res.status} at ${path}: ${t}`); }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const { clientId, secretKey } = creds();
  const res = await fetch(`${BASE}${path}`, { method: 'GET', headers: getHeaders(clientId, secretKey) });
  if (!res.ok) { const t = await res.text().catch(() => res.statusText); throw new Error(`Bitnob ${res.status} at ${path}: ${t}`); }
  return res.json() as Promise<T>;
}

// ── Bank code lookup ──────────────────────────────────────────────────────────

interface BitnobBank { bank_code: string; bank_name: string; }
interface BanksResponse { data: BitnobBank[]; }

let bankCache: BitnobBank[] | null = null;

async function resolveBankCode(bankName: string): Promise<string> {
  if (!bankCache) {
    const r = await get<BanksResponse>('/api/payouts/banks/NG');
    bankCache = r.data;
  }
  const n = bankName.toLowerCase().trim();
  const match = bankCache.find((b) => b.bank_name.toLowerCase().includes(n) || n.includes(b.bank_name.toLowerCase()));
  if (!match) throw new Error(`Bitnob: cannot resolve bank code for "${bankName}"`);
  return match.bank_code;
}

// ── Response shapes ───────────────────────────────────────────────────────────

interface QuoteResponse {
  success: boolean;
  data: { payout: { id: string; settlement_amount: string; exchange_rate: { rate: string } } };
}
interface PayoutResponse {
  data: { payout: { id: string; status: string } };
}
interface StatusResponse {
  data: { id: string; status: string; sat_amount: number; settlement_amount: number };
}

function mapStatus(s: string): PayoutStatus {
  const u = s.toUpperCase();
  if (u === 'SUCCESS' || u === 'COMPLETED') return 'SUCCESS';
  if (u === 'FAILED') return 'FAILED';
  return 'PENDING';
}

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Initiate a sats → NGN payout via Bitnob sandbox.
 * Three-step: quote → initialize → finalize.
 */
export async function initiatePayout(
  amountSats: bigint,
  bankAccount: BankAccount,
): Promise<PayoutResult> {
  const amountNgn = satsToNgn(amountSats);
  const bankCode = await resolveBankCode(bankAccount.bankName);

  const qRef = `bitscy-q-${Date.now()}-${randomBytes(4).toString('hex')}`;
  const quote = await post<QuoteResponse>('/api/payouts/quotes', {
    from_asset: 'BTC',
    to_currency: 'NGN',
    country: 'NG',
    source: 'offchain',
    reference: qRef,
    amount: (Number(amountSats) / 100_000_000).toString(),
  });

  const quoteId = quote.data.payout.id;
  const pRef = `bitscy-p-${Date.now()}-${randomBytes(4).toString('hex')}`;

  const payout = await post<PayoutResponse>(`/api/payouts/${quoteId}/initialize`, {
    quote_id: quoteId,
    reference: pRef,
    payment_reason: 'vendor_payment',
    beneficiary: {
      destination_type: 'bank',
      country: 'NG',
      account_name: bankAccount.accountName,
      account_number: bankAccount.accountNumber,
      bank_code: bankCode,
    },
  });

  await post(`/api/payouts/${quoteId}/finalize`, {});

  return {
    payoutId: payout.data.payout.id,
    status: mapStatus(payout.data.payout.status),
    amountSats: amountSats.toString(),
    amountNgn: amountNgn.toString(),
    etaSeconds: 30,
  };
}

export async function getStatus(payoutId: string): Promise<PayoutResult | null> {
  try {
    const r = await get<StatusResponse>(`/api/v1/payouts/${payoutId}`);
    return {
      payoutId,
      status: mapStatus(r.data.status),
      amountSats: r.data.sat_amount.toString(),
      amountNgn: r.data.settlement_amount.toString(),
      etaSeconds: 0,
    };
  } catch {
    return null;
  }
}

/**
 * Verify Bitnob webhook signature.
 * Bitnob signs the raw payload body with BITNOB_WEBHOOK_SECRET via HMAC-SHA256.
 */
export function verifyWebhookSignature(signature: string, payload: string): boolean {
  const secret = process.env.BITNOB_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  // Constant-time comparison to prevent timing attacks.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
