# CLAUDE.md — Bitscy (Root)

This file is read by Claude Code on every session in this repository. It contains the team-wide context every engineer needs. Role-specific context lives in subdirectory CLAUDE.md files (`src/services/catalog/CLAUDE.md`, `src/services/commerce/CLAUDE.md`, `src/app/CLAUDE.md`).

Keep this file updated as the team learns. End-of-day, ask: "Did I learn anything today that belongs in CLAUDE.md?" Capture it.

---

## What we're building

**Bitscy** is a Bitcoin-native marketplace for African creative women. A Nigerian artist lists her work, a buyer in Toronto pays with Lightning, the sats land in the artist's self-custodial wallet, and she can withdraw to her Nigerian bank account whenever she wants.

The product solves a real, lived problem: African creators are structurally excluded from global creative marketplaces. Etsy doesn't support Nigerian sellers cleanly. PayPal blocks Nigerian accounts. Stripe isn't available. International buyers can't pay Nigerian artists directly with their existing tools. Bitcoin Lightning is the only payment system that genuinely doesn't care about nationality, banking jurisdiction, or platform policies.

The protagonist is **Adaeze**, a talented Nigerian artist who paused her craft because she couldn't find buyers or get paid reliably. The product is built for her and for the millions of women like her.

## Mission constraints

These shape every decision. When you suggest a feature or pattern, check it against these:

- **Mobile-first.** Adaeze uses an Android phone. Tobi (the diaspora buyer) browses on her phone. Desktop is incidental, not primary.
- **PWA, not native.** Installable to home screen. Works on Android and iOS without app stores.
- **The user never sees Bitcoin jargon.** No mention of "satoshis" or "Lightning" in user-facing copy unless contextually necessary. Display in naira or USD with sats as a secondary display.
- **Self-custodial by default.** Sellers control their own keys. Bitscy never holds funds.
- **Freedom tech is invisible.** Bitcoin, Nostr, and Lightning power the product but never burden the user.

## The architecture, in one breath

Four layers, top to bottom:

1. **Client layer (PWA):** installable mobile-first web app on Android/iOS.
2. **Frontend (Next.js App Router + React + Tailwind):** screens, components, Zustand stores, embedded Breez wallet for new buyers, service worker via `next-pwa`.
3. **Backend (Next.js API routes):** product CRUD, order state machine, Lightning invoice orchestration, Nostr publishing, mocked Bitnob.
4. **External infrastructure:** Breez SDK (real), Nostr relays (real), PostgreSQL (real), Cloudinary (real), Bitnob API (mocked for v1).

**Breez owns Lightning. Bitnob owns naira off-ramp only.** Settlement happens in Breez. Sats land in self-custodial seller wallets. Bitnob is a separate flow that converts sats to naira when the seller chooses to withdraw — it's mocked for v1.

**Nostr is the source of truth for public data.** Products, orders, and seller profiles are signed Nostr events. PostgreSQL is a fast queryable cache. If Bitscy disappears tomorrow, the catalog lives on.

## The three roles and what they own

The repo is split into three vertical ownership areas. When you write code, you're working inside one of these.

