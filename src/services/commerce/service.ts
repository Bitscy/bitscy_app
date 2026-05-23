import type { Order, OrderItem, OrderStatus } from '@/types/shared';
import { ApiError } from '@/lib/api-error';
import { satsToNgn, formatNgn } from '@/lib/currency';
import { sendPushNotification, ExpiredSubscriptionError } from '@/lib/push';
import * as repository from './repository';
import type { OrderWithRelations } from './repository';
import * as catalogService from '@/services/catalog/service';
import * as lightningClient from '@/services/lightning/breez-client';
import * as payoutService from '@/services/payout/service';
import { publishEvent } from '@/services/nostr/client';
import { signEventWithSystemKey } from '@/services/nostr/signing';
import { NOSTR_KINDS } from '@/types/nostr';

/**
 * Commerce service — public API for the full purchase flow.
 *
 * Owned by the Commerce Engineer. API routes call this. This composes
 * repository (DB), Lightning client, Nostr publishing, and push notifications.
 */

// ============================================================================
// Mappers
// ============================================================================

function mapOrderItem(item: OrderWithRelations['items'][number]): OrderItem {
  return {
    id: item.id,
    productId: item.productId,
    productTitle: item.product.title,
    productImage: item.product.images[0] ?? '',
    quantity: item.quantity,
    priceSats: item.priceSats.toString(),
  };
}

function mapOrder(order: OrderWithRelations): Order {
  return {
    id: order.id,
    buyerId: order.buyerId,
    buyerNpub: order.buyer.npub,
    sellerId: order.sellerId,
    sellerNpub: order.seller.npub,
    items: order.items.map(mapOrderItem),
    totalSats: order.totalSats.toString(),
    shippingSats: order.shippingSats.toString(),
    invoiceBolt11: order.invoiceBolt11,
    paymentHash: order.paymentHash,
    status: order.status as OrderStatus,
    shippingNote: order.shippingNote,
    nostrEventId: order.nostrEventId,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    shippedAt: order.shippedAt?.toISOString() ?? null,
  };
}

// ============================================================================
// Order creation
// ============================================================================

export interface CreateOrderParams {
  productId: string;
  quantity: number;
  buyerId: string;
  buyerNpub: string;
  encryptedShipping?: string;
}

export async function createOrder(params: CreateOrderParams): Promise<Order> {
  // buyerNpub stored in User record; accessed via order relations after creation.
  const { productId, quantity, buyerId, encryptedShipping } = params;

  // Use catalog service layer — Commerce does not reach into catalog's repository.
  const product = await catalogService.getProduct(productId);
  if (product.status !== 'ACTIVE') throw new ApiError('OUT_OF_STOCK', 'Product is not available', 409);
  if (product.stock < quantity) throw new ApiError('OUT_OF_STOCK', 'Not enough stock', 409);

  const seller = await catalogService.getSellerById(product.sellerId);
  if (!seller) throw new ApiError('NOT_FOUND', 'Seller not found', 404);

  const priceSatsBig = BigInt(product.priceSats);
  const shippingSatsBig = BigInt(product.shippingSats);
  const totalSats = priceSatsBig * BigInt(quantity) + shippingSatsBig;

  const order = await repository.createOrder({
    buyer: { connect: { id: buyerId } },
    seller: { connect: { id: product.sellerId } },
    totalSats,
    shippingSats: shippingSatsBig,
    encryptedShipping: encryptedShipping ?? null,
    items: {
      create: [
        {
          product: { connect: { id: productId } },
          quantity,
          priceSats: priceSatsBig,
        },
      ],
    },
  });

  // Generate Lightning invoice. Errors leave the order in DB as PENDING;
  // a cleanup job can cancel expired invoices without affecting the order ID.
  const invoice = await lightningClient.createInvoice({
    sellerId: product.sellerId,
    sellerLightningAddress: seller.lightningAddress,
    amountSats: totalSats,
    description: `Bitscy order #${order.id} — ${product.title}`,
  });

  await repository.updateOrderInvoice(order.id, invoice.bolt11, invoice.paymentHash);

  const updatedOrder = await repository.findOrderById(order.id);
  if (!updatedOrder) throw new ApiError('INTERNAL_ERROR', 'Order creation failed', 500);

  return mapOrder(updatedOrder);
}

// ============================================================================
// Payment settlement
// ============================================================================

/**
 * Mark an order paid. Called by both the Breez webhook and the polling endpoint.
 * The atomic WHERE clause means only one caller wins; the other is a no-op.
 */
export async function markPaid(paymentHash: string): Promise<Order> {
  const { order, wasAlreadyPaid } = await repository.markOrderPaid(paymentHash);

  if (!wasAlreadyPaid) {
    // We won the race — publish Nostr event, notify seller, decrement stock.
    for (const item of order.items) {
      await repository.decrementProductStock(item.productId, item.quantity);
    }
    await publishOrderNostrEvent(order);
    await notifySeller(order);
  }

  return mapOrder(order);
}

