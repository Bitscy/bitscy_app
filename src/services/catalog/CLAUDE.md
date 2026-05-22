# CLAUDE.md — Catalog (src/services/catalog/)

You're working in the Catalog role's code. The root `CLAUDE.md` covers project-wide context, the shared types, conventions, and out-of-scope features. This file adds Catalog-specific context on top of that.

## What this role owns

Everything from the moment Adaeze opens the app for the first time, through her listing a product, through her product being visible and shareable to the world.

Specifically:

- User and seller onboarding (signup, profile, server-side key management)
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
- Auth on the client side (Experience role generates buyer keys client-side; this role handles server-side auth verification only)

If you find yourself reasoning about orders, Lightning, or payments, stop. That's the Commerce engineer's territory.

## API endpoints you own

- `POST /api/auth/signup` — create User, generate Nostr keypair server-side for buyers, accept npub for NIP-07 sellers
- `POST /api/auth/login` — verify a NIP-07 signed challenge, issue session
- `POST /api/auth/logout` — clear session
- `GET /api/products` — paginated list with filters (category, sellerId)
- `GET /api/products/[id]` — single product
- `POST /api/products` — create (auth: seller)
- `PATCH /api/products/[id]` — update (auth: owner)
- `DELETE /api/products/[id]` — soft-delete (sets status to UNLISTED)
- `GET /api/shop/[username]` — seller profile + active products
- `POST /api/upload` — Cloudinary signed upload URL
- `POST /api/nostr/publish` — publish a signed event to configured relays
- `GET /api/nostr/profile/[npub]` — fetch kind 0 profile (with caching)

## SDKs and libraries you work with

**`nostr-tools`** — the standard JavaScript library for Nostr. Use for: keypair generation (`generateSecretKey`, `getPublicKey`), event signing (`finalizeEvent`), event encoding/decoding, relay publishing via `SimplePool`.

**Cloudinary Node SDK** — for signed uploads. Generate a signature server-side, client uploads directly to Cloudinary using the signature. Files never pass through your server. Resize on upload (Cloudinary transformation params), don't store originals at full resolution.

**Prisma** — ORM. All DB access through Prisma. Use `prisma.product.findMany()` etc. Generate types from the schema; don't hand-write database row types.

## The Postgres → Nostr publishing pattern

This is the reusable primitive for everything you publish. Use it consistently.

1. Open a Prisma transaction.
2. Create or update the Postgres record.
3. Build the Nostr event object with the correct kind, tags, and content.
4. Sign the event using the user's key (server-side using `SYSTEM_NSEC` for buyers, or pass-through from NIP-07 for sellers).
5. Publish to all configured relays via `SimplePool.publish()`.
6. Update the Postgres record with the event ID (so we have a back-reference).
7. Commit the transaction.

If relay publishing fails, the Postgres record still exists. Don't fail the whole operation because one relay was down. Log the failure, return success to the caller. The data is still canonical in Postgres; the Nostr copy is best-effort.

## Common patterns you'll write

**Creating a product:**

```typescript
// Pseudocode
async function createProduct(input: CreateProductInput, seller: User): Promise<Product> {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data: { ...input, sellerId: seller.id } });
    const event = buildProductEvent(product, seller);
    const signedEvent = finalizeEvent(event, getSellerKey(seller));
    await publishToRelays(signedEvent);
    const updated = await tx.product.update({
      where: { id: product.id },
      data: { nostrEventId: signedEvent.id },
    });
    return updated;
  });
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

For sellers with NIP-07 (browser extension):

1. Server issues a random challenge string.
2. Client signs the challenge with their Nostr private key via NIP-07.
3. Server verifies the signature against the claimed pubkey.
4. Server issues an HTTP-only session cookie.

For buyers (no NIP-07 expected):

- Auto-generate a keypair server-side on first purchase.
- Encrypt the private key with a buyer-supplied passphrase (use `crypto.subtle` AES-GCM).
- Store encrypted private key in the User record.
- Issue session cookie.

Sessions are HTTP-only cookies, 7-day expiry, refreshed on each authenticated request.

## Known gotchas

- **`nostr-tools` event signing.** Use `finalizeEvent(eventTemplate, secretKey)`. The template needs `kind`, `created_at`, `tags`, `content`. The function adds `id`, `pubkey`, `sig`.
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

### Feature C1 — Database connection and Prisma client

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

### Feature C2 — User signup (server-generated Nostr key path)

**Prerequisites:** C1 complete. `SYSTEM_NSEC` env var generated and set. `SESSION_SECRET` set.

**Build:**

- `POST /api/auth/signup` endpoint that:
  1. Accepts `{ username, password, displayName }`.
  2. Validates username uniqueness (DB constraint + nice error).
  3. Generates a fresh Nostr keypair using `generateSecretKey` + `getPublicKey` from `nostr-tools`.
  4. Encrypts the private key using AES-GCM with a key derived from the user's password (use `crypto.subtle.deriveKey` with PBKDF2, ≥100k iterations).
  5. Stores `{ npub, encryptedKey, salt, iv }` in the `User` row alongside username.
  6. Issues an HTTP-only session cookie (signed with `SESSION_SECRET`, 7-day expiry).
  7. Returns `{ user: User }` (no key material).

**Smoke test:**

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testseller","password":"correcthorsebatterystaple","displayName":"Test Seller"}'
```

