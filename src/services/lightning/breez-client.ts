import { randomBytes } from 'crypto';
import type { LightningInvoice, InvoiceStatus } from '@/types/shared';
import { extractPaymentHash } from './bolt11';
import { getSellerWallet, trackInvoice, findSettlement } from './wallet-manager';

/**
 * Lightning client — wraps Breez SDK Spark with a mock fallback.
 *
 * USE_MOCK_LIGHTNING=true  → mock (local dev, no API key needed)
 * USE_MOCK_LIGHTNING=false + BREEZ_API_KEY set → real Breez SDK Spark
 *
 * The public API surface is identical in both modes. Callers never know which
 * path is active. Switching to real on the server is a single env-var change.
 */

const USE_MOCK =
  process.env.USE_MOCK_LIGHTNING === 'true' || !process.env.BREEZ_API_KEY;

// ============================================================================
// Shared types
// ============================================================================

export interface CreateInvoiceParams {
  sellerId: string;
  sellerLightningAddress: string;
  amountSats: bigint;
  description: string;
  expirySeconds?: number;
}

// ============================================================================
// Mock implementation (local dev / demo without real Lightning)
// ============================================================================

interface MockInvoiceRecord {
  bolt11: string;
  paymentHash: string;
  amountSats: bigint;
  expiresAt: Date;
  settled: boolean;
  settledAt: Date | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mockInvoices: Map<string, MockInvoiceRecord> | undefined;
}

function getMockStore(): Map<string, MockInvoiceRecord> {
  if (!globalThis.__mockInvoices) globalThis.__mockInvoices = new Map();
  return globalThis.__mockInvoices;
}

const MOCK_SETTLE_MS = 30_000;
const MOCK_EXPIRY_SECONDS = 3600;

function generatePaymentHash(): string {
  return randomBytes(32).toString('hex');
}

function generateMockBolt11(amountSats: bigint): string {
  const amountMsat = amountSats * 1000n;
  const randomData = randomBytes(64).toString('hex');
  return `lnbc${amountMsat}n1${randomData}`;
}

async function mockCreateInvoice(params: CreateInvoiceParams): Promise<LightningInvoice> {
  const paymentHash = generatePaymentHash();
  const bolt11 = generateMockBolt11(params.amountSats);
  const expirySeconds = params.expirySeconds ?? MOCK_EXPIRY_SECONDS;
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  getMockStore().set(paymentHash, {
    bolt11,
    paymentHash,
    amountSats: params.amountSats,
    expiresAt,
    settled: false,
    settledAt: null,
  });

  // Auto-settle after MOCK_SETTLE_MS so the full purchase flow demos without a real wallet.
  setTimeout(() => {
    const r = getMockStore().get(paymentHash);
    if (r && !r.settled) {
      r.settled = true;
      r.settledAt = new Date();
    }
  }, MOCK_SETTLE_MS);

  return {
    bolt11,
    paymentHash,
    amountSats: params.amountSats.toString(),
    expiresAt: expiresAt.toISOString(),
  };
}

async function mockVerifyInvoice(paymentHash: string): Promise<InvoiceStatus> {
  const record = getMockStore().get(paymentHash);
  if (!record) return { paymentHash, settled: false, settledAt: null };
  return {
    paymentHash,
    settled: record.settled,
    settledAt: record.settledAt?.toISOString() ?? null,
  };
}

async function mockGetWalletBalance(_sellerId: string): Promise<bigint> {
  return 250_000n; // plausible demo balance
}

/**
 * Dev/demo only: manually settle a mock invoice by payment hash.
 * Used by POST /api/dev/settle so the demo works without a real Lightning wallet.
 */
export function mockSettleInvoice(paymentHash: string): boolean {
  const record = getMockStore().get(paymentHash);
  if (!record || record.settled) return false;
  record.settled = true;
  record.settledAt = new Date();
  return true;
}

// ============================================================================
// Real Breez SDK Spark implementation
// ============================================================================

async function realCreateInvoice(params: CreateInvoiceParams): Promise<LightningInvoice> {
  const { sdk, settlementStore } = await getSellerWallet(params.sellerId);

  const expirySeconds = params.expirySeconds ?? 3600;

  // receivePayment returns { paymentRequest: string (BOLT11), feeSats: number }
  const { paymentRequest } = await sdk.receivePayment({
    paymentMethod: {
      type: 'bolt11Invoice',
      description: params.description,
      amountSats: Number(params.amountSats),
      expirySecs: expirySeconds,
    },
  });

  const paymentHash = extractPaymentHash(paymentRequest);
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  // Seed the settlement store so verifyInvoice() has a record to return
  // even before the event listener fires.
  if (!settlementStore.has(paymentHash)) {
    settlementStore.set(paymentHash, { settled: false, settledAt: null });
  }
  // Also track via the global helper (covers cross-wallet lookups)
  trackInvoice(params.sellerId, paymentHash);

  return {
    bolt11: paymentRequest,
    paymentHash,
    amountSats: params.amountSats.toString(),
    expiresAt: expiresAt.toISOString(),
  };
}

async function realVerifyInvoice(paymentHash: string): Promise<InvoiceStatus> {
  // The event listener on the seller's SDK instance updates findSettlement().
  // No polling of Breez is needed — the event is the source of truth.
  const record = findSettlement(paymentHash);
  if (!record) return { paymentHash, settled: false, settledAt: null };
  return {
    paymentHash,
    settled: record.settled,
    settledAt: record.settledAt?.toISOString() ?? null,
  };
}

async function realGetWalletBalance(sellerId: string): Promise<bigint> {
  const { sdk } = await getSellerWallet(sellerId);
  // ensureSynced: false avoids blocking the request on a full network sync.
  const info = await sdk.getInfo({ ensureSynced: false });
  return BigInt(Math.round(info.balanceSats));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate a Lightning invoice for an order.
 * Mock: fake BOLT11, auto-settles after 30s.
 * Real: Breez SDK receivePayment() → actual payable BOLT11.
 */
export async function createInvoice(params: CreateInvoiceParams): Promise<LightningInvoice> {
  if (USE_MOCK) return mockCreateInvoice(params);
  return realCreateInvoice(params);
}

/**
 * Check whether a Lightning invoice has been settled.
 * Mock: reads in-memory mock store.
 * Real: reads the settlement map populated by the Breez event listener.
 */
export async function verifyInvoice(paymentHash: string): Promise<InvoiceStatus> {
  if (USE_MOCK) return mockVerifyInvoice(paymentHash);
  return realVerifyInvoice(paymentHash);
}

/**
 * Get a seller's current sats balance from their Breez wallet.
 * Mock: returns 250,000 sats.
 * Real: queries sdk.getInfo().balanceSats.
 */
export async function getWalletBalance(sellerId: string): Promise<bigint> {
  if (USE_MOCK) return mockGetWalletBalance(sellerId);
  return realGetWalletBalance(sellerId);
}
