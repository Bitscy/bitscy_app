/**
 * Platform Breez wallet — singleton that the whole server shares.
 *
 * Architecture: one Breez Liquid wallet owned by Bitscy holds ALL
 * seller sats. Per-seller balances are tracked in the LedgerEntry table.
 *
 * In mock mode (USE_MOCK_LIGHTNING=true) this returns a stub that
 * satisfies callers without touching any real Lightning infrastructure.
 */

const USE_MOCK = process.env.USE_MOCK_LIGHTNING === 'true' || !process.env.BREEZ_API_KEY;

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

export type SdkEventHandler = (event: { type: string; payment?: { paymentHash?: string; amountSat?: number } }) => void;

// ── Mock implementation ───────────────────────────────────────────────────────

let mockBalance = 0n;
const mockHandlers: SdkEventHandler[] = [];
const mockSettled = new Set<string>();

function mockPlatformWallet() {
  return {
    balanceSat: mockBalance,
    pendingSendSat: 0n,
    pendingReceiveSat: 0n,
  };
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
        h({ type: 'paymentSucceeded', payment: { paymentHash, amountSat: Number(amountSats) } }),
      );
    }
  }, 30_000);

  void description; // used in real impl
  return { bolt11, paymentHash, expiresAt };
}

async function mockSendPayment(bolt11: string): Promise<void> {
  // Mock: parse amount from bolt11 "lnbc<sats>n1..." pattern.
  const match = bolt11.match(/^lnbc(\d+)n/);
  const sats = match ? BigInt(match[1]!) : 1000n;
  if (mockBalance < sats) throw new Error('Insufficient mock platform wallet balance');
  mockBalance -= sats;
}

// ── Real implementation (Breez SDK Liquid) ────────────────────────────────────

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
    process.env.BREEZ_NETWORK === 'mainnet' ? breez.LiquidNetwork.Mainnet : breez.LiquidNetwork.Testnet,
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
 * Records the paymentHash for settlement tracking.
 */
export async function createPlatformInvoice(
  amountSats: bigint,
  description: string,
): Promise<CreatedInvoice> {
  if (USE_MOCK) return mockCreateInvoice(amountSats, description);

  const sdk = await getRealSdk();
  const response = await sdk.receivePayment({
    prepareResponse: await sdk.prepareReceivePayment({
      paymentMethod: { type: 'lightning' },
      amount: { type: 'bitcoin', payerAmountSat: Number(amountSats) },
    }),
    description,
  });

  const bolt11: string = response.destination;
  // Extract payment hash from bolt11 via the existing bolt11 decoder.
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

  const sdk = await getRealSdk();
  const prepared = await sdk.prepareSendPayment({
    destination: bolt11,
  });
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

  const sdk = await getRealSdk();
  await sdk.addEventListener({
    onEvent(event: { type: string }) {
      // SDK contract: onEvent must be synchronous.
      handler(event as Parameters<typeof handler>[0]);
    },
  });
}