Expect a 200 with `{ user: {...} }` and a `Set-Cookie` header.

**Acceptance criteria:**

- Signup creates a User row visible in Supabase.
- `npub` matches what `getPublicKey(secretKey)` returns for the secret.
- Duplicate username returns a clean 409 error, not a 500.
- Encrypted key cannot be decrypted without the password (verify by trying a wrong password and confirming decryption fails).
- Session cookie is HttpOnly, Secure (in production), SameSite=Lax.

**Risks:** Storing keys with weak encryption is worse than not encrypting at all. Use PBKDF2 with ≥100k iterations, not raw SHA256. Test the wrong-password path.

---

### Feature C3 — User login

**Prerequisites:** C2 complete.

**Build:**

- `POST /api/auth/login` endpoint that:
  1. Looks up the user by username.
  2. Decrypts the stored key with the provided password.
  3. If decryption succeeds → issue session cookie.
  4. If decryption fails → return 401 with neutral error ("invalid credentials" — never reveal whether the username exists).
- `POST /api/auth/logout` clears the cookie.
- `GET /api/auth/me` returns the current user (or 401).

**Smoke test:** Sign up, log out, log back in. Confirm the session cookie changes and `GET /api/auth/me` reflects the new state.

**Acceptance criteria:**

- Correct password → session issued.
- Wrong password → 401 with no information leak.
- Logout invalidates the session (next `/api/auth/me` returns 401).
- Brute-force protection: rate limit `/api/auth/login` to 5 attempts per IP per minute.

**Risks:** Timing attacks on the username lookup. Use a constant-time comparison or always run the decryption attempt even on unknown usernames.

---

### Feature C4 — Cloudinary signed upload

**Prerequisites:** C1 complete. Cloudinary signed preset `bitscy_products` exists (✅ already done). `CLOUDINARY_*` env vars set.

**Build:**

- `POST /api/upload` endpoint that:
  1. Requires authenticated session (any logged-in user).
  2. Accepts `{ filename, contentType, sizeBytes }`.
  3. Validates: ≤5MB, image MIME type only.
  4. Generates a Cloudinary signed upload URL using `cloudinary.utils.api_sign_request`.
  5. Returns `{ uploadUrl, params }` to the client.
- The client uploads directly to Cloudinary using the signature; the file never passes through Bitscy's server.

**Smoke test:**

```bash
# Get an upload URL
curl -X POST http://localhost:3000/api/upload \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg","sizeBytes":50000}'

# Then use the returned URL with curl --form to upload an actual image.
# Confirm the image appears at the expected Cloudinary URL.
```

**Acceptance criteria:**

- Logged-in user can request and use a signed upload URL.
- Unsigned upload to Cloudinary fails (proving the preset is signed-only).
- The returned Cloudinary URL is publicly accessible and shows the uploaded image.
- Validation rejects oversize or non-image files cleanly.

**Risks:** A misconfigured Cloudinary preset (allowing unsigned uploads) is a security bug — anyone could fill the account. Re-verify preset signing mode before declaring done.

---

### Feature C5 — Product creation (Postgres only, no Nostr yet)

**Prerequisites:** C2 + C4 complete.

**Build:**

- `POST /api/products` endpoint that:
  1. Requires authenticated session.
  2. Accepts `CreateProductInput` (see shared types).
  3. Validates with Zod schema.
  4. Inserts into the `Product` table with `sellerId = session.userId`, `status = 'ACTIVE'`.
  5. Returns the created Product.

