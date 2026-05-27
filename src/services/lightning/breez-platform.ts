/**
 * Platform Lightning wallet — singleton that the whole server shares.
 *
 * Three backends, selected by env vars:
 *
 *   USE_MOCK_LIGHTNING=true          → mock (auto-settles, no real node)
 *   BREEZ_NETWORK=mainnet            → Breez SDK Liquid (real mainnet Lightning)
 *   BREEZ_NETWORK=testnet (default)  → Breez SDK Liquid (testnet Lightning)
 *   BREEZ_NETWORK=signet             → LNBits REST API (LNBITS_URL + LNBITS_ADMIN_KEY)
 *
 * Architecture: one platform wallet receives ALL buyer payments. Per-seller
 * balances are tracked in the LedgerEntry table, not in per-seller wallets.
 */

const BREEZ_NETWORK = process.env.BREEZ_NETWORK ?? 'testnet';
const USE_MOCK = process.env.USE_MOCK_LIGHTNING === 'true';
const USE_LNBITS = !USE_MOCK && BREEZ_NETWORK !== 'mainnet' && BREEZ_NETWORK !== 'testnet';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface WalletInfo {
  balanceSat: bigint;
  pendingSendSat: bigint;
  pendingReceiveSat: bigint;
}

export interface CreatedInvoice {
  bolt11: string;
  paymentHash: string;
  expiresAt: Date;
}

// SDK 0.12.x event shape: { type, details: Payment }
// Payment.details is PaymentDetails — for Lightning payments it has paymentHash.
export type SdkEventHandler = (event: {
  type: string;
  details?: {
    amountSat?: number;
    details?: { type?: string; paymentHash?: string };
  };
}) => void;

// ── Mock implementation ───────────────────────────────────────────────────────

let mockBalance = 0n;
const mockHandlers: SdkEventHandler[] = [];
const mockSettled = new Set<string>();

function mockPlatformWallet() {
  return { balanceSat: mockBalance, pendingSendSat: 0n, pendingReceiveSat: 0n };
}

async function mockCreateInvoice(amountSats: bigint, description: string): Promise<CreatedInvoice> {
  const paymentHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const bolt11 = `lnbc${amountSats}n1mock_${paymentHash.slice(0, 8)}`;
  const expiresAt = new Date(Date.now() + 3600_000);

  // Auto-settle after 30s in mock mode so the UI flow completes in demos.
  setTimeout(() => {
    if (!mockSettled.has(paymentHash)) {
      mockSettled.add(paymentHash);
      mockBalance += amountSats;
      mockHandlers.forEach((h) =>
        h({ type: 'paymentSucceeded', details: { amountSat: Number(amountSats), details: { type: 'lightning', paymentHash } } }),
      );
    }
  }, 30_000);

  void description;
  return { bolt11, paymentHash, expiresAt };
}

async function mockSendPayment(bolt11: string): Promise<void> {
  const match = bolt11.match(/^lnbc(\d+)n/);
  const sats = match ? BigInt(match[1]!) : 1000n;
  if (mockBalance < sats) throw new Error('Insufficient mock platform wallet balance');
  mockBalance -= sats;
}

// ── LNBits implementation (testnet) ──────────────────────────────────────────

async function getLnbits() {
  return import('./lnbits-platform');
}

// ── Breez SDK Liquid implementation (mainnet) ─────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sdkInstance: any | null = null;

async function getRealSdk() {
  if (sdkInstance) return sdkInstance;

  // Dynamic import so the WASM module only loads when needed.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const breez = require('@breeztech/breez-sdk-liquid/node');

  const mnemonic = process.env.PLATFORM_BREEZ_MNEMONIC;
  if (!mnemonic) throw new Error('PLATFORM_BREEZ_MNEMONIC env var is required');

  const config = breez.defaultConfig(
    process.env.BREEZ_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
    process.env.BREEZ_API_KEY ?? '',
  );

  const storageDir = process.env.BREEZ_STORAGE_DIR ?? '/data/bitscy-platform';
  config.workingDir = `${storageDir}/platform`;

  sdkInstance = await breez.connect({ mnemonic, config });
  return sdkInstance;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Connect to (or retrieve the cached) platform wallet.
 * Idempotent — multiple callers get the same instance.
 */
export async function connectPlatformWallet(): Promise<WalletInfo> {
  if (USE_MOCK) return mockPlatformWallet();
  if (USE_LNBITS) return (await getLnbits()).lnbitsGetWalletInfo();

  const sdk = await getRealSdk();
  const info = await sdk.getInfo();
  return {
    balanceSat: BigInt(info.walletInfo.balanceSat),
    pendingSendSat: BigInt(info.walletInfo.pendingSendSat),
    pendingReceiveSat: BigInt(info.walletInfo.pendingReceiveSat),
  };
}

/**
 * Generate a BOLT-11 invoice on the platform wallet.
 */
export async function createPlatformInvoice(
  amountSats: bigint,
  description: string,
): Promise<CreatedInvoice> {
  if (USE_MOCK) return mockCreateInvoice(amountSats, description);
  if (USE_LNBITS) return (await getLnbits()).lnbitsCreateInvoice(amountSats, description);

  const sdk = await getRealSdk();
  const asciiDescription = description.replace(/[^\x00-\x7F]/g, '');
  const response = await sdk.receivePayment({
    prepareResponse: await sdk.prepareReceivePayment({
      paymentMethod: 'bolt11Invoice',
      amount: { type: 'bitcoin', payerAmountSat: Number(amountSats) },
    }),
    description: asciiDescription,
  });

  const bolt11: string = response.destination;
  const { extractPaymentHash } = await import('./bolt11');
  const paymentHash = extractPaymentHash(bolt11);
  const expiresAt = new Date(Date.now() + 3600_000);

  return { bolt11, paymentHash, expiresAt };
}

/**
 * Send a Lightning payment from the platform wallet (used for withdrawals).
 * Throws on failure — caller must NOT write the ledger debit until this resolves.
 */
export async function sendPlatformPayment(bolt11: string): Promise<void> {
  if (USE_MOCK) return mockSendPayment(bolt11);
  if (USE_LNBITS) return (await getLnbits()).lnbitsSendPayment(bolt11);

  const sdk = await getRealSdk();
  const prepared = await sdk.prepareSendPayment({ destination: bolt11 });
  await sdk.sendPayment({ prepareResponse: prepared });
}

/**
 * Register a handler for incoming payment events.
 * Call once at server boot; handler receives every paymentSucceeded event.
 */
export async function addEventHandler(handler: SdkEventHandler): Promise<void> {
  if (USE_MOCK) {
    mockHandlers.push(handler);
    return;
  }
  if (USE_LNBITS) {
    return (await getLnbits()).lnbitsAddEventHandler(handler);
  }

  const sdk = await getRealSdk();
  await sdk.addEventListener({
    onEvent(event: { type: string }) {
      handler(event as Parameters<typeof handler>[0]);
    },
  });
}
