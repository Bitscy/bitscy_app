# CLAUDE.md — Commerce (src/services/commerce/)

You're working in the Commerce role's code. The root `CLAUDE.md` covers project-wide context, shared types, conventions, and out-of-scope features. This file adds Commerce-specific context on top.

## What this role owns

Everything from the moment Tobi clicks "Buy with Lightning," through her payment landing in Adaeze's wallet, through Adaeze withdrawing the sats to her Nigerian bank account.

Specifically:
- Order creation and the full state machine
- Lightning invoice generation via Breez SDK
- Lightning Address routing (the `username@bitscy.com` system)
- Payment detection (Breez webhook + frontend polling, with race resolution)
- Order Nostr events (kind 30019, NIP-04 encrypted content)
- Push notification dispatch on settlement
- Seller dashboard data: balance, recent orders, statistics
- The mocked Bitnob off-ramp service
- The full purchase flow logic

## What this role does NOT own

- Product CRUD or browse (Catalog role)
- Seller profile creation (Catalog role)
- Cloudinary uploads (Catalog role)
- Frontend pages or components (Experience role)
- The buyer-side embedded Breez wallet UI (Experience role; you provide the backend hooks)

If you find yourself reasoning about how products are listed or how images upload, stop. That's the Catalog engineer's territory.

## API endpoints you own

- `POST /api/orders` — create new order, generate invoice, store payment hash
- `GET /api/orders/[id]` — fetch order detail (auth required: buyer or seller)
- `GET /api/orders` — list current user's orders
- `PATCH /api/orders/[id]/ship` — seller marks as shipped (auth: seller)
- `POST /api/lightning/invoice` — internal: generate Lightning invoice for an order
- `GET /api/lightning/verify/[paymentHash]` — frontend polling endpoint
- `POST /api/webhooks/breez` — Breez settlement webhook receiver
- `POST /api/payout` — initiate naira off-ramp (mocked Bitnob)
- `GET /api/payout/[id]` — fetch payout status
- `GET /api/wallet/balance` — seller's current sats balance
- `POST /api/notifications/subscribe` — register a Web Push subscription
- `GET /.well-known/lnurlp/[username]` — Lightning Address resolution endpoint

## SDKs and libraries you work with

**`@breeztech/breez-sdk-liquid`** — the Breez Nodeless SDK. The Liquid flavor handles infrastructure complexity without requiring node operations. Use for: wallet creation, invoice generation, payment detection, balance queries.

**Web Push protocol** — for notifications. Use the `web-push` npm library to dispatch notifications from the server. VAPID keys in env vars.

**NIP-04 encryption** — for shipping addresses in order events. Use `nip04.encrypt(secretKey, recipientPubkey, plaintext)` from `nostr-tools`. The buyer encrypts to the seller's pubkey before sending to the server.

**Prisma** — same as Catalog. All DB through Prisma. Transactions for atomic state changes.

## The order state machine

States and their valid transitions:

```
PENDING → PAID         (Lightning invoice settles)
PENDING → CANCELLED    (invoice expires or buyer abandons)
PAID    → SHIPPED      (seller marks shipped)
SHIPPED → DELIVERED    (buyer confirms — optional for v1, not enforced)
PAID    → CANCELLED    (buyer requests refund — v2, do not implement)
```

Invariants:
- An order in PENDING has an `invoiceBolt11` and `paymentHash` but no `paidAt`.
- An order in PAID has a `paidAt` timestamp. The sats have moved to the seller's wallet.
- Once PAID, the order cannot return to PENDING.
- Only the seller can transition PAID → SHIPPED.
- The buyer cannot cancel a PAID order in v1 (no refund flow).

Use atomic Postgres updates with `WHERE status = '<current_state>'` so concurrent updates don't corrupt state.

## The critical purchase flow

This is the canonical path. Every code change must keep this flow correct.

