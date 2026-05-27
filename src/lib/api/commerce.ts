/**
 * Typed wrappers around the Commerce endpoints.
 *
 * Balance and order data live on the Commerce side; this module is the
 * client-side seam so dashboard / orders / withdraw pages can call into
 * them without each component re-deriving the URL and response shape.
 *
 * Sat values cross the wire as decimal strings; NGN display strings come
 * pre-formatted ("₦12,345") from the server using the demo rate.
 */

import { fetcher, patchFetcher } from '@/lib/fetcher';
import type { Order } from '@/types/shared';

// ============================================================================
// Wallet balance
// ============================================================================

export interface WalletBalance {
  balanceSats: string;
  balanceNgn: string; // pre-formatted "₦12,345"
  rateStale: boolean; // true when the CoinGecko rate fell back to a cached copy
}

export function getWalletBalance(): Promise<WalletBalance> {
  return fetcher('/api/wallet/balance');
}

// ============================================================================
// Orders
// ============================================================================

export interface ListOrdersQuery {
  page?: number;
  pageSize?: number;
}

export interface ListOrdersResponse {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export function listOrders(query: ListOrdersQuery = {}): Promise<ListOrdersResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return fetcher(`/api/orders${qs ? `?${qs}` : ''}`);
}

export function getOrder(id: string): Promise<Order> {
  return fetcher(`/api/orders/${encodeURIComponent(id)}`);
}

/**
 * Seller-only. Transition the order to SHIPPED.
 * Optional `shippingNote` is shown to the buyer on their order detail page.
 */
export function markOrderShipped(
  id: string,
  shippingNote?: string,
): Promise<Order> {
  const body: { shippingNote?: string } = {};
  if (shippingNote && shippingNote.trim()) body.shippingNote = shippingNote.trim();
  return patchFetcher(`/api/orders/${encodeURIComponent(id)}/ship`, body);
}
