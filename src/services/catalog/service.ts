import type { Product, CreateProductInput, UpdateProductInput, SellerInfo } from '@/types/shared';
import { ApiError } from '@/lib/api-error';
import { satsToNgn, formatNgn } from '@/lib/currency';
import { signEventWithSystemKey } from '../nostr/signing';
import { publishEvent } from '../nostr/client';
import { buildProductEventTemplate } from '../nostr/events';
import * as repository from './repository';

/**
 * Catalog service — public API for product and seller operations.
 *
 * Owned by the Catalog Engineer.
 *
 * Pattern: API routes call this. This calls repository (DB) and Nostr client
 * (side effect). Never call repository directly from an API route.
 */

// Cross-role helper: Commerce uses this to look up a seller's Lightning Address.
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

type ProductRow = NonNullable<Awaited<ReturnType<typeof repository.findProductById>>>;

function toProduct(p: ProductRow): Product {
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
    status: p.status as Product['status'],
    nostrEventId: p.nostrEventId,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function getProduct(id: string): Promise<Product> {
  const product = await repository.findProductById(id);
  if (!product) throw new ApiError('NOT_FOUND', 'Product not found', 404);
  return toProduct(product);
}

export async function listProducts(params: {
  page?: number;
  pageSize?: number;
  category?: string;
  sellerId?: string;
}): Promise<{ items: Product[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 20, 50);

  const { items, total } = await repository.listActiveProducts({
    page,
    pageSize,
    category: params.category,
    sellerId: params.sellerId,
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

  const productData = toProduct(product);

  // Publish to Nostr — best-effort; never fails the product creation.
  try {
    const template = buildProductEventTemplate(productData);
    const signedEvent = signEventWithSystemKey(template);
    await publishEvent(signedEvent);
    const updated = await repository.updateProduct(product.id, { nostrEventId: signedEvent.id });
    return toProduct(updated);
  } catch (err) {
    console.error('Nostr publish failed for product', product.id, err);
    return productData;
  }
}

export async function updateProductForSeller(
  productId: string,
  sellerId: string,
  input: UpdateProductInput,
): Promise<Product> {
  const existing = await repository.findProductById(productId);
  if (!existing) throw new ApiError('NOT_FOUND', 'Product not found', 404);
  if (existing.sellerId !== sellerId) throw new ApiError('FORBIDDEN', 'Not your product', 403);

  const updated = await repository.updateProduct(productId, {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.priceSats !== undefined && { priceSats: BigInt(input.priceSats) }),
    ...(input.shippingSats !== undefined && { shippingSats: BigInt(input.shippingSats) }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.images !== undefined && { images: input.images }),
    ...(input.stock !== undefined && { stock: input.stock }),
    ...(input.status !== undefined && { status: input.status }),
  });

  const productData = toProduct(updated);

  // Re-publish to Nostr (replaceable event — same `d` tag replaces the old one).
  try {
    const template = buildProductEventTemplate(productData);
    const signedEvent = signEventWithSystemKey(template);
    await publishEvent(signedEvent);
    const withEventId = await repository.updateProduct(productId, { nostrEventId: signedEvent.id });
    return toProduct(withEventId);
  } catch (err) {
    console.error('Nostr re-publish failed for product', productId, err);
    return productData;
  }
}

export async function deleteProductForSeller(productId: string, sellerId: string): Promise<void> {
  const existing = await repository.findProductById(productId);
  if (!existing) throw new ApiError('NOT_FOUND', 'Product not found', 404);
  if (existing.sellerId !== sellerId) throw new ApiError('FORBIDDEN', 'Not your product', 403);

  await repository.unlistProduct(productId);
}

export async function getStorefront(username: string): Promise<{
  seller: SellerInfo;
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const seller = await getSellerByUsername(username);
  if (!seller) throw new ApiError('NOT_FOUND', `No seller found for @${username}`, 404);

  const { items, total } = await repository.listActiveProducts({
    page: 1,
    pageSize: 50,
    sellerId: seller.id,
  });

  return {
    seller,
    products: items.map(toProduct),
    total,
    page: 1,
    pageSize: 50,
  };
}
