/**
 * Nostr event type definitions following NIP-15 for the marketplace.
 */

import type { Event } from 'nostr-tools';

export const NOSTR_KINDS = {
  PROFILE: 0,
  PRODUCT: 30018,
  ORDER: 30019,
} as const;

export interface ProductEventContent {
  id: string;
  name: string;
  description: string;
  images: string[];
  currency: 'sats';
  price: string; // sats as string
  quantity: number;
  shippingSats: string;
  isDigital: boolean;
  category: string;
}

export interface OrderEventContent {
  // This is the *decrypted* shape. On-wire it's NIP-04 encrypted.
  orderId: string;
  items: Array<{
    productId: string;
    productEventId: string | null;
    quantity: number;
    priceSats: string;
  }>;
  totalSats: string;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  } | null;
  paymentHash: string;
}

export interface ProfileEventContent {
  name: string;
  about: string;
  picture: string | null;
}

// Helper alias for typed Nostr events used in the app
export type NostrEvent = Event;
