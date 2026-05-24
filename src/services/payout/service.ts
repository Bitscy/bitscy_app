import type { PayoutResult, BankAccount } from '@/types/shared';
import { initiatePayout as mockInitiatePayout, getPayoutStatus as mockGetStatus } from './bitnob-mock';


const USE_REAL_BITNOB = process.env.USE_REAL_BITNOB === 'true';

export interface BankAccountDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
}

export async function initiatePayoutRequest(
  amountSats: bigint,
  bankAccountId: string,
  bankAccount: BankAccountDetails,
): Promise<PayoutResult> {
  if (USE_REAL_BITNOB) {
    const client = await import('./bitnob-client');
    const fullAccount: BankAccount = {
      id: bankAccountId,
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      isDefault: false,
    };
    return client.initiatePayout(amountSats, fullAccount);
  }
  return mockInitiatePayout(amountSats, bankAccountId);
}

export async function getPayoutStatusById(payoutId: string): Promise<PayoutResult | null> {
  if (USE_REAL_BITNOB) {
    const client = await import('./bitnob-client');
    return client.getStatus(payoutId);
  }
  return mockGetStatus(payoutId);
}
