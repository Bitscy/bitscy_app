# CLAUDE.md — Experience (src/app/, src/components/, src/store/)

You're working in the Experience role's code. The root `CLAUDE.md` covers project-wide context, shared types, conventions, and out-of-scope features. This file adds Experience-specific context on top.

## Stack quick-reference (one-line facts that often drift)

- **Next.js 16** App Router. Dev: Turbopack. Prod build: `next build --webpack` (intentional — Serwist needs webpack).
- **React 19**. Server components by default; mark client components with `'use client'`.
- **Dynamic route `params` are Promises** in Next 16 — page components are `async` and `await params`.
- **Tailwind 4, CSS-first.** All design tokens live in `@theme` blocks inside `src/app/globals.css`. There is no `tailwind.config.ts`.
- **Fonts:** Inter (body, `font-sans`) and DM Serif Display (headings, `font-serif`), both via `next/font/google` in `src/app/layout.tsx`.
- **PWA:** `@serwist/next` (not `next-pwa`). Service worker source at `src/app/sw.ts`. Only loaded in production builds via a conditional `require` in `next.config.js`.
- **UI primitives:** shadcn (new-york style), in `src/components/ui/`, backed by Radix. `cn()` in `src/lib/utils.ts`.
- **Hooks:** custom hooks in `src/hooks/` (e.g., `use-mobile`, `use-toast`).
- **State:** Zustand stores in `src/store/`. No Redux, no Context for global state.
- **Package manager:** pnpm 9.

## What this role owns

Everything Adaeze and Tobi see. Every pixel, every transition, every error message. Plus the infrastructure that delivers it to their phones.

Specifically:

- Visual design system (colors, typography, spacing, components)
- All screen designs and React component implementations
- PWA setup: manifest, service worker, install prompt, offline behavior
- Mobile-first responsive layouts (Android-primary, iOS-aware)
- Frontend state management via Zustand stores
- Client-side image upload with compression
- Client-side Nostr key generation and IndexedDB storage
- Embedded Breez wallet for new buyers (client-side SDK integration)
- Vercel deployment pipeline, environment variables, custom domain
- Database hosting setup (Supabase or Neon, schema migrations)
- Production environment readiness for demo day

## What this role does NOT own