**Catalog (Backend Engineer #1)** — everything from "Adaeze opens the app" to "her product is live and shareable." Owns: user/seller onboarding, product CRUD, Nostr publishing (profiles + products), Cloudinary uploads, browse/discovery API. Code lives in `src/services/catalog/`, `src/services/nostr/`, and `app/api/products/`, `app/api/auth/`, `app/api/upload/`, `app/api/shop/`, `app/api/nostr/`.

**Commerce (Backend Engineer #2)** — everything from "Tobi taps Buy" to "Adaeze withdraws to her bank." Owns: order state machine, Lightning invoice generation, Breez integration, Lightning Address routing, payment detection, Nostr order events, push notifications, mocked Bitnob off-ramp. Code lives in `src/services/commerce/`, `src/services/lightning/`, `src/services/payout/`, and `app/api/orders/`, `app/api/lightning/`, `app/api/payout/`, `app/api/webhooks/`, `app/api/wallet/`.

**Experience (Frontend Engineer / Designer / DevOps)** — everything Adaeze and Tobi see, plus the infrastructure delivering it. Owns: visual design, all React components and pages, PWA setup, mobile-first responsive layouts, Zustand stores, client-side Nostr key generation, buyer-side embedded Breez wallet, Vercel deployment, database hosting setup. Code lives in `src/app/` (except `src/app/api/`), `src/components/`, `src/store/`, `src/lib/` (client-side libraries).

When you're working in a directory, you have ownership of what's there. Don't modify code outside your role's directories without coordination.

## The shared types — single source of truth

Every cross-role boundary uses these typed interfaces. They live in `src/types/shared.ts`. Don't invent shapes. If a field is missing, ask the owning engineer, don't guess.

```typescript
// Users
export type UserRole = 'BUYER' | 'SELLER';

export interface User {
  id: string;
  npub: string;              // Nostr public key (hex)
  username: string;
  displayName: string | null;
  avatar: string | null;
  about: string | null;
  lightningAddr: string | null;  // e.g., "adaeze@bitscy.com"
  role: UserRole;
  createdAt: string;
}

export interface SellerInfo {
  id: string;
  username: string;
  npub: string;
  lightningAddress: string;
  displayName: string | null;
}

// Products
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
  priceSats: string;            // bigint serialized as string
  priceNgnDisplay: string;      // computed by backend
  shippingSats: string;
  category: ProductCategory;
  images: string[];             // Cloudinary URLs
  isDigital: boolean;
  stock: number;
  status: ProductStatus;
  nostrEventId: string | null;
  createdAt: string;
}

// Orders
export type OrderStatus =
  | 'PENDING'      // awaiting payment
  | 'PAID'         // Lightning invoice settled
  | 'SHIPPED'      // seller marked shipped
  | 'DELIVERED'    // buyer confirmed
  | 'CANCELLED';

export interface Order {
  id: string;
  buyerId: string;
  buyerNpub: string;
  sellerId: string;
  sellerNpub: string;
  items: OrderItem[];
  totalSats: string;
  invoiceBolt11: string | null;
  paymentHash: string | null;
  status: OrderStatus;
  shippingNote: string | null;     // optional seller note when shipping
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

// Lightning
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

// Payouts (mocked Bitnob)
export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface PayoutRequest {
  amountSats: string;
  bankAccountId: string;
}

export interface PayoutResult {
  payoutId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amountSats: string;
  amountNgn: string;
  etaSeconds: number;
}
```

## Nostr event shapes

Products, profiles, and orders are signed Nostr events. Follow these exact shapes — they implement NIP-15.

**Profile (kind 0):**
```json
{
  "kind": 0,
  "pubkey": "<seller_npub_hex>",
  "tags": [],
  "content": "{\"name\":\"Adaeze\",\"about\":\"...\",\"picture\":\"https://...\"}"
}
```

**Product (kind 30018, replaceable):**
```json
{
  "kind": 30018,
  "pubkey": "<seller_npub_hex>",
  "tags": [
    ["d", "<product_id>"],
    ["t", "marketplace"],
    ["t", "<category>"],
    ["price", "<sats>", "sats"]
  ],
  "content": "<JSON-stringified product details>"
}
```

Content includes: name, description, images, currency, price, quantity, isDigital, shippingSats.

**Order (kind 30019):**
```json
{
  "kind": 30019,
  "pubkey": "<buyer_npub_hex>",
  "tags": [
    ["d", "<order_id>"],
    ["p", "<seller_npub_hex>"],
    ["e", "<product_event_id>"]
  ],
  "content": "<NIP-04 encrypted JSON: items, shipping address, payment hash>"
}
```

Shipping addresses are NIP-04 encrypted to the seller's pubkey. Only the seller can decrypt.

## What's mocked vs. real in v1

**Real (build against actual infrastructure):**
- Lightning settlement via Breez SDK Nodeless (mainnet, tiny amounts)
- Nostr identity, signing, and event publishing to public relays
- PostgreSQL via Supabase or Neon
- Cloudinary image hosting
- Push notifications via Web Push

**Mocked (looks identical to the user, no real backend calls):**
- Bitnob API (the naira off-ramp). The mock service returns realistic success on realistic timing (3-5 seconds). UI shows "₦40,000 sent to GTBank ****1234." No real bank money moves.
- BTC/NGN exchange rate. Fixed at the rate stored in env var `DEMO_BTC_NGN_RATE` (no live price feeds in v1).
- Email and SMS. Print to console in dev; skipped in production demo. Push notifications are real.

## Coding conventions

**TypeScript everywhere.** Strict mode on. No `any`. If you need an escape hatch, use `unknown` with a type guard. Use `bigint` for sats values; serialize as string in JSON.

**File naming.** kebab-case for files (`product-card.tsx`, `lightning-service.ts`). PascalCase for React components inside files (`export function ProductCard`). camelCase for functions and variables.

**Imports order.** External libraries first, then internal `@/` aliased imports, then relative imports. One blank line between groups.

**Error handling.** Backend API routes return typed error responses, never throw to the client. Use `{ error: { code, message } }` shape. The client never trusts free-text errors; it switches on `code`.

**Async patterns.** Async/await over `.then()`. Top-level `try/catch` in API handlers. No silent failures.

**Database access.** Always through Prisma. No raw SQL in v1. Repository functions live in `src/services/<role>/repository.ts`.

**Money.** Sats are `bigint`. Naira are integers (no kobo subdivision in v1). Never use floats for money. JSON-serialize bigints as strings.

**Component structure.** Each component owns one file. Co-locate component-specific styles using Tailwind classes inline. Shared styles live in `src/lib/styles.ts` as small string constants if reused 3+ times.

**State management.** Zustand for cross-component state. Local component state via `useState`. Server state via SWR or built-in React fetching. Don't reach for Redux.

**Comments.** Comment *why*, not *what*. If the code is self-explanatory, no comment. If a decision is non-obvious, leave a one-line comment explaining the trade-off.

## What's NOT in v1 — do not suggest, do not build

Claude should not propose adding any of these unless explicitly asked. They're documented as v2 to keep the team focused.

- Cart with multiple items (single-item purchase only in v1)
- Reviews or ratings
- Buyer-seller direct messaging
- Real Bitnob integration (mocked instead)
- Dispute resolution or refunds
- Shipping logistics, tracking, or labels
- Discount codes, promotions, coupons
- Wishlists or favorites
- Categories or tags beyond the single fixed enum
- Multi-language support (English only)
- Search beyond chronological browse + category filter
- Seller verification badges or tiers
- Native iOS or Android apps (PWA only)
- Multi-image carousel beyond 5 images
- Real-time order tracking with maps
- Inventory management beyond simple stock count

If Claude finds itself drifting toward these, it's out of scope. Stop and check before suggesting.

## Environment variables

These exist (do not commit values):

```
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
BREEZ_API_KEY=
BREEZ_NETWORK=mainnet              # or 'signet' for dev
NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net,wss://nostr.wine
SYSTEM_NSEC=                        # Bitscy's system Nostr key (for server-signed events on behalf of buyers)
DEMO_BTC_NGN_RATE=145000000         # 1 BTC = ₦145M, fixed for demo
PLATFORM_FEE_PERCENT=2
WEB_PUSH_VAPID_PUBLIC=
WEB_PUSH_VAPID_PRIVATE=
WEB_PUSH_VAPID_SUBJECT=
```

Refer to env vars by name in CLAUDE.md, never their values. Real values live in `.env.local` (gitignored) and Vercel project settings.

## Common gotchas across the project

**BigInt serialization.** JavaScript JSON.stringify chokes on bigint. Use a custom replacer, or convert to string at the API boundary. The shared types use `string` for sat amounts for exactly this reason.

**Service worker caching in dev.** `next-pwa` is disabled in development (`disable: process.env.NODE_ENV === 'development'` in `next.config.js`). If you see stale assets, that's the service worker. Hard reload (Cmd+Shift+R) or use incognito.

**Nostr event IDs.** Calculated from the event content. Never modify content after signing. To "update" a kind 30018 product, re-sign and re-publish with the same `d` tag.

**Race condition on payment confirmation.** Both the Breez webhook and the frontend polling can trigger order updates. Use atomic database updates (`WHERE status = 'PENDING'`) so only the first wins.

**iOS PWA push notifications.** Only work if the user installs the PWA to home screen first (iOS 16.4+). For the demo, use Android phones for sellers.

**Relay availability.** Public Nostr relays go down. Always publish to 3+ relays. Don't fail the user flow if one relay is unreachable.

## What I want from you, Claude

When working in this codebase:

- Read this file. Read the role-specific CLAUDE.md in your working directory.
- Use the shared types from `src/types/shared.ts`. Don't invent shapes.
- Stay inside the scope listed in "What's NOT in v1." If you find yourself reasoning about something out of scope, stop and ask.
- Be specific. "I'll add a new endpoint that does X" beats "I'll improve the API."
- Be honest about uncertainty. If a Breez SDK behavior isn't documented, say so and propose verifying instead of assuming.
- Follow the conventions above. Strict TypeScript, async/await, Prisma for DB, Zustand for client state.
- When in doubt, ask. Not every decision is yours to make.

## Repository structure

```
bitscy/
├── prisma/
│   └── schema.prisma
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── sw.js
├── src/
│   ├── app/                      # Experience role
│   │   ├── (marketplace)/
│   │   ├── (dashboard)/
│   │   ├── (auth)/
│   │   ├── api/
│   │   │   ├── products/         # Catalog role
│   │   │   ├── shop/             # Catalog role
│   │   │   ├── upload/           # Catalog role
│   │   │   ├── nostr/            # Catalog role
│   │   │   ├── auth/             # Catalog role
│   │   │   ├── orders/           # Commerce role
│   │   │   ├── lightning/        # Commerce role
│   │   │   ├── payout/           # Commerce role
│   │   │   ├── webhooks/         # Commerce role
│   │   │   └── wallet/           # Commerce role
│   │   └── layout.tsx
│   ├── components/               # Experience role
│   ├── lib/                      # Mixed; client-side in Experience, server in Commerce/Catalog
│   ├── services/
│   │   ├── catalog/              # Catalog role (CLAUDE.md here)
│   │   ├── commerce/             # Commerce role (CLAUDE.md here)
│   │   ├── lightning/            # Commerce role
│   │   ├── nostr/                # Catalog role (shared service)
│   │   └── payout/               # Commerce role (Bitnob mock)
│   ├── store/                    # Experience role (Zustand)
│   └── types/
│       └── shared.ts             # Single source of truth for cross-role types
├── CLAUDE.md                     # This file
└── package.json
```

---

*End of root CLAUDE.md. Role-specific context lives in subdirectory CLAUDE.md files.*
