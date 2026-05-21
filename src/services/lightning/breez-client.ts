import { randomBytes } from 'crypto';
import type { LightningInvoice, InvoiceStatus } from '@/types/shared';

/**
 * Lightning client wrapping Breez SDK Nodeless.
 *
 * In production, set BREEZ_API_KEY and USE_MOCK_LIGHTNING=false.
 * In development / demo, the mock generates realistic invoices and
 * auto-settles after MOCK_SETTLE_MS so the full UI flow can be demoed.
 *
 * TODO(commerce-v2): plug in the real Breez SDK when BREEZ_API_KEY is live.
 * Real implementation:
 *   import { connect, defaultConfig, LiquidNetwork, PaymentMethod } from '@breeztech/breez-sdk-liquid';
 *   const sdk = await connect({ mnemonic, config });
 *   const prep = await sdk.prepareReceivePayment({ paymentMethod: { type: 'lightning' }, payerAmountSat });
 *   const { destination: bolt11 } = await sdk.receivePayment({ prepareResponse: prep });
 */

const USE_MOCK = process.env.USE_MOCK_LIGHTNING !== 'false' || !process.env.BREEZ_API_KEY;

// ============================================================================
// In-memory mock state (resets on server restart — fine for demo)
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
  if (!globalThis.__mockInvoices) {
    globalThis.__mockInvoices = new Map();
  }
  return globalThis.__mockInvoices;
}

const MOCK_SETTLE_MS = 30_000; // auto-settle after 30s for demo flow
const MOCK_EXPIRY_SECONDS = 3600;

function generatePaymentHash(): string {
  return randomBytes(32).toString('hex');
}

function generateMockBolt11(amountSats: bigint): string {
  // Generates a plausible-looking (but not payable) BOLT-11 string for UI display.
  // Format: lnbc<amount>n1<random_bech32_data>
  const amountMsat = amountSats * 1000n;
  const randomData = randomBytes(64).toString('hex');
  return `lnbc${amountMsat}n1${randomData}`;
}

// ============================================================================
// Mock implementation
// ============================================================================

async function mockCreateInvoice(params: CreateInvoiceParams): Promise<LightningInvoice> {
  const paymentHash = generatePaymentHash();
  const bolt11 = generateMockBolt11(params.amountSats);
  const expirySeconds = params.expirySeconds ?? MOCK_EXPIRY_SECONDS;
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  const record: MockInvoiceRecord = {
    bolt11,
    paymentHash,
    amountSats: params.amountSats,
    expiresAt,
    settled: false,
    settledAt: null,
  };

  getMockStore().set(paymentHash, record);

  // Auto-settle after MOCK_SETTLE_MS so the full purchase flow demos without a real wallet.
  // In production, settlement comes from the Breez webhook instead.
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
  if (!record) {
    return { paymentHash, settled: false, settledAt: null };
  }
  return {
    paymentHash,
    settled: record.settled,
    settledAt: record.settledAt?.toISOString() ?? null,
  };
}

async function mockGetWalletBalance(_sellerId: string): Promise<bigint> {
  // Return a plausible demo balance
  return 250_000n; // 250,000 sats
}

/**
 * Dev/demo only: manually settle an invoice by payment hash.
 * Used by the test endpoint POST /api/dev/settle so the demo can be shown
 * without a real Lightning payment.
 */
export function mockSettleInvoice(paymentHash: string): boolean {
  const record = getMockStore().get(paymentHash);
  if (!record || record.settled) return false;
  record.settled = true;
  record.settledAt = new Date();
  return true;
}

// ============================================================================
// Public API
// ============================================================================

interface CreateInvoiceParams {
  sellerLightningAddress: string;
  amountSats: bigint;
  description: string;
  expirySeconds?: number;
}

/**
 * Generate a Lightning invoice payable to a seller's Lightning Address.
 *
 * Mock mode: generates a fake but realistic BOLT-11 + payment hash.
 * Real mode: resolves the LNURL-pay flow via the seller's Breez wallet.
 */
export async function createInvoice(params: CreateInvoiceParams): Promise<LightningInvoice> {
  if (USE_MOCK) return mockCreateInvoice(params);

  // TODO(commerce-v2): real Breez implementation
  // 1. Resolve Lightning Address via /.well-known/lnurlp/<username> to get LNURL metadata
  // 2. POST to the callback URL with amount in millisats
  // 3. Receive bolt11 from the response
  // 4. Parse paymentHash from the BOLT-11
  // 5. Return LightningInvoice shape
  throw new Error('Real Breez createInvoice not implemented — set USE_MOCK_LIGHTNING=true for demo');
}

/**
 * Check whether a Lightning invoice has been settled.
 */
export async function verifyInvoice(paymentHash: string): Promise<InvoiceStatus> {
  if (USE_MOCK) return mockVerifyInvoice(paymentHash);

  // TODO(commerce-v2): query Breez SDK for payment status
  // const sdk = await getSellerSdk(sellerId);
  // const payment = await sdk.getPayment({ paymentHash });
  // return { paymentHash, settled: payment?.status === 'complete', settledAt: ... };
  throw new Error('Real Breez verifyInvoice not implemented');
}

/**
 * Get a seller's current balance in sats from their Breez wallet.
 */
export async function getWalletBalance(sellerId: string): Promise<bigint> {
  if (USE_MOCK) return mockGetWalletBalance(sellerId);

  // TODO(commerce-v2): const sdk = await getSellerSdk(sellerId); return BigInt(await sdk.getInfo().then(i => i.walletInfo.balanceSat));
  throw new Error('Real Breez getWalletBalance not implemented');
}
