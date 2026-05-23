import { describe, it, expect, vi } from 'vitest';

// Unmock so we test the real implementation, not the setup.ts stub.
vi.unmock('@/services/lightning/breez-client');
vi.unmock('@/services/lightning/wallet-manager');

// Force mock mode — no real Breez API key in tests.
process.env.USE_MOCK_LIGHTNING = 'true';
delete process.env.BREEZ_API_KEY;

const { createInvoice, verifyInvoice, getWalletBalance, mockSettleInvoice } =
  await import('@/services/lightning/breez-client');

const BASE_PARAMS = {
  sellerId: 'seller-id',
  sellerLightningAddress: 'adaeze@bitscy.com',
  amountSats: 10_000n,
  description: 'Test order',
};

describe('createInvoice (mock mode)', () => {
  it('returns a LightningInvoice shape', async () => {
    const invoice = await createInvoice(BASE_PARAMS);
    expect(invoice.bolt11).toMatch(/^lnbc/);
    expect(invoice.paymentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(invoice.amountSats).toBe('10000');
    expect(invoice.expiresAt).toMatch(/^\d{4}-/); // ISO date string
  });

  it('each call produces a unique payment hash', async () => {
    const a = await createInvoice(BASE_PARAMS);
    const b = await createInvoice(BASE_PARAMS);
    expect(a.paymentHash).not.toBe(b.paymentHash);
  });
});

describe('verifyInvoice (mock mode)', () => {
  it('returns unsettled for an unknown hash', async () => {
    const status = await verifyInvoice('nonexistent');
    expect(status.settled).toBe(false);
    expect(status.settledAt).toBeNull();
  });

  it('returns settled after mockSettleInvoice', async () => {
    const invoice = await createInvoice({
      ...BASE_PARAMS,
      amountSats: 500n,
      description: 'settle test',
    });

    const before = await verifyInvoice(invoice.paymentHash);
    expect(before.settled).toBe(false);

    const settled = mockSettleInvoice(invoice.paymentHash);
    expect(settled).toBe(true);

    const after = await verifyInvoice(invoice.paymentHash);
    expect(after.settled).toBe(true);
    expect(after.settledAt).toBeTruthy();
  });

  it('mockSettleInvoice returns false for already-settled invoice', async () => {
    const invoice = await createInvoice({ ...BASE_PARAMS, description: 'double settle' });
    mockSettleInvoice(invoice.paymentHash);
    expect(mockSettleInvoice(invoice.paymentHash)).toBe(false); // already settled
  });
});

describe('getWalletBalance (mock mode)', () => {
  it('returns a positive bigint', async () => {
    const balance = await getWalletBalance('seller-id');
    expect(typeof balance).toBe('bigint');
    expect(balance).toBeGreaterThan(0n);
  });
});
