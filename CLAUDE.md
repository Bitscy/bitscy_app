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
2. **Frontend (Next.js App Router + React + Tailwind):** screens, components, Zustand stores, optional client-side embedded Breez wallet for new buyers, service worker via `@ducanh2912/next-pwa`.
3. **Backend (Next.js API routes):** product CRUD, order state machine, Lightning invoice orchestration via the platform Breez wallet, Nostr publishing, real Bitnob sandbox integration for NGN off-ramp, internal seller balance ledger.
4. **External infrastructure (every integration is real):** Breez SDK Liquid (real, mainnet for v1), Bitnob API (real, sandbox for v1 — see Section 7 of the Integration Flow doc), CoinGecko (real, live BTC/NGN), Nostr relays (real public relays), PostgreSQL via Supabase, Cloudinary.

**Lightning custody: platform-custodial for v1.** Bitscy operates a single Breez SDK wallet that receives all incoming Lightning payments on behalf of sellers. Per-seller balances are tracked in an append-only Postgres ledger (`LedgerEntry` table). Sellers cannot lose access to their funds — they can withdraw to NGN (via Bitnob) or to a personal Lightning address at any time. In v2 we migrate to per-seller self-custodial wallets after sellers complete profile setup. The v1 framing is honest in the pitch: "platform-custodial during early onboarding, self-custodial in v2."

**Buyer wallets ARE self-custodial.** Tobi (the buyer) either pays from her own existing Lightning wallet OR creates a Bitscy-embedded Breez wallet client-side. The buyer-side embedded wallet runs in the browser, with the mnemonic encrypted in IndexedDB. Bitscy never sees buyer keys.

**Bitnob owns NGN off-ramp only.** When a seller withdraws, Bitscy pays a Bitnob-issued Lightning invoice from the platform wallet, and Bitnob deposits NGN to the seller's Nigerian bank account. For the v1 demo this runs on Bitnob's sandbox (real API, real Lightning testnet, no real NGN moves) — this is framed honestly in the pitch.

**Nostr is the source of truth for public data.** Products, orders, and seller profiles are signed Nostr events. PostgreSQL is a fast queryable cache. If Bitscy disappears tomorrow, the catalog lives on.

**See `Bitscy_Integration_Flow.md` for the complete end-to-end architecture.** This file is a summary; the integration flow doc is the authoritative spec.

## The three roles and what they own

The repo is split into three vertical ownership areas. When you write code, you're working inside one of these.

