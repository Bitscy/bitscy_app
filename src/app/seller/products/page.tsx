'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Loader2 } from 'lucide-react'

type ProductStatus = 'ACTIVE' | 'SOLD_OUT' | 'UNLISTED'

interface ManagedProduct {
  id: string
  title: string
  image: string
  priceNaira: number
  status: ProductStatus
}

const PRODUCTS_SEED: ManagedProduct[] = [
  { id: 'beaded-collar', title: 'Beaded Statement Collar', image: '/artwork-6.jpg', priceNaira: 38000, status: 'ACTIVE' },
  { id: 'indigo-fabric', title: 'Indigo Dyed Fabric', image: '/artwork-2.jpg', priceNaira: 25000, status: 'ACTIVE' },
  { id: 'leather-journal', title: 'Tooled Leather Journal', image: '/artwork-5.jpg', priceNaira: 25000, status: 'ACTIVE' },
  { id: 'geometric-abstract', title: 'Geometric Abstract Composition', image: '/artwork-1.jpg', priceNaira: 45000, status: 'ACTIVE' },
  { id: 'thrown-vase', title: 'Hand Thrown Vase', image: '/artwork-3.jpg', priceNaira: 88000, status: 'SOLD_OUT' },
  { id: 'adire-hanging', title: 'Adire Wall Hanging', image: '/artwork-4.jpg', priceNaira: 52000, status: 'UNLISTED' },
]

const STATUS_OVERLAYS: Record<ProductStatus, { pillBg: string; pillText: string; label: string; dim: boolean } | null> = {
  ACTIVE: null,
  SOLD_OUT: { pillBg: 'bg-accent', pillText: 'text-primary-foreground', label: 'Sold out', dim: false },
  UNLISTED: { pillBg: 'bg-border', pillText: 'text-muted', label: 'Unlisted', dim: true },
}

export default function SellerProductsPage() {
  const [products, setProducts] = useState<ManagedProduct[]>(PRODUCTS_SEED)
  const [confirmAction, setConfirmAction] = useState<{ id: string; kind: 'unlist' | 'restore' } | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)

  const handleUnlist = async (productId: string) => {
    setActionInProgress(true)
    await new Promise(r => setTimeout(r, 800))
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'UNLISTED' } : p))
    setConfirmAction(null)
    setActionInProgress(false)
  }

  const handleRestore = async (productId: string) => {
    setActionInProgress(true)
    await new Promise(r => setTimeout(r, 800))
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, status: 'ACTIVE' } : p))
    setConfirmAction(null)
    setActionInProgress(false)
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Back-arrow header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-5 py-3 flex items-center">
          <Link
            href="/seller"
            className="p-3 -m-3 hover:bg-input rounded transition-colors inline-flex"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" strokeWidth={2} />
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8 py-6 pb-12">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl font-normal mb-1">Your products.</h1>
            <p className="font-sans text-sm text-muted">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </p>
          </div>
          <Link
            href="/seller/products/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity h-10 shrink-0"
          >
            <Plus size={16} />
            Add product
          </Link>
        </div>

        {products.length === 0 ? (
          /* Empty state */
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div
              className="w-20 h-20 rounded-full border-2 mb-6"
              style={{ borderColor: '#E8B43D' }}
              aria-hidden="true"
            />
            <h2 className="font-serif text-3xl font-normal mb-2">Nothing listed yet.</h2>
            <p className="font-sans text-base text-muted mb-6 max-w-sm">
              Your shop is ready. Add your first piece and share it with the world.
            </p>
            <Link
              href="/seller/products/new"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-sans font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={18} />
              Add your first piece
            </Link>
          </div>
        ) : (
          /* Product grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
            {products.map(product => {
              const overlay = STATUS_OVERLAYS[product.status]
              const isUnlisted = product.status === 'UNLISTED'
              const isAction = confirmAction?.id === product.id

              return (
                <div key={product.id} className="bg-white border border-border rounded-lg overflow-hidden">
                  {/* Tap card → edit */}
                  <Link
                    href={`/seller/products/${product.id}/edit`}
                    className="block hover:opacity-90 transition-opacity"
                  >
                    {/* Thumbnail with optional overlay */}
                    <div className="relative aspect-square bg-input overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.title}
                        className={`w-full h-full object-cover ${overlay?.dim ? 'opacity-50' : ''}`}
                      />
                      {overlay && (
                        <div className="absolute top-2 left-2">
                          <span
                            className={`${overlay.pillBg} ${overlay.pillText} text-xs px-3 py-1 rounded-full font-sans font-medium`}
                          >
                            {overlay.label}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Title + price */}
                    <div className="p-3">
                      <h3 className="font-serif text-sm sm:text-base text-foreground line-clamp-1 mb-1">
                        {product.title}
                      </h3>
                      <p className="font-sans text-xs text-muted tabular-nums">
                        ₦{product.priceNaira.toLocaleString('en-NG')}
                      </p>
                    </div>
                  </Link>

                  {/* Inline confirm — replaces action button when active */}
                  {isAction ? (
                    <div className="border-t border-border bg-[#F5EFE3] px-3 py-3 space-y-2">
                      <p className="font-sans text-xs text-foreground">
                        {confirmAction.kind === 'unlist'
                          ? 'Hide this piece from buyers?'
                          : 'Make this piece visible to buyers again?'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            confirmAction.kind === 'unlist'
                              ? handleUnlist(product.id)
                              : handleRestore(product.id)
                          }
                          disabled={actionInProgress}
                          className="flex-1 bg-primary text-primary-foreground py-1.5 rounded font-sans text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {actionInProgress ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Confirm'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction(null)}
                          disabled={actionInProgress}
                          className="flex-1 bg-transparent text-foreground py-1.5 rounded font-sans text-xs font-medium hover:bg-border transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Inline action button */
                    <div className="border-t border-border px-3 py-2">
                      {isUnlisted ? (
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ id: product.id, kind: 'restore' })}
                          className="w-full text-accent font-sans text-xs font-medium hover:opacity-80 transition-opacity py-1.5"
                        >
                          Restore listing
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ id: product.id, kind: 'unlist' })}
                          className="w-full text-muted hover:text-foreground font-sans text-xs font-medium transition-colors py-1.5"
                        >
                          Unlist
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