1. Tobi taps "Buy with Lightning" on the frontend.
2. Frontend POSTs to `/api/orders` with `{ productId, buyerNpub, encryptedShippingAddress }`.
3. Backend creates Order record (status PENDING). Locks the product stock atomically.
4. Backend calls `LightningService.createInvoice(seller, sats, orderId)`.
5. `LightningService` resolves the seller's Lightning Address through Breez (or the LNURL-pay endpoint), gets a BOLT-11 invoice, stores the payment hash on the Order.
6. Backend returns the invoice (bolt11, paymentHash, expiresAt) to the frontend.
7. Frontend displays QR code. Tobi pays from any Lightning wallet.
8. One of two settlement paths fires first:
   - **Breez webhook** to `/api/webhooks/breez` with `{ paymentHash, settled: true }`
   - **Frontend polling** to `/api/lightning/verify/[paymentHash]` every 2 seconds
9. Either way, the handler runs `OrderService.markPaid(paymentHash)`. This:
   - Atomically updates Order from PENDING to PAID (using WHERE clause)
   - Sets `paidAt` timestamp
   - Decrements product stock (if not already)
   - Constructs Nostr kind 30019 order event with NIP-04 encrypted content
   - Signs with `SYSTEM_NSEC` (since buyer may not have NIP-07)
   - Publishes to all configured relays
   - Dispatches Web Push notification to the seller
10. Frontend, on next poll or via the response to its current poll, sees status PAID and renders the success screen.

## Race condition resolution

Both the Breez webhook and the frontend polling can trigger `markPaid` for the same payment. The atomic update handles this:

```typescript
const updated = await prisma.order.updateMany({
  where: {
    paymentHash: hash,
    status: 'PENDING'   // only update if still pending
  },
  data: {
    status: 'PAID',
    paidAt: new Date()
  }
});

if (updated.count === 0) {
  // Already processed by the other path. Idempotent return.
  return getOrderByPaymentHash(hash);
}

// We won the race. Now publish Nostr event and send notification.
```

This is the pattern. Don't deviate.

## Webhook signature verification

The Breez webhook must verify signatures before trusting the payload. Use the shared secret from `BREEZ_WEBHOOK_SECRET` env var. Reject any webhook with an invalid signature.

For the mocked Bitnob webhook (v2), define the same pattern in advance so swapping to real Bitnob requires no rewrites.

## The Lightning Address system

Every seller has a Lightning Address: `<username>@bitscy.com`. When an external Lightning wallet pays this address, the LNURL-pay flow:

1. Wallet GETs `https://bitscy.com/.well-known/lnurlp/<username>`
2. Server returns LNURL-pay metadata: `{ callback, maxSendable, minSendable, metadata, tag: 'payRequest' }`
3. Wallet POSTs to the `callback` URL with `{ amount: <millisats> }`
4. Server generates an invoice from the seller's Breez wallet for that amount
5. Server returns `{ pr: <bolt11>, routes: [] }`
6. Wallet pays the BOLT-11 invoice

For internal Bitscy checkout flow, you can skip the LNURL step and call `createInvoice` directly. The LNURL path is for external Lightning wallets that don't know about Bitscy.

**Important:** confirm during week 1 that Breez SDK Nodeless supports generating invoices for arbitrary external requests in this pattern. If not, fall back to using the seller's Breez wallet directly without the Lightning Address abstraction (drop the `username@bitscy.com` feature from v1).

## NIP-04 encryption for shipping addresses

When a buyer submits an order with a shipping address, that address must not be readable by Bitscy or anyone except the seller.

Flow:
1. Client fetches the seller's pubkey from the product detail (already exposed via Catalog).
2. Client encrypts the shipping address using `nip04.encrypt(buyerPrivateKey, sellerPubkey, addressJson)`.
3. Client sends the encrypted string to `POST /api/orders` as `encryptedShipping`.
4. Server stores the encrypted blob in `Order.encryptedShipping`. Server cannot decrypt.
5. Server publishes the order event with the encrypted blob in `content`.
6. Seller's frontend, on viewing the order, decrypts using their private key.

Bitscy never sees a plaintext address. That's by design.

## The Bitnob mock