**Catalog (Backend Engineer #1)** — everything from "Adaeze opens the app" to "her product is live and shareable." Owns: user/seller onboarding, product CRUD, Nostr publishing (profiles + products), Cloudinary uploads, browse/discovery API. Code lives in `src/services/catalog/`, `src/services/nostr/`, and `app/api/products/`, `app/api/auth/`, `app/api/upload/`, `app/api/shop/`, `app/api/nostr/`.

**Commerce (Backend Engineer #2)** — everything from "Tobi taps Buy" to "Adaeze withdraws to her bank." Owns: order state machine, Lightning invoice generation against the platform Breez wallet, Lightning Address routing, payment detection (Breez SDK events + frontend polling), per-seller balance ledger, Nostr order events, push notifications, real Bitnob sandbox integration for NGN off-ramp, CoinGecko exchange rate service. Code lives in `src/services/commerce/`, `src/services/lightning/`, `src/services/payout/`, `src/services/pricing/`, and `app/api/orders/`, `app/api/lightning/`, `app/api/payout/`, `app/api/webhooks/`, `app/api/wallet/`.

**Experience (Frontend Engineer / Designer / DevOps)** — everything Adaeze and Tobi see, plus the infrastructure delivering it. Owns: visual design, all React components and pages, PWA setup, mobile-first responsive layouts, Zustand stores, client-side Nostr key generation, buyer-side embedded Breez wallet, Vercel deployment, database hosting setup. Code lives in `src/app/` (except `src/app/api/`), `src/components/`, `src/store/`, `src/lib/` (client-side libraries).

When you're working in a directory, you have ownership of what's there. Don't modify code outside your role's directories without coordination.

## The shared types — single source of truth

Every cross-role boundary uses these typed interfaces. They live in `src/types/shared.ts`. Don't invent shapes. If a field is missing, ask the owning engineer, don't guess.

```typescript
// Users
export type UserRole = 'BUYER' | 'SELLER';

export interface User {
  id: string;
  npub: string; // Nostr public key (hex)
  username: string;
  displayName: string | null;
  avatar: string | null;
  about: string | null;
  lightningAddr: string | null; // e.g., "adaeze@bitscy.com"
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
  priceSats: string; // bigint serialized as string
  priceNgnDisplay: string; // computed by backend
  shippingSats: string;
  category: ProductCategory;
  images: string[]; // Cloudinary URLs
  isDigital: boolean;
  stock: number;
  status: ProductStatus;
  nostrEventId: string | null;
  createdAt: string;
}

// Orders
export type OrderStatus =
  | 'PENDING' // awaiting payment
  | 'PAID' // Lightning invoice settled
  | 'SHIPPED' // seller marked shipped
  | 'DELIVERED' // buyer confirmed
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
  shippingNote: string | null; // optional seller note when shipping
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

// Payouts (real Bitnob sandbox integration)
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
  payoutId: string; // Bitnob payout ID
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amountSats: string;
  amountNgn: string; // computed from live CoinGecko rate at time of withdrawal
  etaSeconds: number;
}

// Ledger — the append-only record of seller balance changes.
// A seller's current balance = SUM(amountSats) for their userId.
export type LedgerEntryType = 'SALE' | 'WITHDRAWAL' | 'REFUND' | 'ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  userId: string;
  amountSats: string; // bigint serialized; positive = credit, negative = debit
  type: LedgerEntryType;
  refId: string | null; // OrderId for SALE, PayoutId for WITHDRAWAL, etc.
  description: string;
  recordedNgnRate: string; // BTC/NGN rate at time of entry, for historical reference
  createdAt: string;
}

// PendingPayment — short-lived. Maps an inbound Lightning paymentHash
// to the seller and order it belongs to. Deleted when payment settles
// or expires.
export interface PendingPayment {
  paymentHash: string;
  sellerId: string;
  amountSats: string;
  orderId: string | null; // null if direct LNURL pay outside marketplace flow
  description: string;
  createdAt: string;
  expiresAt: string;
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

## What's real in v1 — every external integration

Every external system Bitscy depends on is real. There are no mocks. The full list:

- **Lightning settlement via Breez SDK Liquid (mainnet).** A single platform-owned Breez wallet receives all incoming payments. The wallet runs server-side. The mnemonic is encrypted in `PLATFORM_BREEZ_MNEMONIC` env var.
- **Bitnob API for NGN off-ramp (sandbox endpoint, real API calls).** When a seller withdraws, Bitscy pays a Bitnob-issued Lightning invoice from the platform wallet; Bitnob processes the NGN payout to the seller's Nigerian bank account. Sandbox means real testnet Lightning routing and real API responses, but no real naira hits a real bank. Production graduation requires Bitnob KYB (out of scope for v1, pitched honestly).
- **CoinGecko API for live BTC/NGN exchange rate.** Free tier, no API key required. Cached for 60 seconds. Used everywhere NGN-equivalent is displayed.
- **Nostr identity, signing, and event publishing to public relays.** No fakes. Real `nostr-tools` events to `relay.damus.io`, `nos.lol`, `relay.primal.net`, `nostr.wine`.
- **PostgreSQL via Supabase.** Real database.
- **Cloudinary image hosting.** Real, signed uploads only.
- **Push notifications via Web Push.** Real subscriptions, real delivery.

**Two things are limited in v1 but still real:**

- Bitnob sandbox does not move real naira to real banks. Every other piece of the off-ramp flow IS real.
- Demo amounts are small mainnet sats (under 5,000 sats per transaction). Real Bitcoin, small amounts to cap exposure.

**Buyer-side embedded Breez wallet.** Tobi can either pay from her own existing Lightning wallet OR create a Bitscy-embedded Breez wallet client-side (Breez SDK WASM, runs in browser, mnemonic stored in IndexedDB). The embedded wallet is real and self-custodial. It is a stretch feature: if time runs out, drop it and require external wallets — the demo still works either way.

If you find yourself reaching for a setTimeout or hardcoded response in any code path that touches Lightning, Bitnob, or exchange rates, stop. That's not the architecture. See `Bitscy_Integration_Flow.md` for the complete specification.

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

**Comments.** Comment _why_, not _what_. If the code is self-explanatory, no comment. If a decision is non-obvious, leave a one-line comment explaining the trade-off.

## What's NOT in v1 — do not suggest, do not build

Claude should not propose adding any of these unless explicitly asked. They're documented as v2 to keep the team focused.

- Cart with multiple items (single-item purchase only in v1)
- Reviews or ratings
- Buyer-seller direct messaging
- Bitnob **production** credentials and KYB approval (v1 uses Bitnob sandbox — real API, real Lightning testnet, no real NGN movement)
- **Per-seller self-custodial Breez wallets** (v1 uses one platform-custodial wallet for all sellers; v2 migrates each seller to their own wallet after profile completion)
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
- BIP-353 / BOLT-12 (v1 uses LNURL-pay + BOLT-11 only)

If Claude finds itself drifting toward these, it's out of scope. Stop and check before suggesting.

## Environment variables

These exist (do not commit values):

```
# Database
DATABASE_URL=
DIRECT_URL=

# Hosting
NEXT_PUBLIC_APP_URL=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

# Breez SDK Liquid (real, mainnet for v1)
BREEZ_API_KEY=
PLATFORM_BREEZ_MNEMONIC=             # 12-word mnemonic for the single platform wallet (encrypted at rest)
BREEZ_NETWORK=mainnet                # 'signet' for dev, 'mainnet' for demo

# Bitnob (real sandbox API)
BITNOB_API_KEY=
BITNOB_API_BASE=https://sandboxapi.bitnob.co/api/v1
BITNOB_WEBHOOK_SECRET=               # for verifying inbound webhook signatures

# CoinGecko (free tier, no key required)
COINGECKO_API_BASE=https://api.coingecko.com/api/v3

# Nostr
SYSTEM_NSEC=                          # Bitscy's system Nostr key (for server-signed events on behalf of anonymous buyers)
NEXT_PUBLIC_NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net,wss://nostr.wine

# Platform fee
PLATFORM_FEE_PERCENT=2

# Web Push
WEB_PUSH_VAPID_PUBLIC=
WEB_PUSH_VAPID_PRIVATE=
WEB_PUSH_VAPID_SUBJECT=
NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC=

# Session
SESSION_SECRET=
```

Refer to env vars by name in CLAUDE.md, never their values. Real values live in `.env.local` (gitignored) and Vercel project settings.

**`PLATFORM_BREEZ_MNEMONIC` is the most security-sensitive env var.** If it leaks, all pending seller balances are at risk. Mitigations: encrypted at rest in Vercel, never logged (add log redaction), operating balance capped via daily sweep to cold storage, access restricted to the team lead. See Section 3 of `Bitscy_Integration_Flow.md` for the full security model.

## Common gotchas across the project

**BigInt serialization.** JavaScript JSON.stringify chokes on bigint. Use a custom replacer, or convert to string at the API boundary. The shared types use `string` for sat amounts for exactly this reason.

**Service worker caching in dev.** `next-pwa` is disabled in development (`disable: process.env.NODE_ENV === 'development'` in `next.config.js`). If you see stale assets, that's the service worker. Hard reload (Cmd+Shift+R) or use incognito.

**Nostr event IDs.** Calculated from the event content. Never modify content after signing. To "update" a kind 30018 product, re-sign and re-publish with the same `d` tag.

**Race condition on payment confirmation.** Both the Breez SDK `paymentSucceeded` event handler and the frontend polling can trigger order updates. Use atomic database updates (`WHERE status = 'PENDING'`) so only the first wins.

**iOS PWA push notifications.** Only work if the user installs the PWA to home screen first (iOS 16.4+). For the demo, use Android phones for sellers.

**Relay availability.** Public Nostr relays go down. Always publish to 3+ relays. Don't fail the user flow if one relay is unreachable.

## What I want from you, Claude

When working in this codebase:

- Read this file. Read the role-specific CLAUDE.md in your working directory.
- **Follow the role's build sequence.** Each role's CLAUDE.md has a "Build sequence" section that lists features in dependency order with prerequisites, smoke tests, and acceptance criteria. Build feature N. Test it. Confirm acceptance criteria pass. Then move to feature N+1. Do not stack untested features on top of each other — Lightning, Bitnob, and Nostr bugs compound silently if you do.
- **Request external dependencies at the moment they're needed**, not all upfront. The build sequence calls out the exact feature where each external account, API key, or dependency is first required. Get it then, not in a giant upfront list.
- Use the shared types from `src/types/shared.ts`. Don't invent shapes.
- Stay inside the scope listed in "What's NOT in v1." If you find yourself reasoning about something out of scope, stop and ask.
- Be specific. "I'll add a new endpoint that does X" beats "I'll improve the API."
- Be honest about uncertainty. If a Breez SDK behavior isn't documented, say so and propose verifying instead of assuming.
- Follow the conventions above. Strict TypeScript, async/await, Prisma for DB, Zustand for client state.
- When in doubt, ask. Not every decision is yours to make.

## How the three role build sequences fit together

The three roles can work in parallel, but with dependency gates. A rough timeline:

**Day 0 (parallel):** All three roles set up their environment, obtain external deps, complete their feature 1 (foundation).

- Catalog: C1 (database).
- Commerce: Day 0 prerequisites (Breez + Bitnob accounts), M1 (CoinGecko).
- Experience: X1 (design system), X2 (PWA setup).

**Day 1-2 (parallel with light blocking):**

- Catalog: C2-C4 (auth + Cloudinary). No blockers.
- Commerce: M2-M4 (platform wallet + receive). Self-contained.
- Experience: X3-X4 (layout + browse page, using mock data until Catalog C6 is done).

**Day 3-5 (heavier integration):**

- Catalog: C5-C10 (full product + Nostr publishing). Catalog mostly done by end of day 5.
- Commerce: M5-M10 (ledger, orders, settlements). Coordinate with Experience on the checkout polling endpoint.
- Experience: X5-X11 (product detail, seller pages, checkout). Unblocked as Catalog and Commerce features land.

**Day 6-9 (off-ramp + polish):**

- Commerce: M11-M14 (Bitnob, push, reconciliation).
- Experience: X12-X14 (embedded wallet stretch, withdrawal flow, order management).
- Catalog: Done; assist where useful.

**Day 10-12 (cross-role integration testing + bug fixing):**

- Run the cross-role integration test described at the end of Commerce's build sequence.
- Fix anything that surfaces. Run the test twice more.

**Day 13 (rehearsal):**

- Demo run-throughs on real phones.
- `/api/admin/reconcile` should return diff = 0.

**Day 14 (demo).**

This is aspirational, not contractual. Sequencing slips happen. The key discipline: don't move past a feature's acceptance criteria until they pass. A half-built feature that "mostly works" is a Day 13 bug source.

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
│   │   ├── commerce/             # Commerce role (CLAUDE.md here) — includes ledger.ts
│   │   ├── lightning/            # Commerce role — platform Breez wallet integration
│   │   ├── nostr/                # Catalog role (shared service)
│   │   ├── payout/               # Commerce role — real Bitnob sandbox client
│   │   └── pricing/              # Commerce role — CoinGecko live BTC/NGN rate
│   ├── store/                    # Experience role (Zustand)
│   └── types/
│       └── shared.ts             # Single source of truth for cross-role types
├── CLAUDE.md                     # This file
└── package.json
```

---

_End of root CLAUDE.md. Role-specific context lives in subdirectory CLAUDE.md files._
