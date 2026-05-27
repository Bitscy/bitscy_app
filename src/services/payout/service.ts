import type { PayoutResult, BankAccount } from '@/types/shared';
import { initiatePayout, getStatus } from './bitnob-client';

export async function initiatePayoutRequest(
  amountSats: bigint,
  bankAccountId: string,
  bankAccount: Pick<BankAccount, 'accountName' | 'accountNumber' | 'bankName'>,
): Promise<PayoutResult> {
  const fullAccount: BankAccount = {
    id: bankAccountId,
    bankName: bankAccount.bankName,
    accountNumber: bankAccount.accountNumber,
    accountName: bankAccount.accountName,
    isDefault: false,
  };
  return initiatePayout(amountSats, fullAccount);
}

export async function getPayoutStatusById(payoutId: string): Promise<PayoutResult | null> {
  return getStatus(payoutId);
}
