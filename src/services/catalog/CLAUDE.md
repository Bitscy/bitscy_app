# CLAUDE.md — Catalog (src/services/catalog/)

You're working in the Catalog role's code. The root `CLAUDE.md` covers project-wide context, the shared types, conventions, and out-of-scope features. This file adds Catalog-specific context on top of that.

## What this role owns

Everything from the moment Adaeze opens the app for the first time, through her listing a product, through her product being visible and shareable to the world.

Specifically:

- User and seller onboarding (signup, login, profile) — see "Auth and session handling" for the client-side-crypto model
- Product CRUD (create, read, update, soft-delete)
- Image upload pipeline via Cloudinary
- Nostr publishing for products (kind 30018) and profiles (kind 0)
- The seller storefront API (`/api/shop/[username]`)
- The browse/discovery API (paginated product list across all sellers)
- The reusable Postgres-then-Nostr publishing pattern

## What this role does NOT own

- Lightning, invoices, payments (Commerce role)
- Order state machine (Commerce role)
- Real Bitnob sandbox integration and payouts (Commerce role)
- Seller balance ledger (Commerce role)
- CoinGecko price service (Commerce role)
- Frontend pages or components (Experience role)
- Client-side Nostr key generation, encryption, and signing (Experience role does this for both buyers and sellers; this role only persists the encrypted blob and verifies signatures)

If you find yourself reasoning about orders, Lightning, or payments, stop. That's the Commerce engineer's territory.

## API endpoints you own

**Auth** (all responses set / clear an HttpOnly session cookie signed with `SESSION_SECRET`):

- `POST /api/auth/signup` — create User. Accepts `{ username, displayName, role, npub, encryptedKey, salt, iv }` produced by the client. Server NEVER sees the password or plaintext nsec. Both buyer and seller signup hit this endpoint with different `role` values (`BUYER` | `SELLER`).
- `POST /api/auth/challenge` — given `{ username }`, return `{ challenge, encryptedKey, salt, iv, npub }` so the client can decrypt locally and sign the challenge. On unknown username, return a fake-but-shaped response to prevent enumeration.
- `POST /api/auth/login` — accepts `{ username, signedChallenge }`, verifies the signature against the stored npub, issues a session cookie. Works for both NIP-07 sellers and password-based users — the endpoint sees only a username + a signed challenge in both cases.
- `POST /api/auth/logout` — clear the cookie.
- `GET /api/auth/me` — return the current user (or 401). Used by every authenticated page to verify session state.
- `PATCH /api/auth/me` — update profile fields (`displayName`, `avatar`, `about`, `location`, `lightningAddr`). Republishes the kind-0 Nostr event.
- `POST /api/auth/change-password` — accept `{ encryptedKey, salt, iv }` (re-encrypted client-side with the new password) and replace the User's stored blob. Existing session stays valid.
- `POST /api/auth/recovery` — return `{ encryptedKey, salt, iv }` for the authenticated user so the client can decrypt and display the recovery phrase. Requires the active session.
- `POST /api/auth/close-shop` — soft-deactivate the seller: set `User.closedAt = now()` and cascade `Product.status = UNLISTED` for all of their products. Reversible by signing back in.

**Catalog:**

- `GET /api/products` — paginated list with filters (`category`, `sellerId`)
- `GET /api/products/[id]` — single product
- `POST /api/products` — create (auth: seller)
- `PATCH /api/products/[id]` — update (auth: owner)
- `DELETE /api/products/[id]` — soft-delete (sets status to UNLISTED)
- `GET /api/shop/[username]` — seller profile + active products

**Infrastructure:**

- `POST /api/upload` — Cloudinary signed upload URL
- `POST /api/nostr/publish` — publish a signed event to configured relays
- `GET /api/nostr/profile/[npub]` — fetch kind 0 profile (with caching)

## Required schema fields (beyond the current Prisma schema)

The Experience-role designs reference a couple of `User` fields that don't yet exist in `prisma/schema.prisma`. Add these before wiring the seller pages:

| Field             | Type        | Used by                                                                                |
| ----------------- | ----------- | -------------------------------------------------------------------------------------- |
| `User.location`   | `String?`   | Seller profile city line + storefront subtitle ("Handmade in Lagos, Nigeria")          |
| `User.closedAt`   | `DateTime?` | Soft shop closure (`/api/auth/close-shop` sets it; null = open, non-null = closed)     |

