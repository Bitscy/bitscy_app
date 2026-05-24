import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Commerce repository — DB access layer.
 *
 * Owned by the Commerce Engineer. Only service.ts should call these functions.
 */

// ============================================================================
// Orders
// ============================================================================

const orderWithRelations = {
  items: {
    include: {
      product: {
        select: { id: true, title: true, images: true },
      },
    },
  },
  buyer: { select: { id: true, npub: true } },
  seller: { select: { id: true, npub: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof orderWithRelations;
}>;

export async function findOrderById(id: string): Promise<OrderWithRelations | null> {
  return prisma.order.findUnique({
    where: { id },
    include: orderWithRelations,
  });
}

export async function findOrderByPaymentHash(
  paymentHash: string,
): Promise<OrderWithRelations | null> {
  return prisma.order.findUnique({
    where: { paymentHash },
    include: orderWithRelations,
  });
}

export async function listOrdersByBuyer(
  buyerId: string,
  page: number,
  pageSize: number,
): Promise<{ items: OrderWithRelations[]; total: number }> {
  const where: Prisma.OrderWhereInput = { buyerId };
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderWithRelations,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total };
}

export async function listOrdersBySeller(
  sellerId: string,
  page: number,
  pageSize: number,
): Promise<{ items: OrderWithRelations[]; total: number }> {
  const where: Prisma.OrderWhereInput = { sellerId };
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderWithRelations,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total };
}

export async function createOrder(data: Prisma.OrderCreateInput): Promise<OrderWithRelations> {
  return prisma.order.create({
    data,
    include: orderWithRelations,
  });
}

/**
 * Atomically transition PENDING → PAID.
 * Returns the updated order, or null if the order was already processed (idempotent).
 */
export async function markOrderPaid(
  paymentHash: string,
): Promise<{ order: OrderWithRelations; wasAlreadyPaid: boolean }> {
  const updated = await prisma.order.updateMany({
    where: { paymentHash, status: 'PENDING' },
    data: { status: 'PAID', paidAt: new Date() },
  });

  const order = await findOrderByPaymentHash(paymentHash);
  if (!order) throw new Error(`Order not found for payment hash: ${paymentHash}`);

  return { order, wasAlreadyPaid: updated.count === 0 };
}

/**
 * Atomically decrement product stock after payment.
 * Uses WHERE stock > 0 guard.
 */
export async function decrementProductStock(productId: string, quantity: number): Promise<void> {
  await prisma.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
}

export async function markOrderShipped(
  orderId: string,
  shippingNote?: string,
): Promise<OrderWithRelations> {
  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'SHIPPED', shippedAt: new Date(), shippingNote: shippingNote ?? null },
    include: orderWithRelations,
  });
}

export async function updateOrderInvoice(
  orderId: string,
  invoiceBolt11: string,
  paymentHash: string,
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { invoiceBolt11, paymentHash },
  });
}

export async function updateOrderNostrEventId(
  orderId: string,
  nostrEventId: string,
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { nostrEventId },
  });
}

// ============================================================================
// Push Subscriptions
// ============================================================================

export async function findPushSubscriptionsByUserId(userId: string) {
  return prisma.pushSubscription.findMany({ where: { userId } });
}

export async function upsertPushSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh, auth },
    update: { userId, p256dh, auth },
  });
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

// ============================================================================
// Payouts & Bank Accounts
// ============================================================================

export async function findBankAccountById(id: string) {
  return prisma.bankAccount.findUnique({ where: { id } });
}

export async function listBankAccountsByUser(userId: string) {
  return prisma.bankAccount.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

export async function createPayout(data: Prisma.PayoutCreateInput) {
  return prisma.payout.create({ data });
}

export async function findPayoutById(id: string) {
  return prisma.payout.findUnique({
    where: { id },
    include: {
      user: { select: { id: true } },
    },
  });
}

export async function findPayoutByExternalId(externalId: string) {
  return prisma.payout.findFirst({
    where: { externalId },
  });
}

export async function updatePayoutStatus(
  id: string,
  status: 'PENDING' | 'SUCCESS' | 'FAILED',
  completedAt?: Date,
) {
  return prisma.payout.update({
    where: { id },
    data: { status, completedAt: completedAt ?? null },
  });
}
