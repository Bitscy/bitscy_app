'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { ApiError } from '@/lib/api-error'
import { getShop, type StorefrontResponse } from '@/lib/api/products'
import { VerifiedSellerBadge } from '@/components/seller/verified-seller-badge'

// Demo BTC/NGN rate, mirrored from the server. Same constants as the
// marketplace + product detail pages.
const NGN_PER_BTC = 145_000_000n
const SATS_PER_BTC = 100_000_000n

function formatNgnFromSats(satsStr: string): string {
  try {
    const sats = BigInt(satsStr)
    const ngn = (sats * NGN_PER_BTC) / SATS_PER_BTC
    return `₦${Number(ngn).toLocaleString('en-NG')}`
  } catch {
    return '₦0'
  }
}

function formatSats(satsStr: string): string {
  try {
    return `${Number(BigInt(satsStr)).toLocaleString('en-NG')} sats`
  } catch {
    return '0 sats'
  }
}

function initialsFor(name: string | null, fallback: string): string {
  const source = (name && name.trim()) || fallback
  return (source.charAt(0) || '?').toUpperCase()
}

interface StallStatusBannerProps {
  status: string // "open" | "vacation" | "closed" — caller already filtered out "open"
  message: string | null
  displayName: string
}

function StallStatusBanner({ status, message, displayName }: StallStatusBannerProps) {
  // vacation — warm saffron / gold for "back soon", not alarming
  if (status === 'vacation') {
    return (
      <div
        role="status"
        className="rounded-lg border px-4 py-3 sm:py-4 flex items-start gap-3"
        style={{ backgroundColor: 'rgba(232, 180, 61, 0.12)', borderColor: '#E8B43D' }}
      >
        <span aria-hidden="true" className="font-serif text-xl leading-none mt-0.5">·</span>
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm sm:text-base font-medium text-foreground">
            {displayName} is on a short break.
          </p>
          {message && (
            <p className="font-sans text-sm text-foreground/80 mt-1">{message}</p>
          )}
          <p className="font-sans text-xs text-muted mt-1">
            You can still browse the catalog. New orders are paused until the shop reopens.
          </p>
        </div>
      </div>
    )
  }

  // closed — muted red. Stronger signal. Buyers shouldn't expect orders to be filled.
  return (
    <div
      role="status"
      className="rounded-lg border px-4 py-3 sm:py-4 flex items-start gap-3"
      style={{ backgroundColor: 'rgba(184, 80, 73, 0.10)', borderColor: '#B85049' }}
    >
      <span aria-hidden="true" className="font-serif text-xl leading-none mt-0.5 text-error">·</span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm sm:text-base font-medium text-error">
          This shop is currently closed.
        </p>
        {message ? (
          <p className="font-sans text-sm text-foreground/80 mt-1">{message}</p>
        ) : (
          <p className="font-sans text-sm text-foreground/80 mt-1">
            {displayName} isn&apos;t taking new orders right now.
          </p>
        )}
      </div>
    </div>
  )
}

