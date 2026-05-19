import type { PayoutResult, PayoutStatus } from '@/types/shared';
import { satsToNgn } from '@/lib/currency';

/**
 * Bitnob mock service.
 *
 * Owned by the Commerce Engineer. Implements the same interface a real Bitnob
 * client would, but never makes real API calls. Returns realistic success on
 * realistic timing so the UI flow is identical to production.
 *
 * In v2, swap this for `bitnob-real.ts` with no other code changes.
 */

interface MockPayoutRecord {
  id: string;
  amountSats: bigint;
  amountNgn: bigint;
  status: PayoutStatus;
  createdAt: number;
  completedAt: number | null;
}

// In-memory mock state. Resets on server restart, which is fine for demo.
const mockPayouts = new Map<string, MockPayoutRecord>();

const MOCK_COMPLETION_MS = 3000;

/**
 * Initiate a payout from sats balance to a Nigerian bank account.
 * Returns immediately with PENDING status; the mock transitions to SUCCESS
 * after MOCK_COMPLETION_MS milliseconds.
 */
export async function initiatePayout(
  amountSats: bigint,
  _bankAccountId: string,
): Promise<PayoutResult> {
  const payoutId = `mock_${crypto.randomUUID()}`;
  const amountNgn = satsToNgn(amountSats);

  const record: MockPayoutRecord = {
    id: payoutId,
    amountSats,
    amountNgn,
    status: 'PENDING',
    createdAt: Date.now(),
    completedAt: null,
  };

  mockPayouts.set(payoutId, record);

  // Simulate async completion. In real Bitnob this is a webhook.
  setTimeout(() => {
    const current = mockPayouts.get(payoutId);
    if (current && current.status === 'PENDING') {
      current.status = 'SUCCESS';
      current.completedAt = Date.now();
    }
  }, MOCK_COMPLETION_MS);

  return {
    payoutId,
    status: 'PENDING',
    amountSats: amountSats.toString(),
    amountNgn: amountNgn.toString(),
    etaSeconds: MOCK_COMPLETION_MS / 1000,
  };
}

/**
 * Get the current status of a payout.
 */
export async function getPayoutStatus(payoutId: string): Promise<PayoutResult | null> {
  const record = mockPayouts.get(payoutId);
  if (!record) return null;

  return {
    payoutId: record.id,
    status: record.status,
    amountSats: record.amountSats.toString(),
    amountNgn: record.amountNgn.toString(),
    etaSeconds: 0,
  };
}
