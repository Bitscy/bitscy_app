'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Copy, Check, Loader2 } from 'lucide-react'

type OrderStatus = 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

interface OrderTimeline {
  paidAt?: string
  paidRelative?: string
  shippedAt?: string
  shippedRelative?: string
  deliveredAt?: string
  deliveredRelative?: string
  cancelledAt?: string
  cancelledRelative?: string
}

interface SellerSummary {
  displayName: string
  shopUrl: string // slug like "adaeze"
  initials: string
}

interface BuyerOrderDetail {
  id: string
  product: {
    slug: string
    title: string
    image: string
    priceNaira: number
  }
  shippingFee: number
  seller: SellerSummary
  status: OrderStatus
  timeline: OrderTimeline
}

const ORDERS: Record<string, BuyerOrderDetail> = {
  'BTS-7K3M-9P2X': {
    id: 'BTS-7K3M-9P2X',
    product: {
      slug: 'indigo-fabric',
      title: 'Indigo Dyed Fabric',
      image: '/artwork-2.jpg',
      priceNaira: 25000,
    },
    shippingFee: 3000,
    seller: { displayName: 'Adaeze Studio', shopUrl: 'adaeze', initials: 'A' },
    status: 'PAID',
    timeline: {
      paidAt: '2026-05-23T14:32:00Z',
      paidRelative: '2 days ago',
    },
  },
  'BTS-4N8R-2W1Y': {
    id: 'BTS-4N8R-2W1Y',
    product: {
      slug: 'brass-pendant',
      title: 'Brass Geometric Pendant',
      image: '/artwork-6.jpg',
      priceNaira: 45000,
    },
    shippingFee: 3500,
    seller: { displayName: 'Ama Studio', shopUrl: 'ama', initials: 'A' },
    status: 'SHIPPED',
    timeline: {
      paidAt: '2026-05-20T10:00:00Z',
      paidRelative: '5 days ago',
      shippedAt: '2026-05-25T09:00:00Z',
      shippedRelative: 'yesterday',
    },
  },
  'BTS-9X2P-5T6Q': {
    id: 'BTS-9X2P-5T6Q',
    product: {
      slug: 'thrown-vase',
      title: 'Hand Thrown Vase',
      image: '/artwork-3.jpg',
      priceNaira: 85000,
    },
    shippingFee: 3000,
    seller: { displayName: 'Fatima Studio', shopUrl: 'fatima', initials: 'F' },
    status: 'DELIVERED',
    timeline: {
      paidAt: '2026-05-11T16:00:00Z',
      paidRelative: '2 weeks ago',
      shippedAt: '2026-05-18T11:00:00Z',
      shippedRelative: '1 week ago',
      deliveredAt: '2026-05-22T14:00:00Z',
      deliveredRelative: '3 days ago',
    },
  },
  'BTS-3F5J-8K2M': {
    id: 'BTS-3F5J-8K2M',
    product: {
      slug: 'leather-journal',
      title: 'Tooled Leather Journal',
      image: '/artwork-5.jpg',
      priceNaira: 22000,
    },
    shippingFee: 3000,
    seller: { displayName: 'Zainab Studio', shopUrl: 'zainab', initials: 'Z' },
    status: 'CANCELLED',
    timeline: {
      cancelledAt: '2026-04-25T12:00:00Z',
      cancelledRelative: '1 month ago',
    },
  },
}

