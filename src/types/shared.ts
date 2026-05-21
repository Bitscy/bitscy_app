/**
 * Shared types — the single source of truth for cross-role data shapes.
 *
 * Every engineer imports from here. Do not invent shapes. If a field is missing,
 * coordinate with the owning engineer before adding it.
 *
 * BigInt values (sats, naira) are serialized as strings at API boundaries.
 * JSON cannot represent bigint directly.
 */

// ============================================================================
// Users
// ============================================================================

export type UserRole = 'BUYER' | 'SELLER';

export interface User {
  id: string;
  npub: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  about: string | null;
  lightningAddr: string | null;
  role: UserRole;
  createdAt: string;
}

export interface SellerInfo {
  id: string;
  username: string;
  npub: string;
  lightningAddress: string;
  displayName: string | null;
  avatar: string | null;
}

// ============================================================================
// Products
// ============================================================================

export type ProductCategory =
  | 'paintings'
  | 'jewelry'
  | 'textiles'
  | 'leather'
  | 'pottery'
  | 'sculpture'
  | 'prints_digital'
  | 'other';

export type ProductStatus = 'ACTIVE' | 'SOLD_OUT' | 'UNLISTED';

export interface Product {
  id: string;
  sellerId: string;
  sellerUsername: string;
  sellerDisplayName: string | null;
  title: string;
  description: string;
  priceSats: string; // bigint serialized
  priceNgnDisplay: string; // computed by backend at fixed demo rate
  shippingSats: string;
  category: ProductCategory;
  images: string[];
  isDigital: boolean;
  stock: number;
  status: ProductStatus;
  nostrEventId: string | null;
  createdAt: string;
}

export interface CreateProductInput {
  title: string;
  description: string;
  priceSats: string;
  shippingSats: string;
  category: ProductCategory;
  images: string[];
  isDigital: boolean;
  digitalUrl?: string;
  stock: number;
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  priceSats?: string;
  shippingSats?: string;
  category?: ProductCategory;
  images?: string[];
  stock?: number;
  status?: ProductStatus;
}

// ============================================================================
// Orders
// ============================================================================

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  buyerId: string;
  buyerNpub: string;
  sellerId: string;
  sellerNpub: string;
  items: OrderItem[];
  totalSats: string;
  shippingSats: string;
  invoiceBolt11: string | null;
  paymentHash: string | null;
  status: OrderStatus;
  shippingNote: string | null;
  nostrEventId: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
}

export interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  quantity: number;
  priceSats: string;
}

export interface CreateOrderInput {
  productId: string;
  quantity: number;
  encryptedShipping?: string; // NIP-04 encrypted, optional for digital products
}

// ============================================================================
// Lightning
// ============================================================================

export interface LightningInvoice {
  bolt11: string;
  paymentHash: string;
  amountSats: string;
  expiresAt: string;
}

export interface InvoiceStatus {
  paymentHash: string;
  settled: boolean;
  settledAt: string | null;
}

// ============================================================================
// Payouts (Bitnob mock in v1)
// ============================================================================

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

export interface PayoutRequest {
  amountSats: string;
  bankAccountId: string;
}

export type PayoutStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

/** Immediate response from initiating or polling a payout (mock or real Bitnob). */
export interface PayoutResult {
  payoutId: string;
  status: PayoutStatus;
  amountSats: string;
  amountNgn: string;
  etaSeconds: number;
}

export interface Payout {
  id: string;
  amountSats: string;
  amountNgn: string;
  bankAccount: BankAccount;
  status: PayoutStatus;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  etaSeconds: number;
}

// ============================================================================
// API response wrappers
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'LIGHTNING_FAILED'
  | 'PAYOUT_FAILED'
  | 'INSUFFICIENT_BALANCE'
  | 'OUT_OF_STOCK';