**Smoke test:**

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{"title":"Lagos Sunset","description":"Acrylic on canvas","priceSats":"5000","shippingSats":"500","category":"paintings","images":["https://res.cloudinary.com/dbx8nta1v/image/upload/v1/bitscy/products/test.jpg"],"isDigital":false,"stock":1}'
```

**Acceptance criteria:**

- Product appears in DB with correct sellerId and all fields.
- Required fields rejected if missing (Zod validation returns clean 400).
- Non-authenticated request returns 401.
- A user cannot create a product as another seller (sellerId always comes from session, never from input).

**Risks:** Trusting client-provided sellerId is a privilege escalation bug. Always pull it from the session.

---

### Feature C6 — Product read endpoints

**Prerequisites:** C5 complete.

**Build:**

- `GET /api/products` — paginated list with optional filters (`category`, `sellerId`). Default page size 20.
- `GET /api/products/[id]` — single product with seller info joined.
- `GET /api/shop/[username]` — seller's profile + active products.

**Smoke test:**

```bash
curl http://localhost:3000/api/products
curl http://localhost:3000/api/products/<id>
curl http://localhost:3000/api/shop/testseller
```

**Acceptance criteria:**

- List endpoint returns 20 most recent active products by default.
- Single product endpoint returns 404 cleanly for non-existent IDs.
- Shop endpoint excludes products with status `UNLISTED`.
- Response shape matches the `Product` type from shared types exactly.

**Risks:** N+1 queries when joining seller info. Use Prisma `include`, not separate queries per product.

---

### Feature C7 — Nostr publishing service (foundational)

**Prerequisites:** C5 complete. `NEXT_PUBLIC_NOSTR_RELAYS` env var set.
**External dependency:** Verify the relay list is live — for each relay in the env var, ping it with `wscat -c wss://relay.damus.io` and confirm it accepts a connection. If any relay is dead, find a replacement from https://nostr.watch.

**Build:**

- `src/services/nostr/publisher.ts` exporting:
  ```typescript
  publishEvent(event: SignedEvent): Promise<{ acceptedBy: string[]; failedRelays: string[] }>;
  ```
- Uses `SimplePool` from `nostr-tools`. Publishes to all configured relays in parallel with a 5-second timeout per relay.
- Returns successes and failures separately. Does NOT throw if some relays fail — best-effort.

**Smoke test:**

```bash
# Create a minimal test script src/scripts/test-nostr.ts:
# - generateSecretKey()
# - finalizeEvent({ kind: 1, content: 'hello bitscy', tags: [], created_at: now })
# - publishEvent(signed)
# - Log results
pnpm tsx src/scripts/test-nostr.ts
```

Expect `acceptedBy.length >= 1`. Verify the event appears at https://relay.nostr.watch by searching by pubkey.

**Acceptance criteria:**

- Publishing a signed event returns at least one accepting relay.
- If you point at a known-dead relay, it appears in `failedRelays` but the whole call still resolves (not rejects).
- The event is queryable on at least one public relay scanner within 10 seconds.

**Risks:** Public relays are flaky. Always publish to at least 3. Don't gate user flows on relay confirmation.

---

### Feature C8 — Product creation with Nostr publishing

**Prerequisites:** C5 + C7 complete.

**Build:**

- Modify `POST /api/products` (from C5) to also:
  1. After the Postgres insert, construct a kind 30018 Nostr event with the product details (see root CLAUDE.md for the exact shape).
  2. Sign the event using the seller's decrypted private key (decrypted at login time and cached in session, OR re-decrypted from the User row using a short-lived token — pick one pattern and stick with it).
  3. Call `publishEvent`.
  4. Update the Product row with `nostrEventId = signedEvent.id`.
- Wrap steps 1-4 in a Prisma transaction so the product creation and event ID update are atomic. If Nostr publishing fails entirely (zero relays accept), still commit the product but leave `nostrEventId` null and log the failure.

**Smoke test:** Create a product via API. Confirm:

- Postgres row has the product.
- The Nostr event ID is set.
- Searching the event ID on https://relay.nostr.watch shows the event content matching the product.

**Acceptance criteria:**

- Every newly created product has a non-null `nostrEventId` in the happy path.
- If all relays fail, the product still exists in Postgres (logged warning).
- Product update (`PATCH`) republishes with the same `d` tag (replaceable event).

**Risks:** Slow relay timeout blocks the API response. Use a 5-second total timeout for the publish call.

---

### Feature C9 — Product update and soft-delete

**Prerequisites:** C8 complete.

**Build:**

- `PATCH /api/products/[id]` — update fields. Authorization check: `product.sellerId === session.userId`. Republish Nostr event with same `d` tag.
- `DELETE /api/products/[id]` — soft-delete (set status to `UNLISTED`). Republish Nostr event with `["status", "unlisted"]` tag.

**Smoke test:** Create → update title → delete. Verify each step in Postgres and on Nostr.

**Acceptance criteria:**

- Non-owner cannot update (returns 403).
- Soft-deleted products are excluded from `GET /api/products` and shop endpoints.
- Soft-deleted products are still readable by their owner.
- Order history referencing the product still works (`OrderItem.productTitle` was snapshotted at order time).

---

### Feature C10 — Profile publishing (Nostr kind 0)

**Prerequisites:** C2 + C7 complete.

**Build:**

- `PATCH /api/auth/profile` — update display name, bio, avatar (Cloudinary URL).
- After the Postgres update, publish a kind 0 Nostr event with `{ name, about, picture }` in the content.

**Acceptance criteria:**

- Profile update appears on Nostr relays under the user's pubkey.
- Profile data on https://primal.net/p/<npub> matches what's in Postgres.

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

If all 9 steps pass, Catalog role is functionally done and ready for the cross-role integration test (described at the end of the Commerce build sequence).

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
