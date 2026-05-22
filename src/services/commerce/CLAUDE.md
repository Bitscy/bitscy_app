# CLAUDE.md — Commerce (src/services/commerce/)

You're working in the Commerce role's code. The root `CLAUDE.md` covers project-wide context, shared types, conventions, and out-of-scope features. This file adds Commerce-specific context on top.

## What this role owns

Everything from the moment Tobi clicks "Buy with Lightning," through her payment landing in Adaeze's wallet, through Adaeze withdrawing the sats to her Nigerian bank account.

Specifically:

- Order creation and the full state machine
- Lightning invoice generation against the platform-owned Breez wallet
- Lightning Address routing (the `username@bitscy.com` LNURL-pay system)
- Payment detection (Breez SDK `paymentSucceeded` events + frontend polling, with race resolution)
- Per-seller balance ledger (`LedgerEntry` append-only table; current balance is `SUM(amountSats)` for the user)
- `PendingPayment` short-lived table that maps incoming `paymentHash` → `sellerId, orderId` so settlements credit the right seller
- Order Nostr events (kind 30019, NIP-04 encrypted content)
- Push notification dispatch on settlement
- Seller dashboard data: balance, recent orders, statistics
- Real Bitnob sandbox client (`src/services/payout/bitnob-client.ts`) for the NGN off-ramp
- CoinGecko pricing service for live BTC/NGN exchange rate (`src/services/pricing/coingecko.ts`)
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
- `POST /api/payout` — initiate NGN off-ramp via real Bitnob sandbox API
- `GET /api/payout/[id]` — fetch payout status (reads from local `Payout` table, which is updated by Bitnob webhook)
- `GET /api/wallet/balance` — seller's current sats balance
- `POST /api/notifications/subscribe` — register a Web Push subscription
- `GET /.well-known/lnurlp/[username]` — Lightning Address resolution endpoint

## SDKs and libraries you work with

**`@breeztech/breez-sdk-liquid`** — the Breez Nodeless SDK. The Liquid flavor handles infrastructure complexity without requiring node operations. In v1, used to operate the single platform-owned Breez wallet: invoice generation (`receivePayment`), payment detection (event listener fires `paymentSucceeded`), sending Lightning payments to Bitnob during withdrawals (`prepareSendPayment` + `sendPayment`), and platform wallet balance queries (used only for reconciliation, NOT for per-seller balances). The SDK is initialized once at server boot with `PLATFORM_BREEZ_MNEMONIC`. Use the `/node` subpath: `require('@breeztech/breez-sdk-liquid/node')`.

**Web Push protocol** — for notifications. Use the `web-push` npm library to dispatch notifications from the server. VAPID keys in env vars.

**NIP-04 encryption** — for shipping addresses in order events. Use `nip04.encrypt(secretKey, recipientPubkey, plaintext)` from `nostr-tools`. The buyer encrypts to the seller's pubkey before sending to the server.

**`fetch` for Bitnob and CoinGecko** — both are simple REST APIs. No SDK needed. Real HTTP calls with proper error handling. See `src/services/payout/bitnob-client.ts` and `src/services/pricing/coingecko.ts`.

**Prisma** — same as Catalog. All DB through Prisma. Transactions for atomic state changes, especially anywhere the ledger is touched.

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
3. Backend creates `Order` record (status `PENDING`). Locks the product stock atomically.
4. Backend calls the platform Breez wallet's `receivePayment({ amountSats, description })` to generate a BOLT-11 invoice.
5. Backend stores `{ paymentHash, sellerId, amountSats, orderId, expiresAt }` in a `PendingPayment` table. This is how we know which seller to credit when the payment settles.
6. Backend returns the invoice (`bolt11`, `paymentHash`, `expiresAt`) plus the NGN-equivalent (live CoinGecko rate) to the frontend.
7. Frontend displays QR code. Tobi pays from either an external Lightning wallet (Phoenix, Wallet of Satoshi, etc.) OR a Bitscy-embedded Breez wallet (see Experience role for the embedded wallet).
8. One of two settlement paths fires first:
   - **Breez SDK `paymentSucceeded` event** on the platform wallet (the SDK fires events from the connected event listener — see Section 5 of the Integration Flow doc).
   - **Frontend polling** to `/api/lightning/verify/[paymentHash]` every 2 seconds.
