import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Catalog repository — DB access layer.
 *
 * Owned by the Catalog Engineer. Only service.ts should call these functions.
 * If you find yourself reaching for these from an API route, you're skipping
 * the service layer. Stop.
 */

// ============================================================================
// Users
// ============================================================================

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username } });
}

export async function findUserByNpub(npub: string) {
  return prisma.user.findUnique({ where: { npub } });
}

export async function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({ data });
}

// ============================================================================
// Products
// ============================================================================

export async function findProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { seller: { select: { id: true, username: true, displayName: true } } },
  });
}

export async function listActiveProducts(params: {
  page: number;
  pageSize: number;
  category?: string;
  sellerId?: string;
}) {
  const { page, pageSize, category, sellerId } = params;
  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
    ...(category && { category }),
    ...(sellerId && { sellerId }),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { seller: { select: { id: true, username: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total };
}

export async function createProduct(data: Prisma.ProductCreateInput) {
  return prisma.product.create({
    data,
    include: { seller: { select: { id: true, username: true, displayName: true } } },
  });
}

export async function updateProduct(id: string, data: Prisma.ProductUpdateInput) {
  return prisma.product.update({
    where: { id },
    data,
    include: { seller: { select: { id: true, username: true, displayName: true } } },
  });
}

/**
 * Soft delete — sets status to UNLISTED. Order history still references the product.
 */
export async function unlistProduct(id: string) {
  return prisma.product.update({
    where: { id },
    data: { status: 'UNLISTED' },
  });
}
