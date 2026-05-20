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
- Bitnob mock, payouts (Commerce role)
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
      data: { nostrEventId: signedEvent.id }
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

## What success looks like

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

*End of Catalog CLAUDE.md.*
