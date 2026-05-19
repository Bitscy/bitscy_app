import type { Product, CreateProductInput, SellerInfo } from '@/types/shared';
import { ApiError } from '@/lib/api-error';
import { satsToNgn, formatNgn } from '@/lib/currency';
import * as repository from './repository';

/**
 * Catalog service — public API for product and seller operations.
 *
 * Owned by the Catalog Engineer.
 *
 * Pattern: API routes call this. This calls repository (DB) and nostr-publisher
 * (side effect). Never call repository directly from an API route.
 */

/**
 * Get seller info by username — the cross-role helper Commerce uses
 * when creating orders.
 */
export async function getSellerByUsername(username: string): Promise<SellerInfo | null> {
  const user = await repository.findUserByUsername(username);
  if (!user || user.role !== 'SELLER') return null;

  return {
    id: user.id,
    username: user.username,
    npub: user.npub,
    lightningAddress: user.lightningAddr ?? `${user.username}@bitscy.com`,
    displayName: user.displayName,
    avatar: user.avatar,
  };
}

export async function getSellerById(id: string): Promise<SellerInfo | null> {
  const user = await repository.findUserById(id);
  if (!user || user.role !== 'SELLER') return null;

  return {
    id: user.id,
    username: user.username,
    npub: user.npub,
    lightningAddress: user.lightningAddr ?? `${user.username}@bitscy.com`,
    displayName: user.displayName,
    avatar: user.avatar,
  };
}

/**
 * Map a Prisma product row to the shared Product type.
 */
function toProduct(p: Awaited<ReturnType<typeof repository.findProductById>>): Product {
  if (!p) throw new ApiError('NOT_FOUND', 'Product not found', 404);

  return {
    id: p.id,
    sellerId: p.sellerId,
    sellerUsername: p.seller.username,
    sellerDisplayName: p.seller.displayName,
    title: p.title,
    description: p.description,
    priceSats: p.priceSats.toString(),
    priceNgnDisplay: formatNgn(satsToNgn(p.priceSats)),
    shippingSats: p.shippingSats.toString(),
    category: p.category as Product['category'],
    images: p.images,
    isDigital: p.isDigital,
    stock: p.stock,
    status: p.status,
    nostrEventId: p.nostrEventId,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function getProduct(id: string): Promise<Product> {
  const product = await repository.findProductById(id);
  if (!product) {
    throw new ApiError('NOT_FOUND', 'Product not found', 404);
  }
  return toProduct(product);
}

export async function listProducts(params: {
  page?: number;
  pageSize?: number;
  category?: string;
}): Promise<{ items: Product[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 20, 50);

  const { items, total } = await repository.listActiveProducts({
    page,
    pageSize,
    category: params.category,
  });

  return {
    items: items.map(toProduct),
    total,
    page,
    pageSize,
  };
}

export async function createProductForSeller(
  input: CreateProductInput,
  sellerId: string,
): Promise<Product> {
  // TODO(catalog): publish to Nostr after Postgres create.
  // Use the pattern: Postgres create → build event → sign → publish to relays → update Postgres with event ID.
  // See CLAUDE.md in this directory for the canonical implementation pattern.

  const product = await repository.createProduct({
    seller: { connect: { id: sellerId } },
    title: input.title,
    description: input.description,
    priceSats: BigInt(input.priceSats),
    shippingSats: BigInt(input.shippingSats),
    category: input.category,
    images: input.images,
    isDigital: input.isDigital,
    digitalUrl: input.digitalUrl,
    stock: input.stock,
  });

  return toProduct(product);
}