Lives in `src/services/payout/`. The mock implements the same interface a real Bitnob client would:

```typescript
interface PayoutService {
  initiatePayout(sats: bigint, bankAccount: BankAccount): Promise<PayoutResult>;
  getStatus(payoutId: string): Promise<PayoutStatus>;
}
```

The mock returns:
- `initiatePayout`: status `PENDING` immediately, success after a 3-second delay (use `setTimeout` + an in-memory store of mock payout states).
- `getStatus`: returns the current mock state of the payout (PENDING for the first 3 seconds, SUCCESS thereafter).

Naira amount is computed as `sats * DEMO_BTC_NGN_RATE / 100_000_000`. Display only; no real money moves.

The mock should look identical to real Bitnob from the caller's perspective. In v2, swapping `BitnobMockClient` for `BitnobRealClient` is a single line change.

## Push notification dispatch

On order settlement (PENDING → PAID):

1. Look up the seller's push subscriptions from the `PushSubscription` table.
2. For each subscription, send a Web Push notification with payload:
   ```json
   {
     "title": "Sale on Bitscy!",
     "body": "You just sold '<product title>' for ₦<naira amount>",
     "icon": "/icons/icon-192.png",
     "url": "/seller/orders/<orderId>"
   }
   ```
3. Use the `web-push` library. Handle failures gracefully — if a subscription is invalid (410 status), delete it from the database.

Sellers opt in to push during onboarding. Buyers don't get push in v1.

## Seller dashboard balance

Adaeze's dashboard shows her sats balance. This reads directly from her Breez wallet, not from Bitscy's database. The Breez SDK provides a `getBalance()` method.

For the dashboard, expose `GET /api/wallet/balance` which proxies to the seller's Breez wallet. Cache for 10 seconds to avoid hammering Breez on dashboard refresh.

## Known gotchas

- **Breez SDK wallet initialization is async.** Cache the initialized SDK instance per seller. Don't reinitialize on every request.
- **BOLT-11 invoices expire** (default 1 hour from Breez). If an invoice hasn't settled by expiry, mark the order CANCELLED in a cleanup job.
- **Payment hashes are unique.** Use this as your primary lookup key for settlement, not the BOLT-11 string.
- **bigint serialization.** Use string serialization at every API boundary. JSON can't handle bigint directly.
- **NIP-04 vs NIP-44.** NIP-04 is older but more widely supported in client libraries. We use NIP-04 for v1. NIP-44 is the v2 upgrade path.
- **Webhook idempotency.** Breez may retry webhooks. The atomic update pattern handles this automatically — repeats are no-ops.
- **Web Push payload size.** Keep notifications under 4KB. Don't put the entire order in the payload; include the order ID and let the client fetch detail.
- **Demo amounts.** Use small mainnet sats (under 1000 sats) for the demo. Mainnet is more authentic than signet but cap the dollar exposure.

## Repository function naming

Same convention as Catalog:
- `findX` for unique lookups
- `listX` for paginated lists
- `createX`, `updateX` for mutations
- `markX` for state transitions (e.g., `markPaid`, `markShipped`)

Service functions in `src/services/commerce/service.ts` compose repository calls plus Lightning operations plus Nostr publishing plus notifications.

## What success looks like

By demo day, the full purchase flow works on stage:

1. Tobi taps "Buy" on Adaeze's product.
2. QR code appears.
3. Tobi pays from her Lightning wallet.
4. Within 5 seconds, Adaeze's phone lights up with a push notification: "Sale on Bitscy!"
5. The sats are in Adaeze's Breez wallet, self-custodial.
6. Adaeze taps "Withdraw" in her dashboard.
7. She picks a bank account, enters an amount, taps Confirm.
8. After 3 seconds, the UI shows "₦40,000 sent to GTBank ****1234."

Lightning payments work. Webhooks fire reliably. Notifications land. Sellers feel paid instantly. Buyers feel served instantly. The whole flow takes under 30 seconds on stage.

---

*End of Commerce CLAUDE.md.*