async function publishOrderNostrEvent(order: OrderWithRelations): Promise<void> {
  try {
    const content = JSON.stringify({
      orderId: order.id,
      items: order.items.map((i: OrderWithRelations['items'][number]) => ({
        productId: i.productId,
        productEventId: null,
        quantity: i.quantity,
        priceSats: i.priceSats.toString(),
      })),
      totalSats: order.totalSats.toString(),
      shippingAddress: order.encryptedShipping ?? null,
      paymentHash: order.paymentHash,
    });

    const template = {
      kind: NOSTR_KINDS.ORDER,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', order.id],
        ['p', order.seller.npub],
      ],
      content,
    };

    const signed = signEventWithSystemKey(template);
    await publishEvent(signed);
    await repository.updateOrderNostrEventId(order.id, signed.id);
  } catch (err) {
    // Nostr publish failure is non-fatal — log and continue.
    console.error('Failed to publish order Nostr event:', err);
  }
}

async function notifySeller(order: OrderWithRelations): Promise<void> {
  const subscriptions = await repository.findPushSubscriptionsByUserId(order.sellerId);
  if (subscriptions.length === 0) return;

  const firstItem = order.items[0];
  const productTitle = firstItem?.product.title ?? 'your item';
  const amountNgn = formatNgn(satsToNgn(order.totalSats));

  const payload = {
    title: 'Sale on Bitscy!',
    body: `You just sold "${productTitle}" for ${amountNgn}`,
    icon: '/icons/icon-192.png',
    url: `/seller/orders/${order.id}`,
  };

  for (const sub of subscriptions) {
    try {
      await sendPushNotification({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload);
    } catch (err) {
      if (err instanceof ExpiredSubscriptionError) {
        await repository.deletePushSubscription(err.endpoint);
      }
    }
  }
}

// ============================================================================
// Order queries
// ============================================================================

export async function getOrderForUser(orderId: string, userId: string): Promise<Order> {
  const order = await repository.findOrderById(orderId);
  if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);
  if (order.buyerId !== userId && order.sellerId !== userId) {
    throw new ApiError('FORBIDDEN', 'Access denied', 403);
  }
  return mapOrder(order);
}

export async function listOrdersForUser(
  userId: string,
  role: 'BUYER' | 'SELLER',
  page: number,
  pageSize: number,
): Promise<{ items: Order[]; total: number; page: number; pageSize: number }> {
  const { items, total } =
    role === 'SELLER'
      ? await repository.listOrdersBySeller(userId, page, pageSize)
      : await repository.listOrdersByBuyer(userId, page, pageSize);

  return { items: items.map(mapOrder), total, page, pageSize };
}

export async function checkInvoiceStatus(
  paymentHash: string,
  requestingUserId: string,
): Promise<{ settled: boolean; order: Order | null }> {
  const status = await lightningClient.verifyInvoice(paymentHash);

  if (status.settled) {
    const order = await markPaid(paymentHash);
    // Verify the requester is the buyer for this order
    const raw = await repository.findOrderByPaymentHash(paymentHash);
    if (raw && raw.buyerId !== requestingUserId && raw.sellerId !== requestingUserId) {
      throw new ApiError('FORBIDDEN', 'Access denied', 403);
    }
    return { settled: true, order };
  }

  return { settled: false, order: null };
}

// ============================================================================
// Shipping
// ============================================================================

export async function markShipped(
  orderId: string,
  sellerId: string,
  shippingNote?: string,
): Promise<Order> {
  const order = await repository.findOrderById(orderId);
  if (!order) throw new ApiError('NOT_FOUND', 'Order not found', 404);
  if (order.sellerId !== sellerId) throw new ApiError('FORBIDDEN', 'Access denied', 403);
  if (order.status !== 'PAID') {
    throw new ApiError('VALIDATION_ERROR', 'Order must be PAID before it can be shipped', 400);
  }
  const updated = await repository.markOrderShipped(orderId, shippingNote);
  return mapOrder(updated);
}

// ============================================================================
// Wallet balance
// ============================================================================

export async function getSellerBalance(sellerId: string): Promise<{ balanceSats: string; balanceNgn: string }> {
  const balanceSats = await lightningClient.getWalletBalance(sellerId);
  return {
    balanceSats: balanceSats.toString(),
    balanceNgn: formatNgn(satsToNgn(balanceSats)),
  };
}

// ============================================================================
// Payouts
// ============================================================================

export async function initiatePayout(
  sellerId: string,
  amountSats: bigint,
  bankAccountId: string,
): Promise<ReturnType<typeof payoutService.initiatePayoutRequest>> {
  const account = await repository.findBankAccountById(bankAccountId);
  if (!account || account.userId !== sellerId) {
    throw new ApiError('NOT_FOUND', 'Bank account not found', 404);
  }

  const result = await payoutService.initiatePayoutRequest(amountSats, bankAccountId, {
    accountName: account.accountName,
    accountNumber: account.accountNumber,
    bankName: account.bankName,
  });

  // Persist the payout record for history and status polling
  await repository.createPayout({
    user: { connect: { id: sellerId } },
    bankAccountId,
    amountSats,
    amountNgn: satsToNgn(amountSats),
    status: 'PENDING',
    externalId: result.payoutId,
  });

  return result;
}

// ============================================================================
// Push notification subscriptions
// ============================================================================

export async function subscribeToNotifications(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
): Promise<void> {
  await repository.upsertPushSubscription(userId, endpoint, p256dh, auth);
}
