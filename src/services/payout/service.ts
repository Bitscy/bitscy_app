import type { PayoutResult } from '@/types/shared';
import { initiatePayout, getPayoutStatus } from './bitnob-mock';
import type { BitnobBankAccountDetails } from './bitnob-real';

export type { BitnobBankAccountDetails };

/**
 * Payout service. Public API for naira off-ramp operations.
 *
 * Routes calls to the mock for v1, real Bitnob for v2.
 * Service consumers don't know which is which.
 */

const USE_REAL_BITNOB = process.env.USE_REAL_BITNOB === 'true';

export async function initiatePayoutRequest(
  amountSats: bigint,
  bankAccountId: string,
  bankAccount: BitnobBankAccountDetails,
): Promise<PayoutResult> {
  if (USE_REAL_BITNOB) {
    const real = await import('./bitnob-real');
    return real.initiatePayout(amountSats, bankAccountId, bankAccount);
  }
  return initiatePayout(amountSats, bankAccountId);
}

export async function getPayoutStatusById(payoutId: string): Promise<PayoutResult | null> {
  if (USE_REAL_BITNOB) {
    const real = await import('./bitnob-real');
    return real.getPayoutStatus(payoutId);
  }
  return getPayoutStatus(payoutId);
}