export default function ShopPage({ params }: { params: Promise<{ username: string }> }) {
  const router = useRouter()
  const { username } = use(params)

  const [shop, setShop] = useState<StorefrontResponse | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [fetchError, setFetchError] = useState<'not_found' | 'other' | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsFetching(true)
    setFetchError(null)
    getShop(username)
      .then(res => {
        if (!cancelled) setShop(res)
      })
      .catch(err => {
        if (cancelled) return
        if (err instanceof ApiError && err.statusCode === 404) {
          setFetchError('not_found')
          return
        }
        setFetchError('other')
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false)
      })
    return () => {
      cancelled = true
    }
  }, [username])

  const BackHeader = (
    <div className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="px-5 py-3 flex items-center">
        <button
          onClick={() => router.back()}
          className="p-3 -m-3 hover:bg-input rounded transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-6 h-6 text-foreground" strokeWidth={2} />
        </button>
      </div>
    </div>
  )

  // ── Loading view ──────────────────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="bg-background min-h-screen text-foreground">
        {BackHeader}
        <main aria-busy="true">
          <section className="px-5 sm:px-8 pt-10 pb-8">
            <div className="max-w-3xl mx-auto flex flex-col items-center text-center lg:items-start lg:text-left animate-pulse">
              <div className="w-24 h-24 lg:w-30 lg:h-30 rounded-full bg-input mb-5" />
              <div className="h-10 w-2/3 bg-input rounded mb-2" />
              <div className="h-4 w-1/2 bg-input rounded mb-5" />
              <div className="h-4 w-full bg-input rounded mb-2 max-w-xl" />
              <div className="h-4 w-3/4 bg-input rounded mb-6 max-w-xl" />
            </div>
          </section>
          <div className="max-w-3xl mx-auto px-5 sm:px-8">
            <div className="h-px bg-gold opacity-60" />
          </div>
          <section className="px-5 sm:px-8 py-10">
            <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg overflow-hidden animate-pulse">
                  <div className="w-full aspect-square bg-input" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-input rounded w-3/4" />
                    <div className="h-5 bg-input rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (fetchError === 'not_found') {
    return (
      <div className="bg-background min-h-screen text-foreground">
        {BackHeader}
        <main className="mx-auto max-w-xl px-5 py-20 text-center">
          <h1 className="font-serif text-3xl font-normal mb-2">Shop not found.</h1>
          <p className="font-sans text-base text-muted mb-6">
            We couldn&apos;t find a shop at @{username}.
          </p>
          <Link
            href="/marketplace"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded font-sans font-medium hover:opacity-90 transition-opacity"
          >
            Back to the marketplace
          </Link>
        </main>
      </div>
    )
  }

  // ── Other error ───────────────────────────────────────────────────────────
  if (fetchError === 'other' || !shop) {
    return (
      <div className="bg-background min-h-screen text-foreground">
        {BackHeader}
        <main className="mx-auto max-w-xl px-5 py-20 text-center">
          <p className="font-sans text-base text-muted mb-4">
            We couldn&apos;t load this shop.
          </p>
          <button
            onClick={() => router.refresh()}
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded font-sans font-medium hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </main>
      </div>
    )
  }

  const { seller, products } = shop
  const displayName = seller.displayName ?? seller.username
  const initials = initialsFor(seller.displayName, seller.username)
  const productCount = products.length

  // Origin is read at render time so the share pill works on localhost and
  // every deployed environment without baking the host into env vars.
  const shopUrl =
    typeof window !== 'undefined'
      ? `${window.location.host}/shop/${seller.username}`
      : `bitscy.com/shop/${seller.username}`

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/shop/${seller.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      {BackHeader}

      {/* Seller hero */}
      <section className="px-5 sm:px-8 pt-10 pb-8">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center lg:items-start lg:text-left">
          {/* Avatar — image when present, initials fallback */}
          {seller.avatar ? (
            <img
              src={seller.avatar}
              alt={displayName}
              className="w-24 h-24 lg:w-30 lg:h-30 rounded-full object-cover mb-5"
            />
          ) : (
            <div
              className="w-24 h-24 lg:w-30 lg:h-30 rounded-full flex items-center justify-center font-serif text-4xl lg:text-5xl font-normal mb-5"
              style={{ backgroundColor: 'rgba(214, 121, 97, 0.2)', color: '#1F1410' }}
            >
              {initials}
            </div>
          )}

          {/* Shop name */}
          <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-tight mb-2">
            {displayName}
          </h1>

          {/* Verified Seller badge — sourced from kind 30052 ledger event.
              Silent when the seller has no completed sales yet. */}
          <VerifiedSellerBadge username={seller.username} variant="chip" />


          {/* Subtitle */}
          <p className="font-sans text-sm sm:text-base text-muted mb-5">
            by @{seller.username} · {productCount}{' '}
            {productCount === 1 ? 'piece' : 'pieces'}
          </p>

          {/* Bio */}
          {seller.about && (
            <p className="font-sans text-base text-foreground leading-relaxed max-w-xl mb-6">
              {seller.about}
            </p>
          )}

          {/* HOOK: Feature 8 — Long bio (markdown) goes here.
              Fetch GET /api/shop/<username>/about and render below the
              short `about` line when longBio is non-null. */}

          {/* HOOK: Feature 9 — Sovereignty page link goes here.
              <Link href={`/sovereignty/${nip19.npubEncode(seller.npub)}`}>
                View Nostr presence ↗
              </Link>
              seller.npub is HEX; bech32-encode before linking. */}

          {/* Share pill */}
          <div className="inline-flex items-center gap-3 bg-white border border-border px-4 py-2 rounded-full">
            <span className="font-sans text-xs sm:text-sm text-foreground tabular-nums">
              {shopUrl}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs sm:text-sm text-accent hover:opacity-80 transition-opacity font-sans font-medium"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </section>

      {/* Stall status banner — only shown when not open. kind 30053 on
          Nostr; seller.stallStatus + seller.stallStatusMessage carry it
          here from the storefront API. Hidden entirely on "open". */}
      {seller.stallStatus !== 'open' && (
        <section className="px-5 sm:px-8 pb-6">
          <div className="max-w-3xl mx-auto">
            <StallStatusBanner
              status={seller.stallStatus}
              message={seller.stallStatusMessage}
              displayName={displayName}
            />
          </div>
        </section>
      )}

      {/* Gold divider */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <div className="h-px bg-gold opacity-60" />
      </div>

      {/* Products grid OR empty state */}
      <section className="px-5 sm:px-8 py-10">
        <div className="max-w-6xl mx-auto">
          {productCount > 0 ? (
            <>
              {/* Section heading row */}
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-serif text-2xl sm:text-3xl font-normal">All pieces</h2>
                <p className="font-sans text-sm text-muted">
                  {productCount} {productCount === 1 ? 'piece' : 'pieces'}
                </p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(product => {
                  const cover = product.images?.[0] ?? ''
                  // When the shop is closed, render the card as a static,
                  // dimmed div instead of a Link — buyers can still see the
                  // catalog, just can't tap into a Buy flow that wouldn't
                  // be honored on the product detail page anyway.
                  const isClosed = seller.stallStatus === 'closed'
                  const CardTag = isClosed ? 'div' : Link
                  const cardProps = isClosed
                    ? {
                        className:
                          'bg-white rounded-lg overflow-hidden shadow-sm block opacity-60 cursor-not-allowed',
                        'aria-disabled': true,
                      }
                    : {
                        href: `/products/${product.id}`,
                        className:
                          'bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] block',
                      }
                  return (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <CardTag key={product.id} {...(cardProps as any)}>
                      <div className="w-full aspect-square bg-input overflow-hidden">
                        {cover ? (
                          <img
                            src={cover}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="p-4">
                        <h3 className="font-serif text-base sm:text-lg text-foreground font-normal line-clamp-2 mb-2">
                          {product.title}
                        </h3>
                        <p className="text-accent font-medium text-base sm:text-lg mb-1 tabular-nums">
                          {product.priceNgnDisplay || formatNgnFromSats(product.priceSats)}
                        </p>
                        <p className="text-muted text-xs sm:text-sm font-normal tabular-nums">
                          {formatSats(product.priceSats)}
                        </p>
                      </div>
                    </CardTag>
                  )
                })}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="py-16 sm:py-24 flex flex-col items-center justify-center text-center">
              <div
                className="w-20 h-20 rounded-full border-2 mb-6"
                style={{ borderColor: '#E8B43D' }}
                aria-hidden="true"
              />
              <h2 className="font-serif text-3xl font-normal mb-3">No pieces yet.</h2>
              <p className="font-sans text-base text-muted max-w-md">
                {displayName} hasn&apos;t listed anything yet. Check back soon.
              </p>
            </div>
          )}

          {/* HOOK: Feature 5 — Reviews section goes here, below the grid.
              Fetch GET /api/shop/<username>/reviews and render
                  <h2>Reviews</h2>
                  <Stars rating={averageRating}/> ({count})
                  <ul>{reviews.map(r => <ReviewCard ... />)}</ul>
              Each review links out to https://njump.me/<nostrEventId>.
              Hide section entirely if count === 0. */}
        </div>
      </section>
    </div>
  )
}
