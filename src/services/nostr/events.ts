import type { EventTemplate } from 'nostr-tools';

import { NOSTR_KINDS } from '@/types/nostr';
import type { ProductEventContent, ProfileEventContent } from '@/types/nostr';
import type { Product } from '@/types/shared';

export function buildProductEventTemplate(product: Product): EventTemplate {
  const content: ProductEventContent = {
    id: product.id,
    name: product.title,
    description: product.description,
    images: product.images,
    currency: 'sats',
    price: product.priceSats,
    quantity: product.stock,
    shippingSats: product.shippingSats,
    isDigital: product.isDigital,
    category: product.category,
  };

  return {
    kind: NOSTR_KINDS.PRODUCT,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', product.id],
      ['t', 'marketplace'],
      ['t', product.category],
      ['price', product.priceSats, 'sats'],
    ],
    content: JSON.stringify(content),
  };
}

export function buildProfileEventTemplate(profile: {
  displayName: string | null;
  about: string | null;
  avatar: string | null;
}): EventTemplate {
  const content: ProfileEventContent = {
    name: profile.displayName ?? '',
    about: profile.about ?? '',
    picture: profile.avatar,
  };

  return {
    kind: NOSTR_KINDS.PROFILE,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(content),
  };
}