const STATUS_PILLS: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  PAID: { bg: 'bg-primary', text: 'text-primary-foreground', label: 'Paid · Awaiting shipment' },
  SHIPPED: { bg: 'bg-gold', text: 'text-foreground', label: 'Shipped' },
  DELIVERED: { bg: 'bg-success', text: 'text-primary-foreground', label: 'Delivered' },
  CANCELLED: { bg: 'bg-border', text: 'text-muted', label: 'Cancelled' },
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function BuyerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const order = ORDERS[id]

  const [currentStatus, setCurrentStatus] = useState<OrderStatus | undefined>(order?.status)
  const [currentTimeline, setCurrentTimeline] = useState<OrderTimeline>(order?.timeline ?? {})
  const [refCopied, setRefCopied] = useState(false)
  const [confirmReceived, setConfirmReceived] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)

  if (!order || !currentStatus) {
    return (
      <div className="bg-background min-h-screen text-foreground">
        <div className="sticky top-0 z-40 bg-background border-b border-border">
          <div className="px-5 py-3 flex items-center">
            <Link
              href="/profile"
              className="p-3 -m-3 hover:bg-input rounded transition-colors inline-flex"
              aria-label="Back to orders"
            >
              <ChevronLeft className="w-6 h-6 text-foreground" strokeWidth={2} />
            </Link>
          </div>
        </div>
        <main className="mx-auto max-w-xl px-5 py-20 text-center">
          <h1 className="font-serif text-3xl font-normal mb-2">Order not found.</h1>
          <p className="font-sans text-base text-muted mb-6">
            That order reference isn&apos;t one of yours.
          </p>
          <Link
            href="/profile"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded font-sans font-medium hover:opacity-90 transition-opacity"
          >
            Back to your orders
          </Link>
        </main>
      </div>
    )
  }

  const pill = STATUS_PILLS[currentStatus]!
  const total = order.product.priceNaira + order.shippingFee

  const handleCopyRef = () => {
    navigator.clipboard.writeText(order.id)
    setRefCopied(true)
    setTimeout(() => setRefCopied(false), 2000)
  }

  const handleConfirmReceived = async () => {
    setIsReceiving(true)
    await new Promise(r => setTimeout(r, 1000))
    const nowIso = new Date().toISOString()
    setCurrentStatus('DELIVERED')
    setCurrentTimeline(prev => ({
      ...prev,
      deliveredAt: nowIso,
      deliveredRelative: 'just now',
    }))
    setConfirmReceived(false)
    setIsReceiving(false)
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Back-arrow header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-5 py-3 flex items-center">
          <Link
            href="/profile"
            className="p-3 -m-3 hover:bg-input rounded transition-colors inline-flex"
            aria-label="Back to your orders"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" strokeWidth={2} />
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-5 sm:px-6 lg:px-8 py-6 pb-24">
        {/* Reference + status pill row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="font-sans text-xs text-muted uppercase tracking-widest mb-1">
              Order reference
            </p>
            <div className="flex items-center gap-2">
              <p className="font-sans text-base tabular-nums font-medium">{order.id}</p>
              <button
                onClick={handleCopyRef}
                className="text-accent hover:opacity-80 transition-opacity p-1 -m-1"
                aria-label="Copy reference"
              >
                {refCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div
            className={`${pill.bg} ${pill.text} text-xs px-3 py-1 rounded-full font-sans font-medium shrink-0 mt-1`}
          >
            {pill.label}
          </div>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-normal mb-8 mt-4">Your order.</h1>

        {/* Timeline */}
        <section className="mb-8">
          <h2 className="font-serif text-lg font-normal mb-4">Timeline</h2>
          <div className="space-y-3 font-sans text-sm">
            {currentTimeline.paidAt && (
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-foreground font-medium">Paid</p>
                  <p className="text-muted text-xs">
                    {formatDate(currentTimeline.paidAt)}
                    {currentTimeline.paidRelative ? ` · ${currentTimeline.paidRelative}` : ''}
                  </p>
                </div>
              </div>
            )}
            {currentTimeline.shippedAt && (
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-foreground font-medium">Shipped</p>
                  <p className="text-muted text-xs">
                    {formatDate(currentTimeline.shippedAt)}
                    {currentTimeline.shippedRelative ? ` · ${currentTimeline.shippedRelative}` : ''}
                  </p>
                </div>
              </div>
            )}
            {currentTimeline.deliveredAt && (
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-success mt-1.5 shrink-0" />
                <div>
                  <p className="text-foreground font-medium">Delivered</p>
                  <p className="text-muted text-xs">
                    {formatDate(currentTimeline.deliveredAt)}
                    {currentTimeline.deliveredRelative
                      ? ` · ${currentTimeline.deliveredRelative}`
                      : ''}
                  </p>
                </div>
              </div>
            )}
            {currentTimeline.cancelledAt && (
              <div className="flex gap-3">
                <div className="w-3 h-3 rounded-full bg-border mt-1.5 shrink-0" />
                <div>
                  <p className="text-muted font-medium">Cancelled</p>
                  <p className="text-muted text-xs">
                    {formatDate(currentTimeline.cancelledAt)}
                    {currentTimeline.cancelledRelative
                      ? ` · ${currentTimeline.cancelledRelative}`
                      : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Product card */}
        <section className="mb-8">
          <h2 className="font-serif text-lg font-normal mb-4">Item</h2>
          <Link
            href={`/products/${order.product.slug}`}
            className="block bg-white border border-border rounded-lg p-4 flex gap-4 hover:bg-input/30 transition-colors"
          >
            <img
              src={order.product.image}
              alt={order.product.title}
              className="w-20 h-20 rounded object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-serif text-lg text-foreground mb-1 truncate">
                {order.product.title}
              </p>
              <p className="font-sans text-sm text-accent mb-2">
                by {order.seller.displayName}
              </p>
              <p className="font-sans text-sm text-foreground tabular-nums">
                ₦{order.product.priceNaira.toLocaleString('en-NG')}
              </p>
            </div>
          </Link>
        </section>

        {/* Order summary */}
        <section className="mb-8">
          <h2 className="font-serif text-lg font-normal mb-4">Summary</h2>
          <div className="bg-white border border-border rounded-lg p-4 space-y-2 font-sans text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="text-foreground tabular-nums">
                ₦{order.product.priceNaira.toLocaleString('en-NG')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Shipping</span>
              <span className="text-foreground tabular-nums">
                ₦{order.shippingFee.toLocaleString('en-NG')}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between items-baseline">
              <span className="text-foreground font-medium">You paid</span>
              <span className="font-serif text-xl text-accent tabular-nums">
                ₦{total.toLocaleString('en-NG')}
              </span>
            </div>
          </div>
        </section>

        {/* Bought from */}
        <section className="mb-8">
          <h2 className="font-serif text-lg font-normal mb-4">Bought from</h2>
          <Link
            href={`/shop/${order.seller.shopUrl}`}
            className="bg-white border border-border rounded-lg p-4 flex items-center gap-4 hover:bg-input/30 transition-colors"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-serif text-lg shrink-0"
              style={{ backgroundColor: 'rgba(214, 121, 97, 0.2)', color: '#1F1410' }}
            >
              {order.seller.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-base text-foreground font-medium">
                {order.seller.displayName}
              </p>
              <p className="font-sans text-xs text-accent">Visit shop →</p>
            </div>
          </Link>
        </section>

        {/* Mark as received — only on SHIPPED orders */}
        {currentStatus === 'SHIPPED' && (
          <>
            <div className="h-px bg-gold opacity-60 mb-6" />

            {!confirmReceived ? (
              <div className="space-y-3">
                <button
                  onClick={() => setConfirmReceived(true)}
                  className="w-full bg-primary text-primary-foreground py-4 rounded font-sans font-medium hover:opacity-90 transition-opacity"
                  style={{ minHeight: '56px' }}
                >
                  Mark as received
                </button>
                <p className="font-sans text-xs text-muted text-center">
                  Confirms to {order.seller.displayName} that your piece arrived safely.
                </p>
              </div>
            ) : (
              <div className="bg-[#F5EFE3] rounded-lg p-4 space-y-4">
                <p className="font-sans text-sm text-foreground">
                  Confirm you&apos;ve received this order? {order.seller.displayName} will see the
                  status update.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmReceived}
                    disabled={isReceiving}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isReceiving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating…
                      </>
                    ) : (
                      'Yes, received'
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmReceived(false)}
                    disabled={isReceiving}
                    className="flex-1 bg-transparent text-foreground py-3 rounded font-sans text-sm font-medium hover:bg-border transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <p className="font-sans text-xs text-muted text-center mt-8">
          Need help with this order? Reach out to Bitscy support.
        </p>
      </main>
    </div>
  )
}
