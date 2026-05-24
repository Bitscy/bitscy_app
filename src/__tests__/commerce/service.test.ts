import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as commerceService from '@/services/commerce/service';
import * as repository from '@/services/commerce/repository';
import * as pendingPayments from '@/services/commerce/pending-payments';
import * as ledger from '@/services/commerce/ledger';
import * as coingecko from '@/services/pricing/coingecko';
import * as breezPlatform from '@/services/lightning/breez-platform';
import * as catalogService from '@/services/catalog/service';
import * as nostrSigning from '@/services/nostr/signing';

vi.mock('@/services/commerce/repository');
vi.mock('@/services/commerce/pending-payments');
vi.mock('@/services/commerce/ledger');
vi.mock('@/services/pricing/coingecko');
vi.mock('@/services/lightning/breez-platform');
vi.mock('@/services/catalog/service');
vi.mock('@/services/nostr/client');
vi.mock('@/services/nostr/signing');
vi.mock('@/lib/push');

const mockProduct = {
  id: 'product-id',
  sellerId: 'seller-id',
  sellerUsername: 'adaeze',
  sellerDisplayName: 'Adaeze',
  title: 'Adire Textile',
  description: 'Beautiful piece',
  priceSats: '10000',
  priceNgnDisplay: '₦14,500',
  shippingSats: '500',
  category: 'textiles' as const,
  images: ['https://res.cloudinary.com/test/image/upload/t.jpg'],
  isDigital: false,
  stock: 5,
  status: 'ACTIVE' as const,
  nostrEventId: null,
  createdAt: new Date().toISOString(),
};

const mockSeller = {
  id: 'seller-id',
  username: 'adaeze',
  npub: 'npub1seller',
  lightningAddress: 'adaeze@bitscy.com',
  displayName: 'Adaeze',
  avatar: null,
};

const mockOrder = {
  id: 'order-123',
  buyerId: 'buyer-id',
  sellerId: 'seller-id',
  totalSats: 10500n,
  shippingSats: 500n,
  status: 'PENDING',
  invoiceBolt11: null,
  paymentHash: null,
  encryptedShipping: null,
  nostrEventId: null,
  shippingNote: null,
  createdAt: new Date(),
  paidAt: null,
  shippedAt: null,
  buyer: { npub: 'npub1buyer', id: 'buyer-id' },
  seller: { npub: 'npub1seller', id: 'seller-id' },
  items: [
    {
      id: 'item-1',
      productId: 'product-id',
      quantity: 1,
      priceSats: 10000n,
      product: {
        title: 'Adire Textile',
        images: ['https://res.cloudinary.com/test/image/upload/t.jpg'],
      },
    },
  ],
};

describe('createOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catalogService.getProduct).mockResolvedValue(mockProduct);
    vi.mocked(catalogService.getSellerById).mockResolvedValue(mockSeller);
    vi.mocked(repository.createOrder).mockResolvedValue(mockOrder as never);
    vi.mocked(repository.updateOrderInvoice).mockResolvedValue(undefined as never);
    vi.mocked(repository.findOrderById).mockResolvedValue({
      ...mockOrder,
      invoiceBolt11: 'lnbc10500n1test',
      paymentHash: 'abc123',
    } as never);
    vi.mocked(breezPlatform.createPlatformInvoice).mockResolvedValue({
      bolt11: 'lnbc10500n1test',
      paymentHash: 'abc123',
      expiresAt: new Date(Date.now() + 3600_000),
    });
    vi.mocked(pendingPayments.trackPendingPayment).mockResolvedValue(undefined);
    vi.mocked(coingecko.satsToNgnLive).mockResolvedValue(15225n);
  });

  it('creates an order and returns it with an invoice', async () => {
    const order = await commerceService.createOrder({
      productId: 'product-id',
      quantity: 1,
      buyerId: 'buyer-id',
      buyerNpub: 'npub1buyer',
    });

    expect(order.id).toBe('order-123');
    expect(order.status).toBe('PENDING');
    expect(repository.createOrder).toHaveBeenCalledOnce();
    expect(breezPlatform.createPlatformInvoice).toHaveBeenCalledWith(
      10500n,
      expect.stringContaining('order-123'),
    );
    expect(pendingPayments.trackPendingPayment).toHaveBeenCalledWith(
      expect.objectContaining({ paymentHash: 'abc123', sellerId: 'seller-id' }),
    );
  });

  it('throws OUT_OF_STOCK when product stock is 0', async () => {
    vi.mocked(catalogService.getProduct).mockResolvedValueOnce({ ...mockProduct, stock: 0 });

    await expect(
      commerceService.createOrder({
        productId: 'product-id',
        quantity: 1,
        buyerId: 'buyer-id',
        buyerNpub: 'npub1buyer',
      }),
    ).rejects.toMatchObject({ code: 'OUT_OF_STOCK' });
  });
});

