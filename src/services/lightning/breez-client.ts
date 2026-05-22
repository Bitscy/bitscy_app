import type { LightningInvoice, InvoiceStatus } from '@/types/shared';

/**
 * Breez SDK wrapper for Lightning operations.
 *
 * Owned by the Commerce Engineer. Wraps @breeztech/breez-sdk-liquid.
 *
 * This is a TODO skeleton — the actual SDK initialization happens during
 * implementation. Read the architecture doc and Breez docs before filling it in.
 *
 * Key responsibilities:
 *   - Initialize seller wallets on signup
 *   - Generate invoices to a seller's Lightning Address
 *   - Verify invoice settlement
 *   - Get seller wallet balance
 */

// TODO(commerce): import the real SDK once installed
// import init, { connect, ... } from '@breeztech/breez-sdk-liquid';

interface CreateInvoiceParams {
  sellerLightningAddress: string;
  amountSats: bigint;
  description: string;
  expirySeconds?: number;
}

/**
 * Generate a Lightning invoice payable to a seller's Lightning Address.
 *
 * In v1: routes through the seller's Breez wallet via LNURL-pay flow.
 *
 * TODO(commerce): Real implementation.
 * Pseudocode:
 *   1. Resolve the Lightning Address via LNURL-pay (GET /.well-known/lnurlp/<user>)
 *   2. Call the callback URL with the amount
 *   3. Receive the BOLT-11 invoice
 *   4. Parse and return
 */
export async function createInvoice(_params: CreateInvoiceParams): Promise<LightningInvoice> {
  throw new Error('NOT_IMPLEMENTED: createInvoice — see TODO(commerce)');
}

/**
 * Check whether an invoice has settled.
 *
 * TODO(commerce): Real implementation.
 * Query the Breez SDK for the current state of the payment hash.
 */
export async function verifyInvoice(_paymentHash: string): Promise<InvoiceStatus> {
  throw new Error('NOT_IMPLEMENTED: verifyInvoice — see TODO(commerce)');
}

/**
 * Get a seller's current balance in sats from their Breez wallet.
 *
 * TODO(commerce): Real implementation.
 * Read from the seller's wallet instance. Cache for 10 seconds to avoid hammering.
 */
export async function getWalletBalance(_sellerId: string): Promise<bigint> {
  throw new Error('NOT_IMPLEMENTED: getWalletBalance — see TODO(commerce)');
}
