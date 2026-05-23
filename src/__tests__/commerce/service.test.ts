import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as commerceService from '@/services/commerce/service';
import * as repository from '@/services/commerce/repository';
import * as lightningClient from '@/services/lightning/breez-client';

vi.mock('@/services/commerce/repository');

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
    vi.mocked(repository.createOrder).mockResolvedValue(mockOrder as never);
    vi.mocked(repository.updateOrderInvoice).mockResolvedValue(undefined as never);
    vi.mocked(repository.findOrderById).mockResolvedValue({
      ...mockOrder,
      invoiceBolt11: 'lnbc1000n1test',
      paymentHash: 'abc123',
    } as never);
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
    expect(lightningClient.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerId: 'seller-id',
        amountSats: expect.any(BigInt),
      }),
    );
  });

  it('throws OUT_OF_STOCK when product stock is 0', async () => {
    const { getProduct } = await import('@/services/catalog/service');
    vi.mocked(getProduct).mockResolvedValueOnce({
      ...(await getProduct('product-id')),
      stock: 0,
    } as never);

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
  });

  it('marks order paid and returns it', async () => {
    vi.mocked(repository.markOrderPaid).mockResolvedValue({
      order: { ...mockOrder, status: 'PAID', paidAt: new Date() },
      wasAlreadyPaid: false,
    } as never);
    vi.mocked(repository.decrementProductStock).mockResolvedValue(undefined as never);
    vi.mocked(repository.updateOrderNostrEventId).mockResolvedValue(undefined as never);
    vi.mocked(repository.findPushSubscriptionsByUserId).mockResolvedValue([] as never);

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
    vi.mocked(repository.findOrderById).mockResolvedValue(mockOrder as never); // status PENDING
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
    const result = await commerceService.getSellerBalance('seller-id');
    expect(result.balanceSats).toBe('250000');
    expect(result.balanceNgn).toMatch(/₦/);
  });
});