describe('markPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(coingecko.getBtcNgnRate).mockResolvedValue({
      ratePerBtc: 145000000n,
      recordedAt: new Date().toISOString(),
      stale: false,
    });
    vi.mocked(coingecko.satsToNgnLive).mockResolvedValue(15225n);
    vi.mocked(pendingPayments.findByPaymentHash).mockResolvedValue({
      paymentHash: 'abc123',
      sellerId: 'seller-id',
      amountSats: 10500n,
      orderId: 'order-123',
      description: 'Order #order-123',
      expiresAt: new Date(Date.now() + 3600_000),
      createdAt: new Date(),
    } as never);
    vi.mocked(pendingPayments.deletePendingPayment).mockResolvedValue(undefined);
    vi.mocked(ledger.recordEntry).mockResolvedValue(undefined as never);
    vi.mocked(repository.findPushSubscriptionsByUserId).mockResolvedValue([] as never);
    vi.mocked(nostrSigning.signEventWithSystemKey).mockReturnValue({
      id: 'nostr-event-id',
      sig: 'sig',
      pubkey: 'pubkey',
      kind: 30019,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: '',
    } as never);
  });

  it('marks order paid and returns it', async () => {
    vi.mocked(repository.markOrderPaid).mockResolvedValue({
      order: { ...mockOrder, status: 'PAID', paidAt: new Date() },
      wasAlreadyPaid: false,
    } as never);
    vi.mocked(repository.decrementProductStock).mockResolvedValue(undefined as never);
    vi.mocked(repository.updateOrderNostrEventId).mockResolvedValue(undefined as never);

    const order = await commerceService.markPaid('abc123');
    expect(order.status).toBe('PAID');
  });

  it('is idempotent when already paid', async () => {
    vi.mocked(repository.markOrderPaid).mockResolvedValue({
      order: { ...mockOrder, status: 'PAID', paidAt: new Date() },
      wasAlreadyPaid: true,
    } as never);

    const order = await commerceService.markPaid('abc123');
    expect(order.status).toBe('PAID');
    // No side effects (Nostr, push) when wasAlreadyPaid
    expect(repository.decrementProductStock).not.toHaveBeenCalled();
  });
});

describe('getOrderForUser', () => {
  it('returns order when requester is the buyer', async () => {
    vi.mocked(repository.findOrderById).mockResolvedValue(mockOrder as never);
    const order = await commerceService.getOrderForUser('order-123', 'buyer-id');
    expect(order.id).toBe('order-123');
  });

  it('throws FORBIDDEN when requester is neither buyer nor seller', async () => {
    vi.mocked(repository.findOrderById).mockResolvedValue(mockOrder as never);
    await expect(commerceService.getOrderForUser('order-123', 'stranger-id')).rejects.toMatchObject(
      { code: 'FORBIDDEN' },
    );
  });

  it('throws NOT_FOUND for missing order', async () => {
    vi.mocked(repository.findOrderById).mockResolvedValue(null as never);
    await expect(commerceService.getOrderForUser('missing', 'buyer-id')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('markShipped', () => {
  it('throws VALIDATION_ERROR when order is not PAID', async () => {
    vi.mocked(repository.findOrderById).mockResolvedValue(mockOrder as never);
    await expect(commerceService.markShipped('order-123', 'seller-id')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws FORBIDDEN when caller is not the seller', async () => {
    vi.mocked(repository.findOrderById).mockResolvedValue({
      ...mockOrder,
      status: 'PAID',
    } as never);
    await expect(
      commerceService.markShipped('order-123', 'wrong-seller'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('getSellerBalance', () => {
  it('returns balanceSats and balanceNgn', async () => {
    vi.mocked(ledger.getBalance).mockResolvedValue(250000n);
    vi.mocked(coingecko.getBtcNgnRate).mockResolvedValue({
      ratePerBtc: 145000000n,
      recordedAt: new Date().toISOString(),
      stale: false,
    });
    const result = await commerceService.getSellerBalance('seller-id');
    expect(result.balanceSats).toBe('250000');
    expect(result.balanceNgn).toMatch(/₦/);
  });
});