The encrypted-key fields (`encryptedKey`, `salt`, `iv`) are already implied by the client-side-crypto auth model below; if they aren't on the `User` model yet, add them as `String` columns at the same time.

When `User.closedAt` is non-null, treat the seller as suspended: `GET /api/shop/[username]` returns the profile with an empty product list and `closed: true`, browse / category lists exclude their products, and `POST /api/products` from their session is rejected with a clear error.

## SDKs and libraries you work with

**`nostr-tools`** — the standard JavaScript library for Nostr. Use for: keypair generation (`generateSecretKey`, `getPublicKey`), event signing (`finalizeEvent`), event encoding/decoding, relay publishing via `SimplePool`, signature verification via `verifyEvent`.

**Cloudinary Node SDK** — for signed uploads. Generate a signature server-side, client uploads directly to Cloudinary using the signature. Files never pass through your server. Resize on upload (Cloudinary transformation params), don't store originals at full resolution.

**Prisma** — ORM. All DB access through Prisma. Use `prisma.product.findMany()` etc. Generate types from the schema; don't hand-write database row types.

## The Postgres → Nostr publishing pattern

This is the reusable primitive for everything Bitscy publishes on behalf of a user. Use it consistently.

**The server never holds the user's secret key.** Events authored by a user are signed in the browser using their decrypted nsec (from IndexedDB) and sent to the server already signed. The server's job is to verify, persist, and forward to relays.

1. Receive the **pre-signed** Nostr event from the client alongside the request payload (e.g., `POST /api/products` accepts the product data AND `nostrEvent: SignedEvent`).
2. Verify the event:
   - `event.pubkey === session.user.npub` (the signer matches the authenticated user)
   - `verifyEvent(event)` returns true (signature is valid)
   - The event's `kind`, `tags`, and `content` match what the request claims (no signing one thing and storing another)
