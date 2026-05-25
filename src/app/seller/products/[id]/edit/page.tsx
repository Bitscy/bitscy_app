'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, X, Loader2 } from 'lucide-react'

type ProductStatus = 'ACTIVE' | 'SOLD_OUT' | 'UNLISTED'

const EXCHANGE_RATE = 294 // ₦/sat

const CATEGORIES = [
  'Paintings',
  'Jewelry',
  'Textiles',
  'Leather',
  'Pottery',
  'Sculpture',
  'Prints & Digital',
  'Other',
]

interface ExistingProduct {
  id: string
  title: string
  description: string
  category: string
  priceNaira: number
  shippingNaira: number
  stock: number
  dimensions: string
  status: ProductStatus
  photoUrls: (string | null)[]
}

// Mock product data. In production: GET /api/products/[id] returns this
// pre-populated state. The seller edits and PATCHes back.
const PRODUCT_DATA: Record<string, ExistingProduct> = {
  'indigo-fabric': {
    id: 'indigo-fabric',
    title: 'Indigo Dyed Fabric',
    description: `Hand-woven indigo textile using traditional Yoruba adire techniques. Each piece is dyed individually, then sun-dried over three days, so no two are identical. The fabric is soft, breathable, and grows more beautiful with use.

Measures 90cm × 120cm. Use as a wall hanging, table runner, or garment. Care: hand wash cold, line dry. Color may continue to develop with the first few washes — this is intentional.`,
    category: 'Textiles',
    priceNaira: 25000,
    shippingNaira: 3000,
    stock: 1,
    dimensions: '90 × 120 cm',
    status: 'ACTIVE',
    photoUrls: ['/artwork-2.jpg', '/artwork-2.jpg', '/artwork-2.jpg', null, null],
  },
}

const STATUS_PILLS: Record<ProductStatus, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: 'bg-success', text: 'text-primary-foreground', label: 'Active' },
  SOLD_OUT: { bg: 'bg-accent', text: 'text-primary-foreground', label: 'Sold out' },
  UNLISTED: { bg: 'bg-border', text: 'text-muted', label: 'Unlisted' },
}

