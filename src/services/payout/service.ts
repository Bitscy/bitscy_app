import type { PayoutResult } from '@/types/shared';
import { initiatePayout, getPayoutStatus } from './bitnob-mock';

/**
 * Payout service. Public API for naira off-ramp operations.
 *
 * Routes calls to the mock for v1, real Bitnob for v2.
 * Service consumers don't know which is which.
 */

const USE_REAL_BITNOB = false; // v2 flag

export async function initiatePayoutRequest(
  amountSats: bigint,
  bankAccountId: string,
): Promise<PayoutResult> {
  if (USE_REAL_BITNOB) {
    // TODO(v2): const { initiatePayout } = await import('./bitnob-real');
    throw new Error('Real Bitnob not implemented yet — v2');
  }
  return initiatePayout(amountSats, bankAccountId);
}

export async function getPayoutStatusById(payoutId: string): Promise<PayoutResult | null> {
  if (USE_REAL_BITNOB) {
    throw new Error('Real Bitnob not implemented yet — v2');
  }
  return getPayoutStatus(payoutId);
}
