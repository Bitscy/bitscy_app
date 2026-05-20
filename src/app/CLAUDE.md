# CLAUDE.md — Experience (src/app/, src/components/, src/store/)

You're working in the Experience role's code. The root `CLAUDE.md` covers project-wide context, shared types, conventions, and out-of-scope features. This file adds Experience-specific context on top.

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
- Lightning invoice generation (Commerce engineer)
- Bitnob mock implementation (Commerce engineer)
- API endpoint definitions (you consume them, you don't define them)

You consume APIs through typed interfaces from `src/types/shared.ts`. If a field is missing, ask the owning engineer. Don't invent shapes.

## Pages you own

Inside `src/app/`:

**Marketplace pages (public):**
- `/` — home page, product browse
- `/products/[id]` — product detail
- `/shop/[username]` — seller storefront
- `/checkout/[orderId]` — Lightning invoice + QR display
- `/checkout/[orderId]/success` — order success screen

**Dashboard pages (auth required):**
- `/seller` — seller dashboard home (balance, recent orders)
- `/seller/products` — manage listings
- `/seller/products/new` — create listing
- `/seller/products/[id]/edit` — edit listing
- `/seller/orders` — incoming orders
- `/seller/orders/[id]` — order detail (decrypt shipping address)
- `/seller/withdraw` — bank withdrawal flow
- `/buyer/orders` — buyer's order history
- `/buyer/orders/[id]` — buyer's order detail

**Auth pages:**
- `/signup` — new user
- `/login` — existing user (NIP-07 or passphrase)

## Design system

The visual identity is warm, earth-tone, dignified. Not crypto-techno-blue. Not generic-fintech-purple. Think *trusted Nigerian community institution that happens to be modern.*

**Color palette** (lives in `tailwind.config.ts`):
```
primary:    #B85C38  // warm terracotta
secondary:  #5C3D2E  // deep brown
accent:     #E0B14A  // muted gold
background: #FFFAF1  // warm cream
surface:    #FFFFFF
text:       #2C1810  // very dark brown
muted:      #8C7B6F  // warm gray
success:    #4A7C59  // muted green
error:      #C04A3D  // muted red, similar tone to primary
```

These are starting points. The team can refine. Once locked, don't introduce arbitrary new colors.

**Typography:**
- Headings: Inter, semi-bold, generous leading
- Body: Inter, regular, 16px minimum on mobile
- Numbers (sats, naira): tabular-nums variant for alignment
- Never use system font; load Inter via `next/font`

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

The PWA is configured via `next-pwa` in `next.config.js`. See the root CLAUDE.md for the configuration snippet.

**The manifest** (`public/manifest.json`):
- App name: "Bitscy"
- Short name: "Bitscy"
- Display: `standalone` (full-screen, no browser chrome)
- Orientation: `portrait`
- Theme color: `#2C1810` (matches text color)
- Background color: `#FFFAF1` (matches our cream background)
- Icons: 192×192 and 512×512 PNGs in `public/icons/`

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

**`walletStore`** — embedded buyer Breez wallet (client-side)
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

## Embedded Breez wallet for buyers

For buyers who don't have an existing Lightning wallet:

1. After Nostr key creation, optionally offer "Create a Lightning wallet in this app."
2. Initialize Breez SDK in the browser using `@breeztech/breez-sdk-liquid` client-side build.
3. Derive the wallet seed from the buyer's Nostr private key (deterministic, so the wallet can be recreated from the same key).
4. Store wallet state in IndexedDB (Breez SDK handles this internally).
5. The buyer can fund the wallet from an external source, then pay invoices from inside Bitscy.

This is a stretch feature. If time is tight, skip the embedded wallet — buyers can pay from any external Lightning wallet by scanning the QR code. The embedded wallet is for the bonus demo beat.

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

- **Service worker caches aggressively in dev.** Disable PWA in `next.config.js` for development (already configured). If you see stale assets in production, version the cache name on deploy.
- **iOS PWA quirks.** Push notifications require home-screen installation (iOS 16.4+). Some browser APIs are restricted in PWA mode on iOS. Test on a real iPhone before assuming features work.
- **IndexedDB quotas.** Browsers can evict IndexedDB data when storage is low. Don't rely on it as the only copy of critical data. The user's Nostr key is critical — offer export to a recovery phrase early.
- **Tailwind purge in production.** If a class is only used dynamically (e.g., `bg-${color}-500`), Tailwind purges it. Use the safelist in `tailwind.config.ts` or use static class strings.
- **Next.js App Router server components.** By default, pages are server components. Mark client components with `'use client'` at the top. Hooks (`useState`, `useEffect`, Zustand) require client components.
- **next/image domains.** Add Cloudinary domain to `next.config.js` `images.domains` array so Next.js Image works on Cloudinary URLs.
- **Hydration mismatches.** Anything that differs between server and client render (like reading from localStorage on first paint) causes hydration errors. Use `useEffect` for client-only state, or `dynamic(() => import(...), { ssr: false })`.

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

## What success looks like

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

*End of Experience CLAUDE.md.*