3. Open a Prisma transaction.
4. Create or update the Postgres record (using the data from the request, not the event content — Postgres is the typed authority for queryable fields).
5. Update the Postgres record with `nostrEventId = event.id`.
6. Commit the transaction.
7. Publish the signed event to all configured relays via `SimplePool.publish()` (outside the transaction, so a slow relay doesn't hold a DB lock).

The system-signed kind 0 path is the only exception: if the user updates non-essential profile fields and we need a kind 0 republish, the client still produces and signs the event. `SYSTEM_NSEC` exists for *Bitscy-authored* events (e.g., system announcements), not user-authored ones.

If relay publishing fails entirely, the Postgres record still exists with a null `nostrEventId`. Don't fail the whole operation because one relay was down. Log the failure, return success to the caller. The data is still canonical in Postgres; the Nostr copy is best-effort.

## Common patterns you'll write

**Creating a product:**

```typescript
// Pseudocode — runs server-side after the client has signed the kind 30018 event in the browser
async function createProduct(
  input: CreateProductInput,
  signedEvent: SignedNostrEvent,
  session: Session,
): Promise<Product> {
  if (signedEvent.pubkey !== session.user.npub) throw new HttpError(403, 'PUBKEY_MISMATCH');
  if (!verifyEvent(signedEvent)) throw new HttpError(400, 'INVALID_SIGNATURE');
  assertEventMatchesProduct(signedEvent, input); // kind, tags, content sanity check

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: { ...input, sellerId: session.user.id, nostrEventId: signedEvent.id },
    });
    return created;
  });

  // Best-effort relay fan-out; don't block the API response on slow relays.
  void publishToRelays(signedEvent);

  return product;
}
```

**Looking up a seller for the Commerce engineer:**

The Commerce engineer needs to look up a seller's Lightning Address and pubkey when creating an order. Expose this helper:

```typescript
export async function getSellerByUsername(username: string): Promise<SellerInfo | null> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.role !== 'SELLER') return null;
  return {
    id: user.id,
    username: user.username,
    npub: user.npub,
    lightningAddress: user.lightningAddr ?? '',
    displayName: user.displayName,
  };
}
```

This is the single point of contact between Catalog and Commerce. Don't expand the surface.

## Nostr event construction

Refer to the root CLAUDE.md for the canonical event shapes (kind 0, 30018, 30019). Key reminders:

- **Tags are arrays of strings.** Don't pass objects.
- **The `d` tag is the unique identifier** for replaceable events (kind 30018). Use the product ID.
- **Content for kind 30018 is JSON-stringified**, not a raw object.
- **Never modify content after signing.** Event IDs are computed from content; mutation invalidates the signature.

## Image upload flow

1. Client requests `POST /api/upload` with image metadata (name, type, size).
2. Server validates (max 5MB, image MIME types only), generates Cloudinary signed upload params with a transformation preset (max 2048px, auto-quality, auto-format).
3. Server returns the signed upload URL and form fields to the client.
4. Client uploads directly to Cloudinary using the signature.
5. Client receives back the final Cloudinary URL.
6. Client passes the URL to `POST /api/products` as part of the `images` array.

You do not store images on your server. You do not store image binaries in Postgres. Only Cloudinary URLs.

## Auth and session handling

**Mission constraint: Bitscy never sees the user's password or plaintext Nostr secret key.** Everything cryptographic happens client-side. The server only ever stores an opaque encrypted blob and verifies signed challenges.

### Signup (`POST /api/auth/signup`)

The client does the heavy lifting:

1. Client generates a fresh Nostr keypair via `nostr-tools` `generateSecretKey` + `getPublicKey`.
2. Client derives a key from the user's password using `crypto.subtle.deriveKey` with PBKDF2 (SHA-256, ≥100,000 iterations, random 16-byte salt).
3. Client encrypts the secret key with AES-GCM (random 12-byte IV).
4. Client POSTs `{ username, displayName, role, npub, encryptedKey, salt, iv }` to the server. **The password and plaintext nsec never leave the browser.**
5. Server validates username uniqueness, persists `{ username, displayName, role, npub, encryptedKey, salt, iv }` on the `User` row, issues an HMAC-signed HttpOnly session cookie via `src/lib/session.ts`, returns the safe `User` shape.

The client also stores the plaintext nsec in IndexedDB (encrypted-at-rest with the same key) so subsequent product creations can sign without re-prompting for the password.

### Login (challenge-response)

NIP-07 sellers and password-only users go through the same shape; only the local signing path differs.

1. Client `POST /api/auth/challenge` with `{ username }`.
2. Server looks up the user. On match, returns `{ challenge, encryptedKey, salt, iv, npub }`. On miss, returns a **shape-identical fake response** with random bytes to prevent username enumeration.
3. Client decrypts the secret key locally (PBKDF2 → AES-GCM unwrap). If decryption fails (wrong password), the client never contacts the server again — the failure is purely client-side.
4. Client signs the challenge with the secret key (or via NIP-07 if available) and POSTs `{ username, signedChallenge }` to `/api/auth/login`.
5. Server verifies the signature against the stored `npub`. On success, issues the session cookie.

This gives us:

- **Zero-knowledge auth.** A database breach reveals only encrypted blobs.
- **No timing oracle.** The server runs the same DB lookup and same response shape regardless of whether the username exists.
- **No password reset.** The recovery phrase IS the reset mechanism — see below.

### Session

- HttpOnly, Secure (in production), SameSite=Lax, 7-day expiry.
- Cookies are HMAC-signed with `SESSION_SECRET` (see `src/lib/session.ts`).
- Refreshed on each authenticated request that mutates state.

### Changing password (`POST /api/auth/change-password`)

The client re-derives a key from the new password, re-encrypts the secret key, and POSTs the new `{ encryptedKey, salt, iv }`. The server replaces the stored blob. No server-side verification of the *old* password is possible — that check happens client-side by attempting to decrypt the current blob first.

### Recovery phrase reveal (`POST /api/auth/recovery`)

Returns the encrypted blob to the authenticated client; the client decrypts using the password the user re-enters in the UI, then displays the 12-word mnemonic (or hex nsec) once. Useful for the "Show recovery phrase" flow in seller settings.

### Closing a shop (`POST /api/auth/close-shop`)

Soft-deactivate: set `User.closedAt = now()` and cascade `Product.status = UNLISTED` for that seller's products in the same transaction. The user can still sign back in — closure is reversible, not account deletion.

### Rate limiting

`/api/auth/challenge` and `/api/auth/login` are rate-limited per IP (5 attempts per minute). Repeated failures don't reveal whether the username exists, but they do throttle the requesting IP.

## Username slug derivation

The seller chooses a *display* shop name during signup ("Adaeze's Studio"). The Catalog backend derives the URL-safe `username` slug used in `/shop/[username]`, the seller's Lightning Address (`<username>@bitscy.com`), and the kind-0 / kind-30018 author identity.

**Rules** (applied in order):

1. Lowercase.
2. NFKD-normalize and strip combining marks (so `é → e`).
3. Replace any run of characters NOT in `[a-z0-9]` with a single hyphen.
4. Trim leading and trailing hyphens.
5. Collapse consecutive hyphens.
6. Reject if length < 3 or > 30 characters.
7. Reject if the slug is in the reserved list below.
8. If the slug already exists in the `User` table, append `-2`, `-3`, ... and re-check. Cap at `-99`; if none free, return a clean 409 asking the user to choose another name.

**Reserved usernames** (cannot be claimed; preserve for routing and admin):

```
admin, api, app, auth, bitscy, buyer, cart, checkout, dashboard,
help, home, login, logout, me, marketplace, nostr, orders, payout,
products, profile, search, sell, seller, settings, shop, signup,
support, system, terms, wallet, www
```

Add new reserved words to this list before introducing new top-level routes. The check lives in `src/services/catalog/repository.ts` alongside the username uniqueness check.

## Known gotchas

- **`nostr-tools` event signing.** Use `finalizeEvent(eventTemplate, secretKey)`. The template needs `kind`, `created_at`, `tags`, `content`. The function adds `id`, `pubkey`, `sig`.
- **`npub` is stored as hex (64-char hex string).** `event.pubkey` from nostr-tools is always hex — storing npub as hex means `event.pubkey === user.npub` works directly. When displaying to users, call `nip19.npubEncode(user.npub)` for the bech32 form.
- **Relay connection management.** Use `SimplePool` from `nostr-tools`. Don't open new connections per request — the pool handles connection reuse.
- **Cloudinary upload presets.** Make sure the unsigned upload preset is disabled in your Cloudinary dashboard. Always use signed uploads.
- **Product images array order matters.** First image is the cover. Preserve order on update.
- **Soft delete, not hard delete.** When a seller "deletes" a product, set status to UNLISTED. Don't actually delete the row — order history references it.
- **Username uniqueness.** Enforced at DB level. On collision during signup, surface a clear error to the client, don't retry silently.

## Repository function naming

Functions in `src/services/catalog/repository.ts` follow this naming:

- `findX` for single record lookups by unique field (e.g., `findUserByUsername`)
- `listX` for paginated/filtered lists (e.g., `listProductsByCategory`)
- `createX`, `updateX`, `deleteX` for mutations
- `getXOrThrow` if the function throws on not-found (use sparingly)

Service functions in `src/services/catalog/service.ts` compose repository calls plus Nostr publishing plus side effects.

## Build sequence — the order to build catalog features

Build features in this order. Do not start feature N+1 until feature N's acceptance criteria pass. Some features can be built in parallel with Commerce/Experience work; those are noted.

For each feature: read the prerequisites, gather any external accounts/keys needed, build, test, mark complete, move on.

### Feature C1 — Database connection and Prisma client ✅ done

**Prerequisites:** Supabase project created (✅ already done). `DATABASE_URL` and `DIRECT_URL` env vars set locally and in Vercel.

**Build:**

- Confirm `prisma/schema.prisma` matches the shared types from root CLAUDE.md (especially the `User`, `Product`, and any new tables from the Integration Flow doc like `LedgerEntry`, `PendingPayment`).
- Run `pnpm prisma generate`.
- Run `pnpm db:push` to sync the schema.

**Smoke test:**

```bash
pnpm prisma studio
```

Open the browser UI. Confirm all expected tables exist and you can read/write rows.

**Acceptance criteria:**

- All tables from the schema appear in Supabase Table Editor.
- The seed script (`pnpm db:seed`) runs without error and produces visible data.
- A test row inserted via Prisma Studio is readable in the Supabase web UI.

**Risks:** Pooler URL vs direct URL confusion. Prisma migrations need `DIRECT_URL`; runtime queries use the pooled `DATABASE_URL`.

---

### Feature C2 — User signup (client-side-crypto path) ✅ done

**Prerequisites:** C1 complete. `SESSION_SECRET` set. Required schema fields applied (`User.encryptedKey`, `salt`, `iv`, `location`, `closedAt`).

**Build:**

- `POST /api/auth/signup` endpoint that:
  1. Accepts `{ username: string, displayName: string, role: 'BUYER' | 'SELLER', npub: string, encryptedKey: string, salt: string, iv: string }`. **The server never receives the password or plaintext nsec.**
  2. Derives the URL-safe slug from `username` using the rules in "Username slug derivation". Validates it doesn't collide with reserved words.
  3. Validates slug uniqueness against the DB (clean 409 on collision).
  4. Validates the `npub` is a well-formed 32-byte hex pubkey (64 hex chars).
  5. Inserts the `User` row with `{ username: slug, displayName, role, npub, encryptedKey, salt, iv }`.
  6. Issues an HMAC-signed HttpOnly session cookie via `src/lib/session.ts` (7-day expiry).
  7. Returns the safe `User` shape from `src/types/shared.ts` (no key material).

The Experience role handles all key generation and encryption client-side (`nostr-tools` + `crypto.subtle`). This route is a thin persister.

**Smoke test:**

```bash
# Simulate what the client sends (in real flow, this comes from the browser)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username":"Adaeze Studio",
    "displayName":"Adaeze",
    "role":"SELLER",
    "npub":"<64 hex chars>",
    "encryptedKey":"<base64 ciphertext>",
    "salt":"<base64 16 bytes>",
    "iv":"<base64 12 bytes>"
  }'
```

Expect 200 with `{ user: { username: "adaeze-studio", ... } }` and a `Set-Cookie` header.

**Acceptance criteria:**

- Signup creates a User row in Supabase with the derived slug, not the raw display string.
- Duplicate slug returns a clean 409, never a 500.
- The server logs do NOT contain the encryptedKey, salt, or iv values (verify by tailing logs during signup).
- A request missing any of the six required fields returns a 400 with a typed error code, not a 500.
- The session cookie is HttpOnly, Secure (in production), SameSite=Lax.
- Reserved usernames (`admin`, `api`, etc.) are rejected.

**Risks:** Trusting client-supplied `npub` is fine — at worst, the user encrypts their own nonsense and can't log in later. But validate the hex format so we don't poison downstream Nostr publishing.

---

### Feature C3 — Challenge-response login ✅ done

**Prerequisites:** C2 complete.

**Build:**

- `POST /api/auth/challenge` endpoint that:
  1. Accepts `{ username }`.
  2. Looks up the user (case-insensitive on the derived slug).
  3. On match: generate a random 32-byte challenge (hex), return `{ challenge, encryptedKey, salt, iv, npub }`. Stash the challenge in a short-lived signed cookie (60-second TTL).
  4. On miss: return a **shape-identical** response with random bytes for `challenge`, `encryptedKey`, `salt`, `iv`, and a random-but-valid-shaped `npub`. The client will fail decryption and surface a generic "invalid credentials" — the server never tells either path apart.
- `POST /api/auth/login` endpoint that:
  1. Accepts `{ username, signedChallenge }` where `signedChallenge` is a full signed Nostr event (the client calls `finalizeEvent({ kind: 27235, content: challenge, tags: [] })` with their decrypted nsec).
  2. Reads the expected challenge from the signed challenge cookie.
  3. Verifies: `event.pubkey === stored npub`, `event.content === cookie challenge`, `verifyEvent(event) === true`.
  4. On valid — issue HMAC-signed HttpOnly session cookie via `src/lib/session.ts`. Clear the challenge cookie.
  5. On invalid or expired challenge — 401 with `{ error: { code: 'INVALID_CREDENTIALS' } }`.
- `POST /api/auth/logout` clears the session cookie.
- `GET /api/auth/me` returns the current `User` (or 401).

**Acceptance criteria:**

- Valid signature → session issued.
- Wrong password (client fails to decrypt, never reaches `/api/auth/login`) → no server-side trace.
- Forged signature → 401 with no information leak.
- Unknown username → `/api/auth/challenge` returns the same shape and roughly the same response time as a known username (within 50ms).
- Logout invalidates the session (next `/api/auth/me` returns 401).
- Rate limit: `/api/auth/challenge` and `/api/auth/login` capped at 5 attempts per IP per minute.

**Risks:** The challenge must be single-use — verify-then-clear, otherwise replay is trivial.

---

### Feature C4 — Cloudinary signed upload ✅ done

**Prerequisites:** C1 complete. Cloudinary signed preset `bitscy_products` exists. `CLOUDINARY_*` env vars set.

**Build:**

- `POST /api/upload` endpoint that:
  1. Requires authenticated session (any logged-in user).
  2. Accepts `{ filename, contentType, sizeBytes }`.
  3. Validates: ≤5MB, image MIME type only.
  4. Generates a Cloudinary signed upload URL using `cloudinary.utils.api_sign_request`.
  5. Returns `{ uploadUrl, params }` to the client.
- The client uploads directly to Cloudinary using the signature; the file never passes through Bitscy's server.

**Acceptance criteria:**

- Logged-in user can request and use a signed upload URL.
- Unsigned upload to Cloudinary fails (proving the preset is signed-only).
- The returned Cloudinary URL is publicly accessible and shows the uploaded image.
- Validation rejects oversize or non-image files cleanly.

---

### Feature C5 — Product creation (Postgres only, no Nostr yet) ✅ partial

**Prerequisites:** C2 + C4 complete.

**Build:**

- `POST /api/products` endpoint that:
  1. Requires authenticated session.
  2. Accepts `CreateProductInput` (see shared types).
  3. Validates with Zod schema.
  4. Inserts into the `Product` table with `sellerId = session.userId`, `status = 'ACTIVE'`.
  5. Returns the created Product.

**Acceptance criteria:**

- Product appears in DB with correct sellerId and all fields.
- Required fields rejected if missing (Zod validation returns clean 400).
- Non-authenticated request returns 401.
- A user cannot create a product as another seller (sellerId always comes from session, never from input).

---

### Feature C6 — Product read endpoints ✅ partial

**Prerequisites:** C5 complete.

**Build:**

- `GET /api/products` — paginated list with optional filters (`category`, `sellerId`). Default page size 20.
- `GET /api/products/[id]` — single product with seller info joined.
- `GET /api/shop/[username]` — seller's profile + active products.

**Acceptance criteria:**

- List endpoint returns 20 most recent active products by default.
- Single product endpoint returns 404 cleanly for non-existent IDs.
- Shop endpoint excludes products with status `UNLISTED`.
- Response shape matches the `Product` type from shared types exactly.

---

### Feature C7 — Nostr publishing service (foundational) ✅ done

**Prerequisites:** C5 complete. `NEXT_PUBLIC_NOSTR_RELAYS` env var set.

**Build:**

- `src/services/nostr/publisher.ts` exporting:
  ```typescript
  publishEvent(event: SignedEvent): Promise<{ acceptedBy: string[]; failedRelays: string[] }>;
  ```
- Uses `SimplePool` from `nostr-tools`. Publishes to all configured relays in parallel with a 5-second timeout per relay.
- Returns successes and failures separately. Does NOT throw if some relays fail — best-effort.

---

### Feature C8 — Product creation with Nostr publishing

**Prerequisites:** C5 + C7 complete.

**Build:**

- Modify `POST /api/products` to also:
  1. Accept a `nostrEvent: SignedNostrEvent` field on the request body alongside the product input. The client constructs the kind 30018 event in the browser, signs it with the user's decrypted nsec, and POSTs the signed event together with the product data. The server never sees the secret key.
  2. Verify the event: `event.pubkey === session.user.npub`, `verifyEvent(event) === true`, and the event's `d` tag matches the new product ID. Reject with 400 if any check fails.
  3. Insert the product row with `nostrEventId = event.id` set up front.
  4. Call `publishEvent(event)` outside the transaction (best-effort relay fan-out).

---

### Feature C9 — Product update and soft-delete

**Prerequisites:** C8 complete.

**Build:**

- `PATCH /api/products/[id]` — update fields. Authorization check: `product.sellerId === session.userId`. Republish Nostr event with same `d` tag.
- `DELETE /api/products/[id]` — soft-delete (set status to `UNLISTED`). Republish Nostr event with `["status", "unlisted"]` tag.

**Acceptance criteria:**

- Non-owner cannot update (returns 403).
- Soft-deleted products are excluded from `GET /api/products` and shop endpoints.
- Soft-deleted products are still readable by their owner.

---

### Feature C10 — Profile read + publishing (Nostr kind 0)

**Prerequisites:** C2 + C7 complete.

**Build:**

- `GET /api/auth/me` — return the current authenticated `User` (or 401).
- `PATCH /api/auth/me` — update `displayName`, `avatar` (Cloudinary URL), `about`, `location`, `lightningAddr`. Validate with Zod.
  - Accepts an optional `nostrEvent: SignedNostrEvent` (pre-signed kind 0 event from the client). If provided, verify and publish it. If not provided (e.g., buyer without a Nostr key), just update Postgres.
- After the Postgres update, if a signed event was provided, publish to all configured relays.

**Acceptance criteria:**

- `GET /api/auth/me` reflects the latest profile state immediately after a PATCH.
- Profile update appears on Nostr relays under the user's pubkey (when event is provided).
- `location` and `lightningAddr` round-trip through the API correctly.

---

### Feature C11 — Change password

**Prerequisites:** C2 + C3 complete.

**Build:**

- `POST /api/auth/change-password` endpoint that:
  1. Requires an authenticated session.
  2. Accepts `{ encryptedKey, salt, iv }` — the secret key re-encrypted client-side with the new password.
  3. Replaces those three fields on the authenticated user's `User` row in a single transaction.
  4. Returns `204`. The existing session cookie stays valid (user doesn't have to re-login).

---

### Feature C12 — Recovery phrase reveal

**Prerequisites:** C2 complete.

**Build:**

- `POST /api/auth/recovery` endpoint that:
  1. Requires an authenticated session.
  2. Returns `{ encryptedKey, salt, iv }` for the authenticated user.
- The client decrypts it (re-prompting for the password to confirm intent), converts the secret key to a 12-word BIP39 mnemonic, and displays it once.

---

### Feature C13 — Close shop (soft deactivation)

**Prerequisites:** C2 + C9 complete.

**Build:**

- `POST /api/auth/close-shop` endpoint that:
  1. Requires an authenticated session with `role === 'SELLER'`.
  2. Opens a Prisma transaction:
     - Set `User.closedAt = now()`.
     - Set `Product.status = 'UNLISTED'` for every active product by that seller.
  3. Returns `{ closedAt, unlistedCount }`.

---

### Feature C14 — Schema migration for `location` + `closedAt`

**Prerequisites:** C1 complete.

**Build:**

- Add to `User` model in `prisma/schema.prisma`:
  - `location String?`
  - `closedAt DateTime?`
  - `encryptedKey String?`, `salt String?`, `iv String?` (if not already present)
- Run `pnpm db:push` (dev) or tracked migration.
- Regenerate Prisma client: `pnpm prisma generate`.

---

### Catalog integration test (run before declaring Catalog done)

End-to-end sequence:

1. Sign up as `adaeze`.
2. Update profile (name, bio, avatar).
3. Upload 3 product images via Cloudinary.
4. Create 2 products.
5. Update one of them (price change).
6. Sign up as `tobi` (the buyer persona).
7. As tobi, browse `/api/products` → see adaeze's products.
8. View `/api/shop/adaeze` → see her profile and both active products.
9. Verify on a Nostr relay scanner that adaeze's pubkey shows: kind 0 profile event + 2 kind 30018 product events.

If all 9 steps pass, Catalog role is functionally done and ready for the cross-role integration test.

---

By demo day, Adaeze can:

1. Sign up in under 30 seconds.
2. Create her artist profile (name, bio, photo).
3. List a product in under 90 seconds (title, description, price, photos).
4. Get a shareable URL to her storefront (`bitscy.com/shop/adaeze`).
5. Edit or unlist a product instantly.

Tobi can:

1. Browse all products across all sellers from the home page.
2. Click into a seller's storefront and see their full catalog.
3. View any individual product with full details.

Every interaction reads from Postgres for speed, with Nostr as the canonical source. The artist owns her catalog regardless of what happens to Bitscy.

---

_End of Catalog CLAUDE.md._
