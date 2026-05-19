# Bitscy

A Bitcoin-native marketplace for African creative women.

Built on Bitcoin, Lightning, Nostr, and open-source eCash. Mobile-first PWA. Self-custodial seller wallets via Breez SDK. Naira off-ramp via Bitnob (mocked in v1). Identity via Nostr.

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up env
cp .env.example .env.local
# fill in DATABASE_URL, BREEZ_API_KEY, CLOUDINARY_*, SYSTEM_NSEC, etc.

# 3. Push the database schema
pnpm db:push

# 4. Seed with demo data
pnpm db:seed

# 5. Run the dev server
pnpm dev
```

The app runs at http://localhost:3000.

## Team roles

Each engineer owns a vertical slice of the product. Read `CLAUDE.md` files for context.

| Role | Directories | CLAUDE.md |
|------|------------|-----------|
| **Catalog Engineer** | `src/services/catalog/`, `src/app/api/products/`, `src/app/api/shop/`, `src/app/api/upload/`, `src/app/api/auth/`, `src/services/nostr/` | `src/services/catalog/CLAUDE.md` |
| **Commerce Engineer** | `src/services/commerce/`, `src/services/lightning/`, `src/services/payout/`, `src/app/api/orders/`, `src/app/api/lightning/`, `src/app/api/payout/`, `src/app/api/webhooks/` | `src/services/commerce/CLAUDE.md` |
| **Experience Engineer** | `src/app/` (except `/api/`), `src/components/`, `src/store/`, `src/hooks/`, plus deployment | `src/app/CLAUDE.md` |

Root-level `CLAUDE.md` is the team-wide context every engineer's Claude reads.

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm typecheck` — TypeScript without emitting
- `pnpm lint` — ESLint
- `pnpm format` — Prettier
- `pnpm db:push` — push schema to database without migration
- `pnpm db:migrate` — create a new migration
- `pnpm db:studio` — open Prisma Studio
- `pnpm db:seed` — populate with demo data

## Tech stack

- **Frontend:** Next.js 14 App Router, React, Tailwind, Zustand, next-pwa
- **Backend:** Next.js API routes, Prisma ORM, PostgreSQL
- **Lightning:** Breez SDK Nodeless (Liquid)
- **Naira off-ramp:** Bitnob API (mocked for v1)
- **Identity:** Nostr (nostr-tools, NIP-07, NIP-04)
- **Images:** Cloudinary
- **Hosting:** Vercel + Supabase/Neon

## Architecture

Four layers, see `CLAUDE.md` and the architecture doc for details:

1. **PWA client** — installable mobile-first web app
2. **Frontend** — Next.js App Router with Tailwind
3. **Backend** — Next.js API routes with Prisma
4. **Services** — Domain-driven business logic (catalog, commerce, lightning, payout, nostr, auth)

Lightning settlement uses Breez. Naira off-ramp uses Bitnob (mocked). Nostr is the canonical source for public data (products, orders); Postgres is the cache.

## Scope reminders

What v1 is NOT building: reviews, messaging, real Bitnob, dispute resolution, native apps, multi-language, shipping logistics, search beyond category filter. See root `CLAUDE.md` for the full list. If you find yourself drifting toward these, stop.

## Contributing

- Branch naming: `<role>/<short-description>` (e.g., `catalog/product-crud`, `commerce/breez-invoices`)
- Commit messages: imperative, lowercase first word ("add product creation endpoint")
- PRs go to `main`. Each PR should pass `pnpm typecheck` and `pnpm lint`.
- Update the relevant CLAUDE.md if you learn something the team should know.

## License

This is a hackathon project. License decided post-event.
