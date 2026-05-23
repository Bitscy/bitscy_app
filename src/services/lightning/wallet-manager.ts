import type { SdkEvent, Config, BreezSdk } from '@breeztech/breez-sdk-spark';
import { connect, defaultConfig } from '@breeztech/breez-sdk-spark';
import { deriveSellerMnemonic } from './mnemonic';

/**
 * Per-seller Breez SDK Spark instance manager.
 *
 * One SDK instance per seller, cached in globalThis so it survives Next.js
 * hot reloads and is shared across API route invocations within the same
 * long-running server process.
 *
 * No WASM init() call needed — the Node.js build loads WASM automatically
 * on the first connect(). Only the browser/web build requires init().
 *
 * Settlement tracking: the event listener populates a per-seller Map so
 * verifyInvoice() can respond instantly without polling Breez.
 */

export interface SettlementRecord {
  settled: boolean;
  settledAt: Date | null;
}

interface WalletEntry {
  sdk: BreezSdk;
  settlementStore: Map<string, SettlementRecord>;
}

declare global {
  // eslint-disable-next-line no-var
  var __breezWallets: Map<string, WalletEntry> | undefined;
}

function getWalletCache(): Map<string, WalletEntry> {
  if (!globalThis.__breezWallets) {
    globalThis.__breezWallets = new Map();
  }
  return globalThis.__breezWallets;
}

/**
 * Extracts the payment hash from a settled payment event.
 * Lightning payments carry it inside details.htlcDetails.paymentHash.
 */
function extractEventPaymentHash(event: SdkEvent): string | null {
  if (event.type !== 'paymentSucceeded') return null;

  const details = event.payment.details;
  if (!details) return null;

  if (details.type === 'lightning') {
    return details.htlcDetails.paymentHash;
  }
  // Spark payments carry payment hash in htlcDetails too (when present)
  if (details.type === 'spark' && details.htlcDetails?.paymentHash) {
    return details.htlcDetails.paymentHash;
  }

  return null;
}

/**
 * Returns the connected Breez SDK instance and settlement store for a seller.
 * Initialises and connects on first call; returns cached entry on subsequent calls.
 */
export async function getSellerWallet(sellerId: string): Promise<WalletEntry> {
  const cache = getWalletCache();
  const existing = cache.get(sellerId);
  if (existing) return existing;

  // Network is "mainnet" or "regtest" (Breez SDK Spark doesn't use "signet")
  const network = process.env.BREEZ_NETWORK === 'regtest' ? 'regtest' : 'mainnet';

  const config: Config = defaultConfig(network);
  if (process.env.BREEZ_API_KEY) {
    config.apiKey = process.env.BREEZ_API_KEY;
  }

  const mnemonic = deriveSellerMnemonic(sellerId);
  const storageBase = process.env.BREEZ_STORAGE_DIR ?? '/data/bitscy-wallets';

  const sdk = await connect({
    config,
    seed: { type: 'mnemonic', mnemonic },
    storageDir: `${storageBase}/${sellerId}`,
  });

  const settlementStore = new Map<string, SettlementRecord>();

  // Register event listener. Breez fires paymentSucceeded when a Lightning
  // invoice settles. EventListener.onEvent must be synchronous per SDK contract.
  await sdk.addEventListener({
    onEvent(event: SdkEvent) {
      const paymentHash = extractEventPaymentHash(event);
      if (paymentHash) {
        settlementStore.set(paymentHash, { settled: true, settledAt: new Date() });
      }
    },
  });

  const entry: WalletEntry = { sdk, settlementStore };
  cache.set(sellerId, entry);
  return entry;
}

/**
 * Seed the settlement store for a newly created invoice so that verifyInvoice()
 * always finds a record before the payment arrives.
 */
export function trackInvoice(sellerId: string, paymentHash: string): void {
  const cache = getWalletCache();
  const entry = cache.get(sellerId);
  if (!entry) return;
  if (!entry.settlementStore.has(paymentHash)) {
    entry.settlementStore.set(paymentHash, { settled: false, settledAt: null });
  }
}

/**
 * Check settlement status for a payment hash across all cached seller wallets.
 */
export function findSettlement(paymentHash: string): SettlementRecord | null {
  const cache = getWalletCache();
  for (const entry of cache.values()) {
    const record = entry.settlementStore.get(paymentHash);
    if (record) return record;
  }
  return null;
}