9. Either way, the handler runs `OrderService.markPaid(paymentHash)`. This:
   - Looks up the `PendingPayment` by `paymentHash` to get `{ sellerId, orderId, amountSats }`.
   - Atomically updates Order from `PENDING` to `PAID` (using `WHERE status = 'PENDING'`).
   - Sets `paidAt` timestamp.
   - Creates a `SALE` `LedgerEntry` for the seller (positive `amountSats`, with `refId = orderId` and `recordedNgnRate` from the live CoinGecko rate at this moment).
   - Decrements product stock (if not already).
   - Constructs Nostr kind 30019 order event with NIP-04 encrypted shipping content.
   - Signs with `SYSTEM_NSEC` for anonymous buyers, or buyer's key if they have one.
   - Publishes to all configured relays.
   - Dispatches Web Push notification to the seller.
   - Deletes the `PendingPayment` (it's no longer needed).
10. Frontend, on next poll or via the response to its current poll, sees status `PAID` and renders the success screen.

## Race condition resolution

Both the Breez SDK `paymentSucceeded` event handler and the frontend polling can trigger `markPaid` for the same payment. The atomic update handles this:

```typescript
const updated = await prisma.order.updateMany({
  where: {
    paymentHash: hash,
    status: 'PENDING', // only update if still pending
  },
  data: {
    status: 'PAID',
    paidAt: new Date(),
  },
});

if (updated.count === 0) {
  // Already processed by the other path. Idempotent return.
  return getOrderByPaymentHash(hash);
}

// We won the race. Now publish Nostr event and send notification.
```

This is the pattern. Don't deviate.

## Webhook and event signature verification

**Breez SDK** does NOT use webhooks — it uses an event listener that runs in-process. The platform wallet is initialized at server boot with `addEventListener`, and `paymentSucceeded` events fire directly into the Node.js process when payments settle. No signature verification needed; the events come from your own SDK instance.

**Bitnob webhooks** are real and require signature verification. Use the shared secret from `BITNOB_WEBHOOK_SECRET`. Bitnob signs the request payload; the handler must verify the signature header before trusting any state changes. Reject any webhook with an invalid signature (return 401). See Bitnob's webhook docs for the exact signing scheme.

The webhook handler at `/api/webhooks/bitnob`:

1. Reads the signature header.
2. Verifies against `BITNOB_WEBHOOK_SECRET`.
3. If invalid → return 401.
4. If valid → parse the payload, update the relevant `Payout` record (status, completedAt).
5. Return 200 OK.

## The Lightning Address system

Every seller has a Lightning Address: `<username>@bitscy.com`. When an external Lightning wallet pays this address, the LNURL-pay flow:

1. Wallet GETs `https://bitscy.com/.well-known/lnurlp/<username>`
2. Server returns LNURL-pay metadata: `{ callback, maxSendable, minSendable, metadata, tag: 'payRequest' }`. The metadata mentions both Bitscy and the seller's display name.
3. Wallet GETs the `callback` URL with `?amount=<millisats>`.
4. Server calls the **platform Breez wallet** `receivePayment({ amountSats })` to generate an invoice. Records `{ paymentHash, sellerId, amountSats }` in `PendingPayment` with `orderId = null` (it's a direct LNURL pay outside the marketplace flow).
5. Server returns `{ pr: <bolt11>, routes: [] }` to the wallet.
6. Wallet pays the BOLT-11 invoice.
7. Breez SDK `paymentSucceeded` event fires; handler credits the seller's ledger.

For internal Bitscy checkout flow, you can skip the LNURL step and call `receivePayment` directly on the platform wallet. The LNURL path is for external Lightning wallets that don't know about Bitscy's checkout API.

**Invoices are generated by the platform Breez wallet, not by per-seller wallets.** This is the v1 architecture. See `Bitscy_Integration_Flow.md` Sections 2 and 5 for the full rationale.

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

## The Bitnob sandbox integration (real, no mocks)

Lives in `src/services/payout/bitnob-client.ts`. This is a real HTTP client that calls Bitnob's sandbox endpoints.

Base URL: `https://sandboxapi.bitnob.co/api/v1` (from `BITNOB_API_BASE` env var). Auth: `Authorization: Bearer ${BITNOB_API_KEY}`.

The client interface:

```typescript
interface BitnobClient {
  initiatePayout(amountSats: bigint, bankAccount: BankAccount): Promise<PayoutResult>;
  getStatus(payoutId: string): Promise<PayoutResult>;
  verifyWebhookSignature(signature: string, payload: string): boolean;
}
```

### The withdrawal flow (real, end-to-end)

When Adaeze withdraws her balance to NGN:

1. Adaeze taps "Withdraw to bank" in the dashboard. Picks an amount and a saved bank account.
2. Bitscy backend validates: amount ≤ her current ledger balance, ≥ Bitnob minimum, valid bank.
3. Backend calls Bitnob's payout endpoint with `{ amount, currency: 'NGN', customer, bankDetails }`. Bitnob returns a Lightning invoice that Bitscy must pay.
4. Backend calls the platform Breez wallet's `sendPayment({ destination: bitnobInvoice })`. Real Lightning. Sats leave the platform wallet.
5. On success: create a `WITHDRAWAL` ledger entry (negative `amountSats`) for Adaeze. Create a `Payout` record with the Bitnob payout ID and status `PENDING`.
6. Return `PayoutResult` to the frontend. UI shows "₦42,300 to GTBank \*\*\*\*1234. Tracking..."
7. Bitnob's webhook fires when the NGN payout completes (sandbox: usually 5-30 seconds). Webhook handler verifies signature with `BITNOB_WEBHOOK_SECRET`, then updates the `Payout` record to `SUCCESS`.
8. UI updates: "Withdrawal complete."

### Failure modes — must handle these explicitly

- **Bitnob payment-initiate fails (network, downtime):** Show error to user. Do NOT debit ledger. Retry button.
- **Platform Breez wallet `sendPayment` fails after Bitnob invoice issued:** Mark `Payout` as `FAILED`. Do NOT debit ledger. Log discrepancy, page the team.
- **Bitnob NGN payout fails AFTER our Lightning succeeds:** This is the worst case — our sats are gone but seller didn't get naira. Bitnob's API should refund the Lightning payment back to the platform wallet. Listen for the Bitnob refund event, credit the seller back via an `ADJUSTMENT` ledger entry with a clear description tying it to the failed payout.
- **Webhook signature verification fails:** Reject with 401. Do not trust the payload. Do not update the `Payout` record.

### The framing for the demo

Sandbox = real Lightning testnet routing, real Bitnob API responses, no real NGN to a real bank. In the pitch:

> "Bitscy integrates with Bitnob — a Nigerian fintech providing the Lightning-to-naira off-ramp. In production, this routes real naira from a seller's sats balance to her Nigerian bank account in under 60 seconds. For this demo we're on Bitnob's sandbox — every API call is real, the Lightning routing is real, the response is real. Production access requires KYB approval which we'll start post-hackathon."

This is true and demonstrable. The judges see real integration work; we're explicit about why no real naira moves on stage. Do NOT pretend this is production.

### The platform Breez wallet — the source of withdrawal funds

The platform wallet is a single Breez SDK Liquid wallet operated by Bitscy. Its mnemonic is in `PLATFORM_BREEZ_MNEMONIC`. It is initialized once at server boot via `connect({ config, mnemonic })`. Per-seller balances are tracked in the ledger; the actual sats sit in this one wallet.

**The wallet's actual balance must always equal `SUM(all positive LedgerEntry amounts) - SUM(all negative LedgerEntry amounts) - operating sweep`.** Drift is a bug. Add a reconciliation endpoint that any team member can hit before the demo: `GET /api/admin/reconcile`. It compares the Breez wallet's actual balance with the ledger sum and returns the diff.

### What about Bitnob's own Lightning Address feature

Bitnob offers `<username>@bitnob.io` Lightning addresses. We do NOT use this. Bitscy operates its own Lightning Addresses on its own domain. Bitnob is exclusively the off-ramp. Keep these concerns separate.

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

## Seller dashboard balance — computed from the ledger

Adaeze's dashboard shows her sats balance. This is computed as `SUM(LedgerEntry.amountSats WHERE userId = adaeze.id)`, NOT read from a per-seller Breez wallet (there isn't one in v1).

The NGN display value is computed by multiplying the sats balance by the current CoinGecko BTC/NGN rate (cached 60s) and dividing by 100_000_000.

For the dashboard, expose `GET /api/wallet/balance` which:

1. Queries the ledger sum for the authenticated seller.
2. Reads the cached BTC/NGN rate.
3. Returns `{ balanceSats: string, balanceNgnDisplay: string, recordedAt: string }`.

Cache the response at the edge for 10 seconds to avoid hammering the DB on dashboard refresh.

**Do NOT query the platform Breez wallet for individual seller balances.** The platform wallet's balance is the sum across all sellers and is irrelevant to any one user. Only the ledger gives per-seller balances.

## The ledger service

Lives in `src/services/commerce/ledger.ts`. The seller balance system is entirely Postgres-based — no Breez wallet introspection per seller.

The core operations:

```typescript
// Add an entry. ALWAYS use this; never insert directly into LedgerEntry.
async function recordEntry(input: {
  userId: string;
  amountSats: bigint; // positive = credit, negative = debit
  type: LedgerEntryType;
  refId?: string;
  description: string;
  recordedNgnRate: bigint;
}): Promise<LedgerEntry>;

// Get a seller's current balance.
async function getBalance(userId: string): Promise<bigint>;

// Reconciliation — compare ledger sum against platform Breez wallet balance.
// Returns the diff. Used by /api/admin/reconcile before demo.
async function reconcile(): Promise<{
  ledgerTotal: bigint;
  platformWalletBalance: bigint;
  diff: bigint;
}>;
```

### Invariants you MUST preserve

- Ledger entries are immutable. Never update a row. Corrections use a new `ADJUSTMENT` entry.
- Every Lightning settlement on the platform wallet produces exactly one `SALE` ledger entry (idempotent via `PendingPayment` lookup).
- Every successful withdrawal produces exactly one `WITHDRAWAL` ledger entry, written ONLY after the Breez `sendPayment` to Bitnob has confirmed.
- `recordedNgnRate` is captured at the moment of the entry, snapshotted from the live CoinGecko rate. This way historical NGN values are stable even when rates change.

### The withdrawal ordering matters

When Adaeze withdraws, the strict ordering is:

1. Call Bitnob `initiatePayout` → receive invoice.
2. Call platform Breez wallet `sendPayment(bitnobInvoice)` → wait for confirmation.
3. **Only after** Breez confirms the payment, write the `WITHDRAWAL` ledger entry.

Reverse this order at your peril — debiting the ledger before the Lightning payment confirms means a failed payment leaves the seller's balance incorrect.

## The CoinGecko pricing service

Lives in `src/services/pricing/coingecko.ts`. Provides the live BTC/NGN exchange rate. Free tier, no API key required.

```typescript
// Returns the current BTC/NGN rate. Cached for 60s.
async function getBtcNgnRate(): Promise<{
  ratePerBtc: bigint; // e.g., 145723000 means 1 BTC = ₦145,723,000
  recordedAt: string; // ISO timestamp of when we fetched it
  stale: boolean; // true if we returned cached data older than 5min
}>;

// Convert sats to NGN display value using the current rate.
async function satsToNgn(sats: bigint): Promise<bigint>;
```

Endpoint: `GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=ngn`. Cache in-memory (a Map with timestamp) or Vercel KV if available. Cache key: `btc_ngn_rate`.

### Failure mode

If CoinGecko is unreachable, return the most recent cached rate even if stale, with `stale: true`. Surface the staleness in the UI (a small "rate updated 7 min ago" indicator). Never block a user flow because of a rate fetch failure.

### Where it gets called

- Displaying NGN-equivalent prices on browse, product detail, checkout pages.
- Computing seller dashboard balance NGN display.
- Snapshotting `recordedNgnRate` into `LedgerEntry` at the moment of a SALE or WITHDRAWAL.
- Computing the displayed NGN amount before withdrawal confirmation.

## Known gotchas

- **Platform Breez SDK initialization is async.** Initialize once at server boot, cache the SDK instance. Do not reinitialize on every request. Initialization can take 2-5 seconds.
- **BOLT-11 invoices expire** (default 1 hour from Breez). If an invoice hasn't settled by expiry, mark the order `CANCELLED` and the corresponding `PendingPayment` should be cleaned up by a cron job (`/api/cron/expire-pending`).
- **Payment hashes are unique.** Use this as your primary lookup key for settlement and `PendingPayment`, not the BOLT-11 string.
- **bigint serialization.** Use string serialization at every API boundary. JSON can't handle bigint directly. Same goes for `LedgerEntry.amountSats`, `PendingPayment.amountSats`, etc.
- **NIP-04 vs NIP-44.** NIP-04 is older but more widely supported in client libraries. We use NIP-04 for v1. NIP-44 is the v2 upgrade path.
- **Settlement idempotency.** The Breez SDK fires `paymentSucceeded` events; if the server restarts mid-settlement, events may replay. The `WHERE status = 'PENDING'` atomic update pattern handles this — repeats are no-ops.
- **Web Push payload size.** Keep notifications under 4KB. Don't put the entire order in the payload; include the order ID and let the client fetch detail.
- **Demo amounts.** Use small mainnet sats (under 5,000 sats) for the demo. Mainnet is more authentic than signet but cap the dollar exposure. The platform wallet should never hold more than ~100,000 sats in operating balance — daily sweep to cold storage.
- **Ledger reconciliation drift.** The platform Breez wallet's actual balance should equal `SUM(LedgerEntry amounts) - operating sweep`. If it drifts, that's a bug — every credit/debit must be paired with a real Lightning event. Run `/api/admin/reconcile` before the demo.
- **Bitnob sandbox quirks.** Sandbox response times can be slower than production. Bitnob testnet routing occasionally hiccups. Build the UI to handle 30-second-plus waits gracefully (progress bar, not a spinner).
- **PLATFORM_BREEZ_MNEMONIC must never be logged.** Add explicit redaction. A leaked mnemonic compromises every pending seller balance.

## Repository function naming

Same convention as Catalog:

- `findX` for unique lookups
- `listX` for paginated lists
- `createX`, `updateX` for mutations
- `markX` for state transitions (e.g., `markPaid`, `markShipped`)

Service functions in `src/services/commerce/service.ts` compose repository calls plus Lightning operations plus Nostr publishing plus notifications.

## Build sequence — the order to build commerce features

This is the longest and most sequenced role because of the external integrations. Build in this order. Do not skip a feature's smoke test — Lightning and Bitnob failures are subtle and compound quickly if you stack untested features on top of each other.

### Day 0 prerequisites — get these BEFORE writing any commerce code

Block on obtaining all of these. Don't start C-feature work until they're in your `.env.local`:

1. **Breez API key.**
   - Where: https://breez.technology/request-api-key/#contact-us-form-sdk
   - Cost: Free
   - Lead time: Email turnaround, usually same-day on weekdays
   - Goes into: `BREEZ_API_KEY`

2. **Platform Breez wallet mnemonic.**
   - Generate a 12-word mnemonic using a trusted tool (the Breez CLI, or `bip39` library).
   - Back up the mnemonic in 1Password AND on paper. If lost, all pending seller balances are unrecoverable.
   - Goes into: `PLATFORM_BREEZ_MNEMONIC` (encrypted in Vercel env vars)

3. **Bitnob sandbox account + API key.**
   - Where: https://sandbox.bitnob.co (sign up)
   - Cost: Free
   - Lead time: Email verification, ~15 minutes
   - Goes into: `BITNOB_API_KEY`, `BITNOB_API_BASE=https://sandboxapi.bitnob.co/api/v1`

4. **Bitnob webhook secret.**
   - Generate after creating webhook subscription in Bitnob dashboard.
   - Goes into: `BITNOB_WEBHOOK_SECRET`

5. **CoinGecko endpoint smoke-tested.**
   ```bash
   curl 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=ngn'
   ```
   Should return a JSON with `bitcoin.ngn` as a large number. No key needed.

If you can't obtain any of these, escalate to the team lead immediately. Commerce work is blocked without them.

---

### Feature M1 — CoinGecko pricing service (start here, no external blocker)

**Prerequisites:** None. This is the warm-up.

**Build:** `src/services/pricing/coingecko.ts` exporting:

```typescript
async function getBtcNgnRate(): Promise<{ ratePerBtc: bigint; recordedAt: string; stale: boolean }>;
async function satsToNgn(sats: bigint): Promise<bigint>;
```

In-memory cache with 60s TTL. On fetch failure, return cached value with `stale: true`. Never throw to the caller.

**Smoke test:**

```typescript
// In a test script:
const rate1 = await getBtcNgnRate();
console.log(rate1); // expect a real rate
const rate2 = await getBtcNgnRate(); // immediate second call
console.log(rate2.recordedAt === rate1.recordedAt); // expect true (cached)
```

**Acceptance criteria:**

- First call hits CoinGecko, returns a sane rate (NGN per BTC, currently ~₦145M).
- Second call within 60s returns the cached value (verify by checking timestamps).
- After 60s, a call refreshes from CoinGecko.
- If CoinGecko returns 5xx, function returns the stale cache without throwing.
- `satsToNgn(100_000_000n)` returns the same value as `ratePerBtc`.

**Risks:** CoinGecko rate limits on the free tier are 10-30 calls/min. The 60s cache keeps us well under.

---

### Feature M2 — Platform Breez wallet connection (the foundation)

**Prerequisites:** All Day 0 deps in place. `BREEZ_API_KEY` and `PLATFORM_BREEZ_MNEMONIC` set.
**External dep:** Read the Breez SDK Liquid docs at https://sdk-doc-liquid.breez.technology, especially Getting Started and Receiving Payments.

**Build:** `src/services/lightning/breez-platform.ts` exporting:

```typescript
async function connectPlatformWallet(): Promise<LiquidSdk>; // singleton, cached
async function getWalletInfo(): Promise<{
  balanceSat: bigint;
  pendingSendSat: bigint;
  pendingReceiveSat: bigint;
}>;
async function addEventHandler(handler: (event: SdkEvent) => void): Promise<string>;
```

The `connectPlatformWallet` function must be idempotent — multiple callers get the same SDK instance. Initialize once on first call.

Use `require('@breeztech/breez-sdk-liquid/node')` (NOT the `/web` submodule — that's for browser).

**Smoke test:**

```typescript
// src/scripts/test-breez-connect.ts
import { connectPlatformWallet, getWalletInfo } from '@/services/lightning/breez-platform';

const sdk = await connectPlatformWallet();
console.log('Connected. SDK instance:', !!sdk);
const info = await getWalletInfo();
console.log('Balance:', info.balanceSat, 'sats');
```

Run: `pnpm tsx src/scripts/test-breez-connect.ts`

**Acceptance criteria:**

- Connection succeeds without errors.
- Wallet returns a balance (likely 0n on first run).
- Connecting a second time returns the same SDK instance, not a fresh one (verify by reference equality).
- No mnemonic appears in logs (test by running with `DEBUG=*` and grepping output).

**Risks:**

- WASM loading on the server can be slow. First connect takes 3-8 seconds. Don't initialize on every request.
- If `BREEZ_NETWORK=mainnet` but the mnemonic was generated for signet, the wallet will derive a different address. Pick one network and stick with it (use `signet` for development, switch to `mainnet` only for the final demo).

---

### Feature M3 — Fund the platform wallet (manual operational step)

**Prerequisites:** M2 complete.

This isn't code — it's an operational task. Send a small amount of Lightning sats to the platform wallet so it has working balance for test receives and sends.

**Build:**

- Use the SDK's `receivePayment` to generate a BOLT-11 invoice (5000 sats).
- Pay it from any external Lightning wallet (your own Phoenix, Wallet of Satoshi, etc.).
- Wait for the event to fire on the platform wallet.

**Acceptance criteria:** `getWalletInfo().balanceSat` shows ~5000 sats (minus swap fees).

**Risks:** If you accidentally fund mainnet vs signet wallets with mismatched networks, the funds are stuck. Triple-check `BREEZ_NETWORK` before sending.

---

### Feature M4 — Receive payment + event handling (the core mechanic)

**Prerequisites:** M2 + M3 complete.

**Build:** Extend `breez-platform.ts`:

```typescript
async function createInvoice(
  amountSats: bigint,
  description: string,
): Promise<{ bolt11: string; paymentHash: string; expiresAt: Date }>;
```

Plus register a global event handler at server boot:

```typescript
addEventHandler(async (event) => {
  if (event.type === 'paymentSucceeded' && event.payment.paymentType === 'Receive') {
    await handleIncomingPayment(event.payment.paymentHash, event.payment.amountSat);
  }
});
```

Where `handleIncomingPayment` is a stub for now — just logs the paymentHash. The real ledger logic comes in M7.

**Smoke test:**

- Call `createInvoice(1000n, 'test')`.
- Pay it from an external wallet.
- Watch the server log for the `handleIncomingPayment` line firing.

**Acceptance criteria:**

- Invoice generation returns in <1s.
- BOLT-11 is decodable and points to the right amount.
- After external payment, the event handler fires within 30s.
- The platform wallet balance increases by approximately the invoice amount (minus tiny swap fee).

**Risks:** If the event handler is registered per-request instead of at boot, you'll miss events. Register it ONCE in `app.ts` or in a module-level initialization.

---

### Feature M5 — Ledger service (Postgres-only, no Lightning involvement)

**Prerequisites:** Catalog C1 complete (database tables exist, including `LedgerEntry`).

**Build:** `src/services/commerce/ledger.ts`:

```typescript
async function recordEntry(input: {
  userId: string;
  amountSats: bigint;
  type: LedgerEntryType;
  refId?: string;
  description: string;
  recordedNgnRate: bigint;
}): Promise<LedgerEntry>;
async function getBalance(userId: string): Promise<bigint>;
async function reconcile(): Promise<{
  ledgerTotal: bigint;
  platformWalletBalance: bigint;
  diff: bigint;
}>;
```

**Smoke test:**

```typescript
// Test script
await recordEntry({
  userId: 'test-user',
  amountSats: 1000n,
  type: 'SALE',
  description: 'test sale',
  recordedNgnRate: 145000000n,
});
const bal = await getBalance('test-user');
console.log(bal); // expect 1000n

await recordEntry({
  userId: 'test-user',
  amountSats: -300n,
  type: 'WITHDRAWAL',
  description: 'test wd',
  recordedNgnRate: 145000000n,
});
const bal2 = await getBalance('test-user');
console.log(bal2); // expect 700n
```

**Acceptance criteria:**

- Recording a positive entry increases the balance.
- Recording a negative entry decreases it.
- `getBalance` for an unknown user returns 0n (not an error).
- Entries are immutable — there is no `updateEntry` function (only `recordEntry` with an `ADJUSTMENT` type for corrections).
- `reconcile` returns 0 diff when ledger matches platform wallet (within sweep allowance).

**Risks:** Race conditions if two SALE entries write simultaneously for the same payment. Use the `PendingPayment` lookup as the deduplication key, not the user/amount combo.

---

### Feature M6 — PendingPayment table management

**Prerequisites:** M5 complete.

**Build:** Add `src/services/commerce/pending-payments.ts`:

```typescript
async function trackPendingPayment(input: {
  paymentHash: string;
  sellerId: string;
  amountSats: bigint;
  orderId?: string;
  description: string;
  expiresAt: Date;
}): Promise<void>;
async function findByPaymentHash(paymentHash: string): Promise<PendingPayment | null>;
async function deletePendingPayment(paymentHash: string): Promise<void>;
async function cleanupExpired(): Promise<number>; // returns count deleted
```

**Smoke test:** Track a pending payment, find it, delete it, find it again (expect null). Track one with past `expiresAt`, run cleanup, confirm deleted.

**Acceptance criteria:**

- All CRUD operations work.
- `cleanupExpired` removes entries past their expiry but leaves valid ones.
- Unique constraint on `paymentHash` (a duplicate insert errors cleanly).

---

### Feature M7 — Wire receive → ledger (the first real settlement)

**Prerequisites:** M4 + M5 + M6 complete.

**Build:** Implement the `handleIncomingPayment` stub from M4 properly:

1. Look up `PendingPayment` by `paymentHash`.
2. If not found, log and return (it's an external direct deposit, no ledger action).
3. If found, in a Prisma transaction:
   - Create a `SALE` ledger entry for `sellerId` with `amountSats` from the pending payment and `recordedNgnRate` from the current CoinGecko rate.
   - Delete the `PendingPayment`.

**Smoke test:**

- Pick a test sellerId.
- Call `createInvoice(1000n, 'test')` → get `paymentHash`.
- Call `trackPendingPayment({ paymentHash, sellerId, amountSats: 1000n, description: 'test' })`.
- Pay the invoice from an external wallet.
- After settlement, call `getBalance(sellerId)` → expect 1000n.
- Confirm the `PendingPayment` row is deleted.

**Acceptance criteria:**

- A successful Lightning receive produces exactly one `SALE` ledger entry.
- The `PendingPayment` is cleaned up.
- Re-firing the event (e.g., server restart replay) does NOT double-credit. Use a `WHERE paymentHash IN (SELECT ...)` pattern or the unique constraint on the pending payment to enforce idempotency.

**Risks:** This is the critical correctness point. Run the smoke test 3 times to be sure idempotency holds.

---

### Feature M8 — Order creation API

**Prerequisites:** M4 + M6 complete. Catalog C5 complete (Product table exists with data).

**Build:** `POST /api/orders`:

1. Require auth session.
2. Validate input (productId, encryptedShipping?).
3. Look up Product → get sellerId, priceSats.
4. Atomically decrement product stock with `WHERE stock > 0`. If 0 rows updated → return 409 "out of stock".
5. Create `Order` with status `PENDING`.
6. Call `createInvoice(priceSats, description)` → get bolt11 + paymentHash.
7. Call `trackPendingPayment({ paymentHash, sellerId, amountSats: priceSats, orderId, description, expiresAt })`.
8. Update Order with `invoiceBolt11`, `paymentHash`.
9. Return `{ order, bolt11, paymentHash, expiresAt, ngnDisplay }` (compute NGN via M1).

**Smoke test:** Create an order for an existing product. Verify the Order row, the PendingPayment row, and the returned invoice can be decoded by a Lightning wallet.

**Acceptance criteria:**

- Order created with all expected fields.
- Stock decrement is atomic — running two concurrent orders for a single-stock product results in exactly one success and one 409.
- The returned BOLT-11 amount matches the product price.

**Risks:** Stock race condition. The `WHERE stock > 0 AND id = ?` in the update query is non-negotiable.

---

### Feature M9 — Order settlement flow

**Prerequisites:** M7 + M8 complete.

**Build:** Extend `handleIncomingPayment` to also handle order settlements:

1. After looking up PendingPayment, if `orderId` is set:
   - Atomically update `Order` from `PENDING` to `PAID` with `paidAt = now()`. If 0 rows updated → already settled, return idempotently.
   - Continue with M7's ledger entry creation.
2. Publish Nostr kind 30019 order event (NIP-04 encrypted shipping content if present).
3. Dispatch Web Push to the seller.

**Smoke test:**

- Create an order.
- Pay the invoice from external wallet.
- Within 30s, verify:
  - Order status = `PAID`.
  - Seller's balance increased.
  - Nostr event published.
  - (Skip push notification for this test — covered in M12.)

**Acceptance criteria:**

- Order state machine transitions PENDING → PAID correctly.
- The atomic update prevents double-settlement.
- A failed Nostr publish does NOT roll back the settlement (logged, but order is still PAID).

---

### Feature M10 — Frontend polling endpoint

**Prerequisites:** M9 complete.

**Build:** `GET /api/lightning/verify/[paymentHash]` returns `{ settled: boolean; settledAt: string | null }`. Simple lookup against `Order.status === 'PAID'`. Cache for 1 second to handle rapid polling.

**Acceptance criteria:** Frontend can poll every 2 seconds; response time consistently <100ms.

---

### Feature M11 — Bitnob client (sandbox integration)

**Prerequisites:** Day 0 Bitnob keys obtained. Read Bitnob's docs at https://docs.bitnob.com.

**Build:** `src/services/payout/bitnob-client.ts`:

```typescript
async function initiatePayout(amountSats: bigint, bankAccount: BankAccount): Promise<PayoutResult>;
async function getStatus(payoutId: string): Promise<PayoutResult>;
function verifyWebhookSignature(signature: string, payload: string): boolean;
```

**Smoke test:**

```typescript
// Don't actually initiate a payout yet — just verify the API connection.
const response = await fetch(`${BITNOB_API_BASE}/wallets`, {
  headers: { Authorization: `Bearer ${BITNOB_API_KEY}` },
});
console.log(response.status); // expect 200
```

**Acceptance criteria:**

- Authenticated request returns 200.
- Auth with a bad key returns 401 cleanly (verify error handling).
- `verifyWebhookSignature` returns false for a manually-tampered payload.

---

### Feature M12 — Withdrawal flow

**Prerequisites:** M5 + M11 complete. Platform wallet has test balance.

**Build:** `POST /api/payout`:

1. Auth.
2. Validate amount ≤ seller balance.
3. Call `bitnob.initiatePayout(amount, bankAccount)` → get Lightning invoice.
4. Call platform wallet `sendPayment(invoice)`.
5. **Only after** Breez send confirms, write a `WITHDRAWAL` ledger entry (negative amount).
6. Create `Payout` record with Bitnob payout ID, status `PENDING`.
7. Return `PayoutResult`.

Add webhook handler `POST /api/webhooks/bitnob` that verifies signature and updates Payout status.

**Smoke test:**

- Seed a test user with 5000 sats of balance (manual ledger entry).
- Initiate a 1000-sat withdrawal.
- Watch the platform wallet balance decrease by ~1000 sats.
- Watch the ledger balance for the seller decrease by 1000.
- Wait for Bitnob webhook to fire.
- Confirm Payout status updates to SUCCESS.

**Acceptance criteria:**

- The strict ordering is preserved: Bitnob → Breez send → Ledger debit. Never debit before Breez confirms.
- A Breez send failure leaves the ledger untouched.
- A Bitnob webhook with bad signature is rejected.

**Risks:** If you debit the ledger before Breez confirms and Breez fails, the seller is silently overcharged. This is the highest-impact bug in the system.

---

### Feature M13 — Push notifications

**Prerequisites:** M9 complete. VAPID keys set.

**Build:** `POST /api/notifications/subscribe` to accept browser subscription. Dispatch from M9's settlement flow.

**Acceptance criteria:** Seller's browser receives a push notification within 5s of a sale on their account.

---

### Feature M14 — Reconciliation endpoint

**Prerequisites:** M5 + M2 complete.

**Build:** `GET /api/admin/reconcile` (no auth in v1, but log every call). Returns ledger sum vs platform wallet actual balance and the diff. Run before every demo.

**Acceptance criteria:** After a series of test settlements, diff is 0 (within rounding for swap fees, which we'll need to track separately in v2).

---

### Cross-role integration test (run before demo day)

This is the end-to-end test that proves all three roles fit together. Run it after Catalog, Commerce, AND Experience have completed their build sequences.

1. **Setup:** Adaeze (seller) signed up via Catalog C2. Has 2 products via C8. Has a saved bank account.
2. **Browse:** Tobi (buyer) browses products via Experience pages.
3. **Buy:** Tobi taps Buy. Order created via Commerce M8. QR shown in UI (Experience).
4. **Pay:** Tobi pays the BOLT-11 with any Lightning wallet.
5. **Settle:** Order goes to PAID via Commerce M9. Ledger entry created via M7. Nostr event published. Push notification sent to Adaeze via M13.
6. **Verify (UI):** Tobi sees the success screen. Adaeze's dashboard shows the new sale.
7. **Withdraw:** Adaeze taps Withdraw → picks bank → confirms.
8. **Off-ramp:** Bitnob receives Lightning payment via M12. Webhook fires. Payout status SUCCESS.
9. **Reconcile:** Run `/api/admin/reconcile` → diff is 0.

If steps 1-9 all pass cleanly twice in a row, the system is demo-ready.

---

By demo day, the full purchase flow works on stage:

1. Tobi taps "Buy" on Adaeze's product.
2. QR code appears with NGN-equivalent (live CoinGecko rate) displayed next to it.
3. Tobi pays from her Lightning wallet (external OR Bitscy-embedded — both real).
4. Within 5 seconds, Adaeze's phone lights up with a push notification: "Sale on Bitscy!"
5. The sats settled in the platform Breez wallet; Adaeze's balance increased via a real `SALE` ledger entry. Her dashboard reflects this instantly.
6. Adaeze taps "Withdraw" in her dashboard.
7. She picks a bank account, enters an amount, taps Confirm.
8. Bitscy calls Bitnob's sandbox API → pays the resulting Lightning invoice from the platform wallet → Bitnob processes the NGN payout.
9. Within 5-30 seconds, the UI shows "₦42,300 sent to GTBank \*\*\*\*1234."

Lightning payments work (real, mainnet). Webhooks fire reliably (Bitnob sandbox). Notifications land. The ledger records every movement. Sellers feel paid instantly. Buyers feel served instantly. The whole flow takes under 60 seconds on stage. Sandbox naira does not actually appear in a real bank account — that's explained honestly in the pitch.

---

_End of Commerce CLAUDE.md._