- Backend API logic (Catalog and Commerce engineers own their endpoints)
- Database schema design (defined in Prisma, owned by backend)
- Nostr event signing on the server (server-side Nostr is the Catalog engineer's territory)
- Lightning invoice generation on the server (Commerce engineer, against the platform Breez wallet)
- Bitnob sandbox client (Commerce engineer)
- The seller balance ledger (Commerce engineer)
- API endpoint definitions (you consume them, you don't define them)

You consume APIs through typed interfaces from `src/types/shared.ts`. If a field is missing, ask the owning engineer. Don't invent shapes.

## Pages you own

Inside `src/app/`:

**Marketing / public pages:**

- `/` — marketing landing page (hero, featured products preview, value props, how-it-works, mission, closing CTA, footer). The product surface; copy- and image-driven, not data-driven.
- `/marketplace` — browse grid (the actual product catalog). Was at `/` before the landing page took over.
- `/products/[id]` — product detail
- `/shop/[username]` — seller storefront *(not yet implemented)*
- `/checkout/[orderId]` — Lightning invoice + QR display
- `/checkout/[orderId]/success` — order success screen *(not yet implemented)*
- `/about`, `/faq`, `/contact`, `/terms`, `/privacy` — informational pages linked from the landing-page footer *(not yet implemented; the links 404 today)*

**Dashboard pages (auth required):**

- `/seller` — seller dashboard home (balance, recent orders)
- `/seller/products` — manage listings *(not yet implemented)*
- `/seller/products/new` — create listing *(not yet implemented)*
- `/seller/products/[id]/edit` — edit listing *(not yet implemented)*
- `/seller/orders` — incoming orders *(not yet implemented)*
- `/seller/orders/[id]` — order detail (decrypt shipping address) *(not yet implemented)*
- `/seller/withdraw` — bank withdrawal flow *(not yet implemented)*
- `/buyer/orders` — buyer's order history *(not yet implemented)*
- `/buyer/orders/[id]` — buyer's order detail *(not yet implemented)*

**Auth / onboarding pages:**

- `/sell` — seller onboarding entry point (landing-page "Open your shop" target) *(not yet implemented)*
- `/signin` — existing user sign-in (NIP-07 or passphrase) *(not yet implemented)*
- `/signup` — new buyer signup *(not yet implemented)*

The landing-page CTAs already point at `/sell` and `/signin`. When you scaffold those pages, do not change the route names without also updating `src/app/page.tsx`.

## Design system

The visual identity is warm, earth-tone, dignified. Not crypto-techno-blue. Not generic-fintech-purple. Think _trusted Nigerian community institution that happens to be modern._

**Color palette** (lives in `src/app/globals.css` as `@theme inline` tokens — Tailwind 4 is CSS-first, there is no `tailwind.config.ts`):

```
primary:    #2D5F5D  // deep indigo-green (the trust anchor)
accent:     #D67961  // warm coral (every CTA, every emphasis)
gold:       #E8B43D  // saffron / muted gold (numerals, accents)
background: #FBF7F0  // warm sand
surface:    #FFFFFF
foreground: #1F1410  // very dark brown (the "text" color)
muted:      #7D6F66  // warm gray
success:    #4A7C59  // muted green
error:      #B85049  // muted red, also serves as `destructive`
```

These are locked. Adding new colors needs a coordinated edit to `globals.css`. The earlier terracotta palette (#B85C38 primary, #E0B14A accent) was the placeholder used while the v0 design was being worked on; if you see it referenced anywhere, treat that as stale doc and update it.

Both shadcn-style vars (`--background`, `--foreground`, `--primary`, ...) and a Bitscy-namespaced set (`--color-bitscy-background`, `--color-bitscy-text`, ...) are exposed as Tailwind utilities, so `bg-background` / `bg-bitscy-background` / `text-muted` / `text-bitscy-text` all compile.

**Typography:**

- Headings: **DM Serif Display**, 400 weight, generous leading. Use `font-serif`.
- Body: **Inter**, regular, 16px minimum on mobile. Use `font-sans` (default).
- Numbers (sats, naira): tabular-nums variant for alignment via the `.tabular-nums` helper class.
- Never use system font; both Inter and DM Serif Display are loaded via `next/font/google` in `src/app/layout.tsx` and wired through the `--font-inter` / `--font-dm-serif` CSS variables.

**Spacing:**

- Tailwind's default scale (4px base)
- Page padding on mobile: 16px (px-4)
- Vertical rhythm: 24px between major sections (gap-6)
- Card padding: 16px (p-4)

**Component rules:**

- All buttons have minimum 44×44px tap targets.
- Primary actions are always at the bottom of the screen, within thumb reach.
- Forms are top-down, single-column.
- Images load progressively with a low-res placeholder via `next/image`.
- Empty states are encouraging, not blank ("No orders yet. Your first sale is coming.").

## PWA setup

The PWA is configured via **`@serwist/next`** (NOT `next-pwa`/`@ducanh2912/next-pwa`). The service worker source lives at `src/app/sw.ts`; Serwist generates `public/sw.js` at production build time. See the root CLAUDE.md and `next.config.js` for the exact wiring.

`next.config.js` uses a **conditional `require`** so Serwist is only loaded when `NODE_ENV === 'production'`. In dev (Turbopack), Serwist is not loaded at all — no webpack hook is injected and Turbopack runs clean. The production build runs with `next build --webpack` (the `--webpack` flag is intentional; see the comment at the top of `next.config.js`) and Serwist regenerates `public/sw.js`.

**The manifest** (`public/manifest.json`):

- App name: "Bitscy"
- Short name: "Bitscy"
- Display: `standalone` (full-screen, no browser chrome)
- Orientation: `portrait`
- Theme color: `#2C1810` (the manifest still uses the old dark-brown for `theme_color`; update to `#1F1410` when you next touch the manifest)
- Background color: `#FFFAF1` (sand — matches `--background`)
- Icons: 192×192 and 512×512 PNGs in `public/icons/` — ⚠️ the directory currently contains only `.gitkeep`. The referenced icons (`icon-192.png`, `icon-512.png`, `maskable-icon-512.png`) need to be added before the PWA install flow works end-to-end.

**Service worker caching strategy:**

- Browse pages, product detail, shop pages: `stale-while-revalidate` — show cached version instantly, fetch fresh in background
- Images from Cloudinary: `cache-first` with 7-day expiry
- Seller dashboard, checkout, wallet: `network-first` — always fresh, fall back to cache offline
- API responses: not cached except product lists (which use SWR-style caching)
- Static assets: `cache-first`

**Install prompt:**

- Show after the user has viewed at least one product (engagement signal)
- Use the `beforeinstallprompt` event on Android Chrome
- iOS users get a one-time hint to "Add to Home Screen" since iOS doesn't fire the install event
- After dismissal, don't show again for 14 days

## Mobile-first design rules

Every screen passes these checks:

- Renders correctly on 360×640 (smallest common Android viewport)
- All interactive elements are 44×44px minimum
- Primary action button is reachable with the thumb (bottom half of screen)
- No horizontal scroll, ever
- Forms don't require horizontal layouts on mobile
- Body text is 16px or larger (iOS auto-zooms below 16px)
- Tap targets have at least 8px space between them
- Modals are bottom sheets on mobile, not centered overlays
- Long lists virtualize (use `react-virtual` or similar for product browse)

## State management with Zustand

State is organized by domain. Each store is a single file in `src/store/`.

**`sessionStore`** — current user, auth status, role

```typescript
interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}
```

**`cartStore`** — single-item v1, but structured to support multi-item v2

```typescript
interface CartState {
  item: { productId: string; quantity: number } | null;
  setItem: (productId: string, quantity: number) => void;
  clear: () => void;
}
```

**`walletStore`** — buyer-side embedded Breez wallet ONLY (sellers don't have client-side wallets in v1; their balance comes from `GET /api/wallet/balance` which reads the server-side ledger).

```typescript
interface WalletState {
  isInitialized: boolean;
  balanceSats: bigint;
  initialize: (passphrase: string) => Promise<void>;
  payInvoice: (bolt11: string) => Promise<PaymentResult>;
}
```

**`keyStore`** — Nostr keypair management (client-side)

```typescript
interface KeyState {
  hasKey: boolean;
  npub: string | null;
  generateAndStore: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  signEvent: (event: NostrEvent) => Promise<SignedEvent>;
}
```

Don't reach for Redux. Don't reach for Context for global state. Zustand only.

## Client-side Nostr key generation

For buyers who don't have a NIP-07 extension:

1. On first purchase, prompt: "Create your Bitscy identity in one tap."
2. User sets a passphrase (this encrypts the key locally — Bitscy never sees the key or the passphrase).
3. Generate a new Nostr keypair using `generateSecretKey()` from `nostr-tools`.
4. Derive an encryption key from the passphrase using PBKDF2 (`crypto.subtle.deriveKey`).
5. Encrypt the private key (nsec) using AES-GCM with the derived key.
6. Store `{ encryptedKey, salt, iv, npub }` in IndexedDB.
7. On future sessions, prompt for the passphrase, derive the key, decrypt the nsec.
8. Optionally let the user export their nsec as a recovery phrase.

**Critical:** the passphrase never leaves the client. Never send it to the server. Never log it.

## Embedded Breez wallet for buyers (the self-custodial Lightning moment)

This is Bitscy's only self-custodial Lightning wallet in v1. Sellers use the platform-custodial model (one Breez wallet owned by Bitscy); buyers can opt into their own browser-resident wallet here.

For buyers who don't have an existing Lightning wallet:

1. On the checkout page, the QR code for the seller's invoice is displayed. Underneath it: "I don't have a Lightning wallet."
2. She taps it. Bitscy walks her through creating a Bitscy-embedded wallet.
3. Generate a fresh 12-word mnemonic client-side (use a strong entropy source — `crypto.getRandomValues`, not `Math.random`).
4. UI walks her through backup: shows the 12 words, asks her to write them down, then asks her to retype two random words to confirm. Do not let her skip the backup step.
5. Initialize Breez SDK Liquid in the browser using the `@breeztech/breez-sdk-liquid/web` submodule. WASM module must be loaded with `await init()` before any other SDK calls. First load is 5-10 seconds; show a clear progress indicator.
6. Derive an encryption key from a passphrase she sets (PBKDF2). Encrypt the mnemonic with AES-GCM. Store `{ encryptedMnemonic, salt, iv, npub }` in IndexedDB.
7. UI shows the wallet's receive address: "Your wallet is ready. Fund it by sending Bitcoin or Lightning to..." She funds it from an external source.
8. Once funded, she pays the seller's invoice using `prepareSendPayment` → `sendPayment` from her embedded wallet.

**Critical:** the mnemonic and passphrase NEVER leave the client. Bitscy never sees them. Never log them. Never send them to the server.

### What this demonstrates in the pitch

This is the Breez-forward moment. Tobi creates a real, self-custodial Lightning wallet in her browser — no app store, no separate downloads, no third party. She funds it, pays Adaeze, and the whole transaction is end-to-end Bitcoin without leaving the Bitscy PWA. This is the dramatic beat the pitch leans on for the "embedded Bitcoin" angle.

### Honest scope caveat

The embedded wallet is "stretch but achievable" — if time runs out in week 2, drop it and require buyers to use external wallets (Phoenix, Wallet of Satoshi, etc.). The demo still works either way because the seller's Lightning invoice can be paid by any Lightning wallet. But the embedded wallet is the most Breez-forward beat and should be prioritized after the core purchase flow is solid.

### What this is NOT

This is NOT the seller-side wallet. Sellers do not have client-side wallets in v1; their funds are in the platform-managed Breez wallet, tracked via the server-side ledger. The buyer-side embedded wallet is a different system. See `Bitscy_Integration_Flow.md` Sections 2 and 9 for the architecture.

## Image upload UX

Adaeze uploads up to 5 images per product. The flow:

1. User taps "Add photos" in the product form.
2. File picker opens (use `<input type="file" accept="image/*" multiple>`).
3. For each file:
   - Validate: max 25MB raw size, image MIME type.
   - Compress client-side using `browser-image-compression` or similar (target 1920px max width, 80% quality).
   - Show progress indicator per image.
   - Call `POST /api/upload` to get a Cloudinary signed URL.
   - Upload the compressed file directly to Cloudinary.
   - Add the returned Cloudinary URL to the product's images array in form state.
4. Display thumbnails of uploaded images. User can reorder by drag, or remove by tap.
5. First image is the cover (label it as such in the UI).

Show clear retry on failure. Don't lose other uploaded images if one fails.

## API consumption pattern

Always use the shared types. Always handle errors gracefully.

```typescript
// Good
import type { Product, GetProductsResponse } from '@/types/shared';

async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products');
  if (!res.ok) {
    const error = await res.json();
    throw new ApiError(error.code, error.message);
  }
  const data: GetProductsResponse = await res.json();
  return data.products;
}
```

Use SWR for data fetching that benefits from caching and revalidation:

```typescript
const { data, error, isLoading } = useSWR<Product[]>('/api/products', fetcher);
```

Show skeleton screens during loading, not spinners. Show clear retry on error, not red toasts.

## Loading and error states

Every page has three states minimum:

**Loading:** skeleton screens that match the shape of the eventual content. No spinners except for inline actions.

**Empty:** encouraging copy that suggests what to do next. Examples:

- No products yet: "Your shop is ready. List your first piece →"
- No orders yet: "No orders yet. Your first sale is on its way."
- No search results: "We couldn't find that. Try a different category."

**Error:** clear what went wrong, clear retry action. No technical jargon.

- Network error: "Connection issue. Tap to try again."
- 404: "We couldn't find that. Back to browse →"
- 500: "Something went wrong on our end. We're looking into it. Tap to retry."

## Deployment (Vercel)

Setup steps you own:

1. Connect GitHub repo to Vercel project.
2. Configure environment variables in Vercel dashboard (see root CLAUDE.md for the list).
3. Set up custom domain (`bitscy.com` or Vercel subdomain if domain registration is delayed).
4. Configure preview deployments for feature branches.
5. Set production branch to `main`.
6. Verify the build runs clean on Vercel (sometimes works locally but fails on Vercel due to environment differences).

Database setup:

1. Create Supabase or Neon project.
2. Set the connection string in Vercel env vars as `DATABASE_URL`.
3. Run Prisma migrations via `pnpm prisma migrate deploy` (the Catalog engineer manages schema; you run the deploy).

Cloudinary setup:

1. Create Cloudinary account (free tier).
2. Configure signed upload preset.
3. Set env vars in Vercel.

## Known gotchas

- **Service worker only runs in production builds.** The `next.config.js` conditional `require('@serwist/next')` keeps it out of dev entirely, so Turbopack runs clean. If you see stale assets in production, version the cache name in `src/app/sw.ts` on deploy.
- **`next dev` runs Turbopack; `next build --webpack` runs webpack.** The asymmetry is intentional — Serwist's default mode is webpack-only. Don't remove the `--webpack` flag from the build script unless you've migrated to `@serwist/turbopack` (experimental).
- **iOS PWA quirks.** Push notifications require home-screen installation (iOS 16.4+). Some browser APIs are restricted in PWA mode on iOS. Test on a real iPhone before assuming features work.
- **IndexedDB quotas.** Browsers can evict IndexedDB data when storage is low. Don't rely on it as the only copy of critical data. The user's Nostr key is critical — offer export to a recovery phrase early.
- **Tailwind 4 is CSS-first; there is no `tailwind.config.ts`.** All tokens live in `@theme` blocks inside `src/app/globals.css`. If a class is only used dynamically (e.g., `bg-${color}-500`), Tailwind 4 won't see it — prefer static class strings, or pre-declare a dummy reference somewhere in source so the JIT picks it up.
- **Next.js App Router server components.** By default, pages are server components. Mark client components with `'use client'` at the top. Hooks (`useState`, `useEffect`, Zustand) require client components.
- **`next/image` remote hosts.** `next.config.js` uses `images.remotePatterns` (not the older `domains` array). Cloudinary's `res.cloudinary.com` is already allowed; add new hosts there. Note that the marketing landing page currently uses plain `<img>` tags pointing at `images.unsplash.com`, so it doesn't need a `remotePatterns` entry — but if any of those switch to `next/image` you'll need to add the Unsplash host.
- **Hydration mismatches.** Anything that differs between server and client render (like reading from localStorage on first paint) causes hydration errors. Use `useEffect` for client-only state, or `dynamic(() => import(...), { ssr: false })`.
- **Next 16 dynamic route params are Promises.** `params` is `Promise<{ ... }>` not `{ ... }`. Page components must be `async` and `await params`. This catches anyone copying from a Next 14/15 v0 snippet.

## Component organization

Inside `src/components/`:

```
components/
├── product/           # ProductCard, ProductGrid, ProductForm, ProductImageUploader
├── shop/              # ShopHeader, ShopProductList
├── checkout/          # LightningInvoice, PaymentStatus, ShippingAddressForm
├── wallet/            # WalletBalance, SendReceive, TransactionList
├── nostr/             # NostrProfileBadge, RelayStatus
├── auth/              # NostrLoginButton, PassphraseSetup, KeyExport
├── layout/            # Navbar, BottomNav, PageWrapper
├── ui/                # Generic UI primitives (Button, Input, Modal, etc.)
└── pwa/               # InstallPrompt, OfflineIndicator
```

Components that are used in only one page can live alongside the page. Reusable components live in this directory.

## Build sequence — the order to build experience features

Build in this order. Pages depend on backend endpoints from Catalog/Commerce; features marked **[blocked by X]** can't be completed until that backend feature exists. You can scaffold the UI shell earlier with stub data, but full functionality requires the backend.

### Feature X1 — Design system foundation ✅ done

**Status:** complete as of the v0 integration. Documented here for future engineers reading the build sequence top-to-bottom.

**What's in place:**

- Bitscy color palette + spacing + typography tokens are defined as `@theme` directives in `src/app/globals.css`. There is no `tailwind.config.ts`.
- Both Inter and DM Serif Display are loaded via `next/font/google` in `src/app/layout.tsx` and exposed as `--font-inter` / `--font-dm-serif` CSS variables. The `font-sans` and `font-serif` Tailwind utilities resolve through them.
- The full shadcn (`new-york` style) primitive set lives in `src/components/ui/` (57 files), backed by Radix UI primitives. `cn()` is in `src/lib/utils.ts`.

**If you're updating tokens:** edit `src/app/globals.css` directly. If you're adding a new shadcn primitive: `pnpm dlx shadcn@latest add <component>` — the CLI is configured via `components.json` at the repo root.

---

### Feature X2 — PWA setup ✅ partly done

**Status:** Serwist + manifest + layout metadata are wired. Icons and the `InstallPrompt` component are outstanding.

**What's in place:**

- `@serwist/next` is wired in `next.config.js` with a conditional `require` (dev runs Turbopack with no Serwist; prod runs `next build --webpack` and Serwist generates `public/sw.js`).
- `src/app/sw.ts` is the service worker source.
- `public/manifest.json` exists with Bitscy branding (standalone, portrait, theme `#2C1810`, background `#FBF7F0`).
- `src/app/layout.tsx` includes `manifest: '/manifest.json'`, `appleWebApp`, and the `themeColor` viewport export.

**Outstanding (the remaining X2 scope):**

- Populate `public/icons/` with `icon-192.png`, `icon-512.png`, `maskable-icon-512.png`. The manifest already references these paths.
- Build the `InstallPrompt` component (shows after engagement signal — first product viewed, etc.).
- Decide and document the actual Serwist runtime-caching strategies in `src/app/sw.ts`. The aspirational strategy is at the top of this file under "Service worker caching strategy" — implement it there.
- Optional: update `theme_color` in the manifest to `#1F1410` to match the current `--foreground`.

**Smoke test (when complete):**

- `pnpm build && pnpm start`.
- Open in Chrome on Android.
- DevTools → Application → Manifest: should show all icons and metadata.
- Lighthouse PWA audit: should be at least 90/100.
- Tap "Install" — app installs to home screen, opens in standalone mode.

**Acceptance criteria:**

- Lighthouse PWA score ≥ 90.
- Service worker registers in production build only (the conditional `require` in `next.config.js` guarantees this).
- App opens in standalone mode after install (no browser chrome).
- Icons display correctly at all sizes (no pixelation on 512×512 splash).

---

### Feature X3 — Layout shells (Marketplace + Dashboard)

**Prerequisites:** X1 complete.

**Build:**

- Create the two layout shells:
  - **Marketplace layout** (used by browse, product detail, shop pages): top nav, bottom nav with Explore/Shop/Profile, no auth required for browsing.
  - **Dashboard layout** (used by seller pages): top nav with logout, sidebar (mobile: bottom nav), requires auth.
- Build the `BottomNav` component with active-state indicator.

**Smoke test:** Create placeholder pages at each route (`/`, `/products`, `/seller`, etc.) using the appropriate layout. Verify nav highlighting matches the current route.

**Acceptance criteria:**

- Nav stays fixed at the bottom on mobile, with appropriate safe-area-inset padding for iPhone notches.
- All layouts render cleanly at 360×640 and 1280×800.

---

### Feature X4 — Browse page [blocked by Catalog C6]

**Prerequisites:** X3 complete. Catalog `GET /api/products` working.

**Status:** UI shell complete at `/marketplace` with mock data. Real fetching is the blocked-by-backend piece.

**Build:**

- `/marketplace` page already exists with the 2-column-mobile / 4-column-desktop grid and an inline `SAMPLE_PRODUCTS` array. Swap that for a SWR fetch: `useSWR('/api/products', fetcher)`.
- The `/` route now serves the marketing landing page — do not put the browse grid there. The landing page has a featured-products preview (4 cards) that should probably also point at real `/api/products?limit=4` once available.
- Each product card: image, title, NGN price prominent, sats price secondary, seller name.
- Empty state: encouraging copy.
- Loading state: skeleton cards matching the grid layout.
- Error state: retry button.

**Smoke test:** Load `/marketplace` with seed data in the database. Verify 2-column mobile, 4-column desktop, prices in NGN with sats below, no broken images, no horizontal scroll. Verify the landing page's "Browse the marketplace" / "See all" links land here.

**Acceptance criteria:**

- Renders correctly on 360×640.
- Empty state shows when API returns `items: []`.
- NGN amounts use tabular-nums for alignment.
- Image lazy loading works (verify in DevTools Network tab).

---

### Feature X5 — Product detail page [blocked by Catalog C6]

**Prerequisites:** X4 complete. Catalog `GET /api/products/[id]` working.

**Build:**

- `/products/[id]` page.
- Two-column on desktop (image left, content right), stacked on mobile (image top, content below).
- Sticky "Buy with Lightning" button at the bottom of mobile, within thumb reach.
- Shows: title, price NGN + sats, seller name (link to shop), description, additional images in a carousel.

**Acceptance criteria:**

- Tap the "Buy with Lightning" button → routes to `/checkout/[orderId]` (functionality blocked by Commerce M8).
- Description handles long text with read-more truncation.
- Image carousel works on mobile (swipe gesture or tap arrows).

---

### Feature X6 — Auth: /sell, /signin, /signup [blocked by Catalog C2 + C3]

**Prerequisites:** X3 complete. Catalog auth endpoints working.

**Build:**

- `/sell` page: seller onboarding entry — pitch + collect username, password, display name, then call `/api/auth/signup` (with a role flag indicating seller). On success, redirect to a seller-profile-completion step or `/seller`. This is the target of every "Open your shop" CTA on the marketing landing page.
- `/signup` page: buyer signup — username, password. Submit calls `/api/auth/signup`. On success → `/`.
- `/signin` page: existing user sign-in (NIP-07 or passphrase). Submit calls `/api/auth/signin`. On success → `/seller` if role is SELLER else `/`.
- On error → show inline error message, never red toast.
- Use `sessionStore` (Zustand) to track auth state.

**Naming note:** The landing-page CTAs use `/sell` and `/signin` (NOT `/login`). When you scaffold these pages, match those route names. If the Catalog auth endpoints use different verbs (e.g., `POST /api/auth/login`), keep the API verbs as-is and route the UI through them.

**Acceptance criteria:**

- Successful signup shows toast and redirects.
- Duplicate username shows inline error on the username field.
- Wrong password shows "Invalid credentials" (never reveals if username exists).
- Session persists across page refresh.

---

### Feature X7 — Product image uploader [blocked by Catalog C4]

**Prerequisites:** X1 + X6 complete. Catalog `POST /api/upload` working.

**Build:**

- `ProductImageUploader` component:
  1. File picker accepts up to 5 images.
  2. Client-side compression with `browser-image-compression` (target 1920px, 80% quality).
  3. For each image: request a signed upload URL from `/api/upload`, then upload directly to Cloudinary.
  4. Show progress per image (uploading / done / failed).
  5. Allow reorder via drag, removal via tap.

**Smoke test:** Upload 5 images. Verify progress shown, all 5 appear at expected Cloudinary URLs, reorder works, remove works.

**Acceptance criteria:**

- Compression happens before upload (verify by comparing original vs uploaded file size).
- A failed upload doesn't lose progress on other images.
- First image is labeled "Cover" in the UI.

---

### Feature X8 — Product create + edit pages [blocked by Catalog C5 + C8 + X7]

**Prerequisites:** X7 complete. Catalog product CRUD endpoints working.

**Build:**

- `/seller/products/new` page: form with title, description, price (NGN input, converted to sats on submit using current rate), shipping, category, images.
- `/seller/products/[id]/edit` page: same form, pre-populated.
- `/seller/products` page: list of seller's products with edit/unlist actions.

**Acceptance criteria:**

- NGN-to-sats conversion uses live rate (calls a backend endpoint that uses the CoinGecko service).
- Editing a product preserves the original creation date and product ID.
- Unlist sets status to UNLISTED via `DELETE /api/products/[id]` (soft delete).

---

### Feature X9 — Seller dashboard [blocked by Commerce M5 + M9]

**Prerequisites:** X3 complete. Commerce `GET /api/wallet/balance` and recent orders endpoints working.

**Build:**

- `/seller` page:
  - Balance card: shows sats balance, NGN equivalent prominent, live (refresh every 30s).
  - Stats: total sales count, total revenue.
  - Recent orders list: last 5 orders with status pills.
  - Products grid: link to manage listings.

**Acceptance criteria:**

- Balance refreshes when window regains focus.
- NGN value uses live rate, with a small "stale" indicator if the rate is more than 5 minutes old.
- Order status pills use the correct colors per spec (PAID=indigo, SHIPPED=saffron, DELIVERED=success green).

---

### Feature X10 — Checkout page [blocked by Commerce M8 + M10]

**Prerequisites:** X5 complete. Commerce order creation and verify endpoints working.

**Build:**

- `/checkout/[orderId]` page:
  - Display BOLT-11 invoice as QR code (use `qrcode.react`).
  - Show amount in NGN prominently, sats below, "Waiting for payment..." with pulsing dot.
  - Show invoice expiry countdown ("Expires in 14:32").
  - Two action buttons: "Copy invoice" and "Open in wallet" (lightning: URL deep-link).
  - Below: "I don't have a Lightning wallet" → opens embedded wallet flow (X12).
- Poll `GET /api/lightning/verify/[paymentHash]` every 2s.
- On settlement, redirect to `/checkout/[orderId]/success`.
- On expiry, show "Invoice expired" with retry.

**Acceptance criteria:**

- QR code is at least 240×240px (scannable from across a room).
- Countdown ticks every second.
- Polling stops cleanly when payment settles or invoice expires.
- "Copy invoice" works on iOS Safari and Android Chrome.

---

### Feature X11 — Order success page [blocked by X10]

**Prerequisites:** X10 complete.

**Build:**

- `/checkout/[orderId]/success`:
  - Confirmation: "You just supported [Adaeze]."
  - Order summary.
  - Optional: prompt to install the PWA if not installed.

**Acceptance criteria:** Order ID is shown so the buyer can reference it later.

---

### Feature X12 — Embedded Breez wallet (stretch)

**Prerequisites:** X10 complete. **External dep:** Confirm `@breeztech/breez-sdk-liquid/web` loads in the browser (test with a Hello World page first).

**Build:** See the detailed spec in the "Embedded Breez wallet for buyers" section above. Implement progressively:

1. Mnemonic generation + backup UX.
2. Passphrase + encryption + IndexedDB storage.
3. Breez SDK init in browser (WASM).
4. Receive flow (show address, wait for funding).
5. Send flow (pay an invoice).

**Smoke test:**

- Generate a wallet.
- Fund it with 2000 sats from external.
- Pay a 500-sat invoice using the embedded wallet.
- Verify balance updates correctly.

**Acceptance criteria:**

- Mnemonic backup is gated (can't proceed without confirming 2 random words).
- WASM module loads within 10s on a 4G connection.
- The mnemonic does NOT appear in any localStorage, sessionStorage, or network request — only IndexedDB encrypted.
- Send and receive work end-to-end with mainnet sats.

**Risks:** WASM size is large (~3MB). Lazy-load only when the user opts in to create a wallet — don't bundle in the main JS chunk.

---

### Feature X13 — Bank withdrawal flow [blocked by Commerce M12]

**Prerequisites:** X9 complete. Commerce withdrawal endpoint working.

**Build:**

- `/seller/withdraw` page:
  - Show current balance.
  - Select bank account (or add new).
  - Amount input (defaults to full balance).
  - Confirm button → POSTs to `/api/payout`.
  - Tracking state: "Sending ₦42,300 to GTBank \*\*\*\*1234... ⏳"
  - Success state: "₦42,300 sent. ✅" with reference number.

**Acceptance criteria:**

- Insufficient balance shows inline error before submit.
- Network failures show retry button, never silent failure.
- Success state persists if the page is refreshed (read from API).

---

### Feature X14 — Order management for sellers [blocked by Commerce M9]

**Prerequisites:** X9 + X8 complete.

**Build:**

- `/seller/orders` page: list of all incoming orders with status.
- `/seller/orders/[id]` page: order detail including decrypted shipping address (using seller's private key — decrypt client-side after auth).
- Action: "Mark as shipped" → PATCH `/api/orders/[id]/ship`.

**Acceptance criteria:**

- Shipping address only readable by the authenticated seller (server cannot decrypt, only the seller can).
- "Mark as shipped" updates order status and reflects in the buyer's view.

---

### Experience integration test

When all X-features are complete:

1. Walk through the full demo flow on a real Android phone connected to the deployed Vercel URL.
2. From a clean install, sign up → list a product → log out → browse as buyer → buy → see success → log back in as seller → see sale → withdraw.
3. If the whole flow runs end-to-end without reaching for the keyboard or refreshing, Experience role is done.

---

By demo day:

1. Bitscy installs to the home screen of any Android phone in one tap. Looks indistinguishable from a native app.
2. The visual design feels warm, dignified, and unmistakably Nigerian. Not generic-fintech.
3. Every screen renders correctly on the smallest Android viewport (360×640).
4. The full purchase flow runs end-to-end on the deployed URL without a single visible glitch.
5. Loading states use skeletons, not spinners. Empty states are encouraging. Error states have clear retry.
6. The Vercel deployment has been live and tested on real phones for at least 3 days before demo day.
7. Adaeze (a teammate) can use the app on her actual phone, list her actual artwork, and feel proud of what she sees.

If the demo runs without anyone reaching for the keyboard to fix something, this role has succeeded.

---

_End of Experience CLAUDE.md._