const calculateSats = (naira: string | number) => {
  const num = typeof naira === 'number' ? naira : parseInt(naira || '0', 10)
  if (!num) return 0
  return Math.round(num / EXCHANGE_RATE)
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const existing = PRODUCT_DATA[id] ?? PRODUCT_DATA['indigo-fabric']!

  // Form state, pre-populated from existing
  const [title, setTitle] = useState(existing.title)
  const [description, setDescription] = useState(existing.description)
  const [selectedCategory, setSelectedCategory] = useState(existing.category)
  const [price, setPrice] = useState(String(existing.priceNaira))
  const [shipping, setShipping] = useState(String(existing.shippingNaira))
  const [stock, setStock] = useState(String(existing.stock))
  const [dimensions, setDimensions] = useState(existing.dimensions)
  const [status, setStatus] = useState<ProductStatus>(existing.status)

  // Photo state — pre-populated; 'uploaded' for slots that have urls
  const [photoStates, setPhotoStates] = useState<string[]>(
    existing.photoUrls.map(url => (url ? 'uploaded' : 'empty'))
  )
  const [photoUrls, setPhotoUrls] = useState<(string | null)[]>([...existing.photoUrls])

  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showUnlistConfirm, setShowUnlistConfirm] = useState(false)
  const [isUnlisting, setIsUnlisting] = useState(false)

  const sats = calculateSats(price)

  const hasAtLeastOnePhoto = photoStates.some(s => s === 'uploaded')
  const isTitleValid = title.trim().length > 0
  const isDescriptionValid = description.trim().length > 0
  const isCategorySelected = selectedCategory !== ''
  const isPriceValid = parseInt(price || '0', 10) > 0
  const isFormValid = hasAtLeastOnePhoto && isTitleValid && isDescriptionValid && isCategorySelected && isPriceValid

  const statusPill = STATUS_PILLS[status]!

  // Photo handlers (simulate upload — real version goes through Cloudinary)
  const handlePhotoAdd = (index: number) => {
    setPhotoStates(prev => {
      const next = [...prev]
      next[index] = 'uploading'
      return next
    })

    setTimeout(() => {
      setPhotoStates(prev => {
        const next = [...prev]
        next[index] = 'uploaded'
        return next
      })
      setPhotoUrls(prev => {
        const next = [...prev]
        next[index] = '/artwork-2.jpg' // same mock as /new for now
        return next
      })
    }, 1200)
  }

  const handlePhotoRemove = (index: number) => {
    setPhotoStates(prev => {
      const next = [...prev]
      next[index] = 'empty'
      return next
    })
    setPhotoUrls(prev => {
      const next = [...prev]
      next[index] = null
      return next
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) {
      setShowValidationErrors(true)
      return
    }

    setIsSaving(true)
    await new Promise(r => setTimeout(r, 1200))
    router.push('/seller/products')
  }

  const handleConfirmUnlist = async () => {
    setIsUnlisting(true)
    await new Promise(r => setTimeout(r, 900))
    if (status === 'UNLISTED') {
      setStatus('ACTIVE')
    } else {
      setStatus('UNLISTED')
    }
    setShowUnlistConfirm(false)
    setIsUnlisting(false)
  }

  const isUnlisted = status === 'UNLISTED'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link
            href="/seller/products"
            className="flex items-center justify-center w-11 h-11 hover:bg-border rounded transition-colors"
            aria-label="Back to products"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Title row */}
        <div className="mb-12">
          <h1 className="font-serif text-4xl sm:text-5xl font-normal text-foreground mb-3">
            Edit your piece.
          </h1>
          <div className={`${statusPill.bg} ${statusPill.text} inline-block text-xs px-3 py-1 rounded-full font-sans font-medium`}>
            {statusPill.label}
          </div>
        </div>

        {/* 1. PHOTOS */}
        <div className="mb-12">
          <h2 className="font-serif text-xl font-normal mb-1">Photos.</h2>
          <p className="text-sm text-muted mb-6">Up to 5. First photo is the cover.</p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
            {photoStates.map((state, index) => (
              <div key={index} className="relative">
                {index === 0 && (
                  <div className="absolute top-0 left-0 z-10 bg-white/90 px-2 py-1 rounded-full">
                    <span className="font-medium text-xs text-accent">Cover</span>
                  </div>
                )}

                {state === 'empty' && (
                  <button
                    type="button"
                    onClick={() => handlePhotoAdd(index)}
                    className="w-full aspect-square bg-white border border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:bg-border/10 transition-colors"
                  >
                    <Plus className="w-6 h-6 text-muted mb-2" />
                    <span className="text-xs text-muted">Add photo</span>
                  </button>
                )}

                {state === 'uploading' && (
                  <div className="w-full aspect-square bg-gray-100 border border-border rounded-lg flex flex-col items-center justify-center">
                    <Loader2 className="w-5 h-5 text-muted animate-spin mb-2" />
                    <span className="text-xs text-muted">Uploading…</span>
                  </div>
                )}

                {state === 'uploaded' && photoUrls[index] && (
                  <div className="w-full aspect-square relative rounded-lg overflow-hidden bg-white">
                    <img
                      src={photoUrls[index]!}
                      alt={`Product photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handlePhotoRemove(index)}
                      className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                      aria-label="Remove photo"
                    >
                      <X className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showValidationErrors && !hasAtLeastOnePhoto && (
            <p className="text-sm text-error mb-3">Add at least one photo.</p>
          )}
          <p className="text-xs text-muted">Photos look best square. Bitscy will resize automatically.</p>
        </div>

        {/* 2. TITLE */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-normal mb-3">Title.</h2>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What's this called?"
            className={`w-full px-4 py-3 bg-white rounded border text-base font-normal text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
              showValidationErrors && !isTitleValid ? 'border-error' : 'border-border'
            }`}
            style={{ minHeight: '48px', fontSize: '16px' }}
          />
          {showValidationErrors && !isTitleValid && (
            <p className="text-sm text-error mt-2">Title is required.</p>
          )}
        </div>

        {/* 3. DESCRIPTION */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-normal mb-3">Description.</h2>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell buyers what makes this piece special."
            className="w-full px-4 py-3 bg-white rounded border border-border text-base font-normal text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
            rows={5}
            style={{ fontSize: '16px' }}
          />
        </div>

        {/* 4. CATEGORY */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-normal mb-3">Category.</h2>
          <div className="flex flex-wrap gap-3 mb-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground border-0'
                    : 'bg-white border border-border text-foreground hover:border-primary'
                }`}
                style={{ minHeight: '32px' }}
              >
                {cat}
              </button>
            ))}
          </div>
          {showValidationErrors && !isCategorySelected && (
            <p className="text-sm text-error">Pick a category.</p>
          )}
        </div>

        {/* 5. PRICE */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-normal mb-3">Price.</h2>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground font-medium">₦</span>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              className={`w-full pl-8 pr-4 py-3 bg-white rounded border text-base font-medium text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all tabular-nums ${
                showValidationErrors && !isPriceValid ? 'border-error' : 'border-border'
              }`}
              style={{ minHeight: '48px', fontSize: '16px' }}
            />
          </div>
          <p className="text-sm text-muted mt-2 tabular-nums">
            {price ? `≈ ${sats.toLocaleString('en-NG')} sats at today's rate` : '≈ 0 sats at today\'s rate'}
          </p>
        </div>

        {/* 6. SHIPPING */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-normal mb-3">Shipping.</h2>
          <div className="relative">
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-foreground font-medium">₦</span>
            <input
              type="number"
              value={shipping}
              onChange={e => setShipping(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-4 py-3 bg-white rounded border border-border text-base font-medium text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              style={{ minHeight: '48px', fontSize: '16px' }}
            />
          </div>
        </div>

        {/* 7. STOCK + DIMENSIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="font-serif text-xl font-normal mb-3">Stock.</h2>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded border border-border text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all tabular-nums"
              style={{ minHeight: '48px', fontSize: '16px' }}
              min="1"
            />
          </div>

          <div>
            <h2 className="font-serif text-xl font-normal mb-3">Dimensions (optional).</h2>
            <input
              type="text"
              value={dimensions}
              onChange={e => setDimensions(e.target.value)}
              placeholder="90 × 120 cm"
              className="w-full px-4 py-3 bg-white rounded border border-border text-base font-medium text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              style={{ minHeight: '48px', fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gold mb-8" />

        {/* Save changes */}
        <button
          type="submit"
          disabled={!isFormValid || isSaving}
          className="w-full bg-primary text-primary-foreground py-4 px-6 rounded font-serif text-lg font-normal transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
          style={{ minHeight: '56px' }}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving…
            </>
          ) : (
            'Save changes'
          )}
        </button>

        {/* Cancel */}
        <div className="text-center mt-4">
          <Link
            href="/seller/products"
            className="font-sans text-sm text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>

        {/* Unlist / Restore destructive action */}
        <div className="mt-12 pt-8 border-t border-border">
          {!showUnlistConfirm ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowUnlistConfirm(true)}
                className={`font-sans text-sm transition-colors ${
                  isUnlisted
                    ? 'text-accent hover:opacity-80'
                    : 'text-error hover:opacity-80'
                }`}
              >
                {isUnlisted ? 'Restore listing' : 'Unlist this piece'}
              </button>
              <p className="font-sans text-xs text-muted mt-2 max-w-md mx-auto">
                {isUnlisted
                  ? 'Make this piece visible to buyers again.'
                  : 'Hide this piece from buyers. You can restore it later.'}
              </p>
            </div>
          ) : (
            <div className="bg-[#F5EFE3] rounded-lg p-4 space-y-4">
              <p className="font-sans text-sm text-foreground">
                {isUnlisted
                  ? 'Make this piece visible to buyers again?'
                  : 'Hide this piece from buyers? You can restore it later from the products list.'}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleConfirmUnlist}
                  disabled={isUnlisting}
                  className={`flex-1 text-primary-foreground py-3 rounded font-sans text-sm font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isUnlisted ? 'bg-primary hover:opacity-90' : 'bg-error hover:opacity-90'
                  }`}
                >
                  {isUnlisting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating…
                    </>
                  ) : (
                    'Confirm'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnlistConfirm(false)}
                  disabled={isUnlisting}
                  className="flex-1 bg-transparent text-foreground py-3 rounded font-sans text-sm font-medium hover:bg-border transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
