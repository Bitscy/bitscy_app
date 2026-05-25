'use client'

import { Suspense, use, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Copy, Flame, X } from 'lucide-react'

interface MockProduct {
  id: string
  title: string
  artist: string
  artistSlug: string
  price: number
  sats: number
  shipping: number
  shipsFrom: string
  category: string
  stock: number
  dimensions?: string
  description: string
  images: string[]
}

// Mock product data
const PRODUCTS: Record<string, MockProduct> = {
  'indigo-fabric': {
    id: 'indigo-fabric',
    title: 'Indigo Dyed Fabric',
    artist: 'Adaeze',
    artistSlug: 'adaeze',
    price: 25000,
    sats: 85000,
    shipping: 3000,
    shipsFrom: 'Lagos',
    category: 'Textiles',
    stock: 1,
    dimensions: '90 × 120 cm',
    description: `Hand-woven indigo textile using traditional Yoruba adire techniques. Each piece is dyed individually, then sun-dried over three days, so no two are identical. The fabric is soft, breathable, and grows more beautiful with use.

Measures 90cm × 120cm. Use as a wall hanging, table runner, or garment. Care: hand wash cold, line dry. Color may continue to develop with the first few washes — this is intentional.`,
    images: [
      '/artwork-2.jpg',
      '/artwork-2.jpg',
      '/artwork-2.jpg',
      '/artwork-2.jpg',
      '/artwork-2.jpg',
    ],
  },
}

function ProductPageContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { id } = use(params)
  const product = PRODUCTS[id] ?? PRODUCTS['indigo-fabric']!

  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isSticky, setIsSticky] = useState(false)
  const [buyButtonRef, setBuyButtonRef] = useState<HTMLDivElement | null>(null)
  const touchStartX = useRef(0)

  // ?justPublished=1 is set by /seller/products/new after a successful
  // publish. Show a one-shot "Your product is live." banner with share
  // URL + Copy + dashboard / list-another CTAs. Dismissible per-session.
  const justPublished = searchParams.get('justPublished') === '1'
  const [bannerVisible, setBannerVisible] = useState(justPublished)
  const [urlCopied, setUrlCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/products/${product.id}`
    : `bitscy.com/products/${product.id}`

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  // Handle sticky buy bar on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (buyButtonRef) {
        const rect = buyButtonRef.getBoundingClientRect()
        setIsSticky(rect.bottom < 0)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [buyButtonRef])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0]!.clientX
    const diff = touchStartX.current - touchEndX

    if (diff > 50) {
      // Swiped left
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length)
    } else if (diff < -50) {
      // Swiped right
      setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length)
    }
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length)
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length)
  }

  const isSoldOut = product.stock === 0

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Back Arrow Header */}
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

      {/* "Your product is live" banner — shown once after publish */}
      {bannerVisible && (
        <div className="bg-[#F5EFE3] border-b border-border">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-foreground mb-1">
                Your product is live.
              </h2>
              <p className="font-sans text-sm text-muted mb-3">
                Share the link to bring buyers to this piece.
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="inline-flex items-center gap-3 bg-white border border-border px-3 py-1.5 rounded-full">
                  <span className="font-sans text-xs sm:text-sm text-foreground tabular-nums truncate max-w-[200px] sm:max-w-none">
                    {shareUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyShareUrl}
                    className="text-accent hover:opacity-80 transition-opacity font-sans text-xs sm:text-sm font-medium flex items-center gap-1"
                  >
                    {urlCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/seller/products/new"
                  className="inline-flex items-center justify-center bg-primary text-primary-foreground px-4 py-2 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  List another piece
                </Link>
                <Link
                  href="/seller"
                  className="inline-flex items-center justify-center font-sans text-sm text-foreground hover:text-accent transition-colors px-2 py-2"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBannerVisible(false)}
              className="text-muted hover:text-foreground transition-colors p-1 -m-1 shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="lg:flex lg:gap-12 lg:max-w-7xl lg:mx-auto lg:px-10">
        {/* IMAGE CAROUSEL SECTION */}
        <div className="lg:w-3/5 lg:py-12">
          {/* Hero Image Carousel */}
          <div
            className="relative w-full bg-input overflow-hidden lg:rounded-lg"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Images */}
            <div className="relative w-full aspect-square">
              {product.images.map((image: string, idx: number) => (
                <img
                  key={idx}
                  src={image}
                  alt={`${product.title} image ${idx + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    idx === currentImageIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Arrows - Desktop Only */}
            <div className="hidden lg:flex absolute inset-0 items-center justify-between px-4 opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={handlePrevImage}
                className="bg-white/90 hover:bg-white p-2 rounded transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 text-foreground" strokeWidth={2} />
              </button>
              <button
                onClick={handleNextImage}
                className="bg-white/90 hover:bg-white p-2 rounded transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 text-foreground" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Pagination Dots - Mobile */}
          <div className="lg:hidden flex justify-center gap-2 mt-4">
            {product.images.map((_: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentImageIndex ? 'bg-accent' : 'bg-muted'
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>

          {/* Thumbnail Strip - Desktop Only */}
          <div className="hidden lg:grid grid-cols-5 gap-2 mt-4">
            {product.images.map((image: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`aspect-square rounded overflow-hidden border-2 transition-colors ${
                  idx === currentImageIndex ? 'border-accent' : 'border-border'
                }`}
              >
                <img src={image} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* PRODUCT INFO SECTION */}
        <div className="px-6 py-8 lg:w-2/5 lg:py-12 lg:px-0">
          {/* Title Block */}
          <div className="mb-6 space-y-2">
            <h1 className="font-serif text-4xl font-normal leading-tight">{product.title}</h1>
            <p className="font-sans text-sm text-muted">
              by{' '}
              <Link href={`/shop/${product.artistSlug}`} className="text-accent hover:opacity-80 transition-opacity">
                {product.artist}
              </Link>
              {' · '}
              Ships from {product.shipsFrom}
            </p>
          </div>

          {/* Price Block */}
          <div className="mb-6 space-y-1">
            <p className="font-serif text-5xl font-normal text-accent">
              ₦{product.price.toLocaleString('en-NG')}
            </p>
            <p className="font-sans text-sm text-muted">{product.sats.toLocaleString('en-NG')} sats</p>
          </div>

          {/* Stock / Scarcity Line */}
          <div className="mb-6">
            {product.stock === 0 ? (
              <p className="font-sans text-sm text-error font-medium">Sold out</p>
            ) : product.stock === 1 ? (
              <div className="flex items-center gap-2 text-sm text-accent font-medium">
                <Flame className="w-4 h-4" strokeWidth={2} />
                <span>Last one — once it&apos;s gone, it&apos;s gone</span>
              </div>
            ) : (
              <p className="font-sans text-sm text-muted">{product.stock} available</p>
            )}
          </div>

          {/* Buy Button */}
          <div ref={setBuyButtonRef} className="mb-8">
            {isSoldOut ? (
              <button
                disabled
                className="w-full py-4 px-6 rounded font-sans text-lg font-medium bg-muted text-muted-foreground cursor-not-allowed"
              >
                Sold out
              </button>
            ) : (
              <Link
                href={`/checkout/order-${product.id}`}
                className="block w-full text-center py-4 px-6 rounded font-sans text-lg font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Buy ₦{product.price.toLocaleString('en-NG')}
              </Link>
            )}
          </div>

          {/* Gold Divider */}
          <div className="h-px bg-gold mb-8" />

          {/* Description */}
          <div className="mb-8 space-y-5">
            <h3 className="font-serif text-2xl font-normal">About this piece</h3>
            {product.description.split('\n\n').map((paragraph: string, idx: number) => (
              <p key={idx} className="font-sans text-base text-foreground leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Details Strip */}
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <p className="font-sans text-sm text-muted">Category</p>
              <div className="bg-accent text-primary-foreground px-3 py-1 rounded text-xs font-medium">
                {product.category}
              </div>
            </div>

            <div className="flex justify-between">
              <p className="font-sans text-sm text-muted">Ships from</p>
              <p className="font-sans text-base font-medium text-foreground">{product.shipsFrom}</p>
            </div>

            <div className="flex justify-between">
              <p className="font-sans text-sm text-muted">Shipping</p>
              <p className="font-sans text-base font-medium text-foreground">₦{product.shipping.toLocaleString('en-NG')}</p>
            </div>

            {product.dimensions && (
              <div className="flex justify-between">
                <p className="font-sans text-sm text-muted">Dimensions</p>
                <p className="font-sans text-base font-medium text-foreground">{product.dimensions}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BUY BAR - Mobile Only */}
      {isSticky && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border px-6 py-4 z-50 animate-in slide-in-from-bottom-2">
          {isSoldOut ? (
            <button
              disabled
              className="w-full py-3 px-6 rounded font-sans text-base font-medium bg-muted text-muted-foreground cursor-not-allowed"
            >
              Sold out
            </button>
          ) : (
            <Link
              href={`/checkout/order-${product.id}`}
              className="block w-full text-center py-3 px-6 rounded font-sans text-base font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Buy ₦{product.price.toLocaleString('en-NG')}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="bg-background min-h-screen" />}>
      <ProductPageContent params={params} />
    </Suspense>
  )
}
