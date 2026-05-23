import { createHmac, randomBytes } from 'crypto';
import type { PayoutResult, PayoutStatus } from '@/types/shared';
import { satsToNgn } from '@/lib/currency';

/**
 * Real Bitnob API client for sats → NGN bank payout.
 *
 * Authentication: HMAC-SHA256 per-request signature.
 * Signing string: CLIENT_ID:TIMESTAMP:NONCE:PAYLOAD
 * Docs: https://docs.bitnob.com
 *
 * Activated when USE_REAL_BITNOB=true. Set BITNOB_CLIENT_ID and
 * BITNOB_CLIENT_SECRET in .env.local (obtain from Bitnob dashboard).
 */

const BITNOB_BASE = 'https://api.bitnob.com';

export interface BitnobBankAccountDetails {
  accountName: string;
  accountNumber: string;
  bankName: string; // used to resolve bankCode from Bitnob's bank list
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function getCredentials(): { clientId: string; secretKey: string } {
  const clientId = process.env.BITNOB_CLIENT_ID;
  const secretKey = process.env.BITNOB_CLIENT_SECRET;
  if (!clientId || !secretKey) {
    throw new Error('BITNOB_CLIENT_ID and BITNOB_CLIENT_SECRET env vars are required for real payout');
  }
  return { clientId, secretKey };
}

function buildPostHeaders(clientId: string, secretKey: string, body: string): HeadersInit {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString('hex');
  const signingString = `${clientId}:${timestamp}:${nonce}:${body}`;
  const signature = createHmac('sha256', secretKey).update(signingString).digest('hex');

  return {
    'Content-Type': 'application/json',
    'X-Auth-Client': clientId,
    'X-Auth-Timestamp': timestamp,
    'X-Auth-Nonce': nonce,
    'X-Auth-Signature': signature,
  };
}

function buildGetHeaders(clientId: string, secretKey: string): HeadersInit {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString('hex');
  // GET requests have no body; payload component of the signing string is empty.
  const signingString = `${clientId}:${timestamp}:${nonce}:`;
  const signature = createHmac('sha256', secretKey).update(signingString).digest('hex');

  return {
    'Content-Type': 'application/json',
    'X-Auth-Client': clientId,
    'X-Auth-Timestamp': timestamp,
    'X-Auth-Nonce': nonce,
    'X-Auth-Signature': signature,
  };
}

async function bitnobPost<T>(path: string, body: unknown): Promise<T> {
  const { clientId, secretKey } = getCredentials();
  const payload = JSON.stringify(body);
  const res = await fetch(`${BITNOB_BASE}${path}`, {
    method: 'POST',
    headers: buildPostHeaders(clientId, secretKey, payload),
    body: payload,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Bitnob API error ${res.status} at ${path}: ${text}`);
  }

  return res.json() as Promise<T>;
}

async function bitnobGet<T>(path: string): Promise<T> {
  const { clientId, secretKey } = getCredentials();
  const res = await fetch(`${BITNOB_BASE}${path}`, {
    method: 'GET',
    headers: buildGetHeaders(clientId, secretKey),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Bitnob API error ${res.status} at ${path}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Bank code lookup ──────────────────────────────────────────────────────────

interface BitnobBank {
  bank_code: string;
  bank_name: string;
}

interface BitnobBanksResponse {
  data: BitnobBank[];
}

// Cache bank list for the lifetime of the server process — list changes rarely.
let cachedBanks: BitnobBank[] | null = null;

async function resolveBankCode(bankName: string): Promise<string> {
  if (!cachedBanks) {
    const response = await bitnobGet<BitnobBanksResponse>('/api/payouts/banks/NG');
    cachedBanks = response.data;
  }

  const normalised = bankName.toLowerCase().trim();
  const match = cachedBanks.find(
    (b) => b.bank_name.toLowerCase().includes(normalised) || normalised.includes(b.bank_name.toLowerCase()),
  );

  if (!match) {
    throw new Error(
      `Could not resolve Bitnob bank code for "${bankName}". ` +
      `Check the bank name matches Bitnob's bank list exactly.`,
    );
  }

  return match.bank_code;
}

// ── Bitnob response shapes ────────────────────────────────────────────────────

interface BitnobQuoteResponse {
  success: boolean;
  data: {
    payout: {
      id: string;            // quoteId — used in Step 2 URL and body
      settlement_amount: string; // NGN, e.g. "1040.38"
      exchange_rate: { rate: string; btc_rate: string };
      trip: { quote_at: string };
    };
  };
}

interface BitnobPayoutResponse {
  data: {
    payout: {
      id: string;
      status: string; // "INITIATED" | "SUCCESS" | "FAILED"
      sat_amount: number;
      exchange_rate: string;
    };
  };
}

interface BitnobPayoutStatusResponse {
  data: {
    id: string;
    status: string;
    sat_amount: number;
    settlement_amount: number; // NGN
  };
}

function mapStatus(bitnobStatus: string): PayoutStatus {
  const s = bitnobStatus.toUpperCase();
  if (s === 'SUCCESS' || s === 'COMPLETED') return 'SUCCESS';
  if (s === 'FAILED') return 'FAILED';
  return 'PENDING';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initiate a sats → NGN payout via Bitnob. Two-step: quote then initialize.
 *
 * Bitnob converts the BTC amount using their live rate, then pushes NGN
 * to the seller's Nigerian bank account. The quote expires quickly — both
 * steps happen in sequence within the same request.
 */
export async function initiatePayout(
  amountSats: bigint,
  _bankAccountId: string,
  bankAccount: BitnobBankAccountDetails,
): Promise<PayoutResult> {
  const amountNgn = satsToNgn(amountSats);
  const bankCode = await resolveBankCode(bankAccount.bankName);

  // Step 1 — Get a conversion quote (BTC → NGN).
  const btcAmount = Number(amountSats) / 100_000_000; // sats → BTC
  const quoteReference = `bitscy-q-${Date.now()}-${randomBytes(4).toString('hex')}`;
  const quote = await bitnobPost<BitnobQuoteResponse>('/api/payouts/quotes', {
    from_asset: 'BTC',
    to_currency: 'NGN',
    country: 'NG',           // field name is "country", not "destination_country"
    source: 'offchain',      // Lightning / off-chain settlement
    reference: quoteReference,
    amount: btcAmount.toString(),
  });

  const quoteId = quote.data.payout.id;
  const payoutReference = `bitscy-p-${Date.now()}-${randomBytes(4).toString('hex')}`;

  // Step 2 — Initialize the payout with the quote and beneficiary details.
  const payout = await bitnobPost<BitnobPayoutResponse>(`/api/payouts/${quoteId}/initialize`, {
    quote_id: quoteId,
    reference: payoutReference,
    payment_reason: 'vendor_payment',
    beneficiary: {
      destination_type: 'bank',
      country: 'NG',
      account_name: bankAccount.accountName,
      account_number: bankAccount.accountNumber,
      bank_code: bankCode,
    },
  });

  // Step 3 — Finalize (confirms the payout execution).
  await bitnobPost(`/api/payouts/${quoteId}/finalize`, {});

  return {
    payoutId: payout.data.payout.id,
    status: mapStatus(payout.data.payout.status),
    amountSats: amountSats.toString(),
    amountNgn: amountNgn.toString(),
    etaSeconds: 30,
  };
}

/**
 * Poll the status of an existing Bitnob payout.
 */
export async function getPayoutStatus(payoutId: string): Promise<PayoutResult | null> {
  try {
    const response = await bitnobGet<BitnobPayoutStatusResponse>(`/api/v1/payouts/${payoutId}`);
    return {
      payoutId,
      status: mapStatus(response.data.status),
      amountSats: response.data.sat_amount.toString(),
      amountNgn: response.data.settlement_amount.toString(),
      etaSeconds: 0,
    };
  } catch {
    return null;
  }
}
