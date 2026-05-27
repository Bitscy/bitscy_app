'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postal: string
  country: string
}

interface SellerOrderDetail {
  id: string
  product: {
    title: string
    image: string
    priceNaira: number
  }
  shippingFee: number
  buyer: {
    displayName: string
    memberSince: string
  }
  shippingAddress: ShippingAddress
  status: OrderStatus
  timeline: OrderTimeline
}

// Mock orders. In production these come from GET /api/orders/[id] with the
// shipping address NIP-04 encrypted to the seller's pubkey, decrypted
// client-side using the unlocked Nostr private key.
const ORDERS: Record<string, SellerOrderDetail> = {
  'BTS-2H8K-5L9M': {
    id: 'BTS-2H8K-5L9M',
    product: {
      title: 'Beaded Statement Collar',
      image: '/artwork-6.jpg',
      priceNaira: 38000,
    },
    shippingFee: 3000,
    buyer: {
      displayName: 'Tobi Akinwale',
      memberSince: 'May 2026',
    },
    shippingAddress: {
      name: 'Tobi Akinwale',
      line1: '12 Marina Drive',
      line2: 'Apartment 4B',
      city: 'Toronto',
      state: 'ON',
      postal: 'M5J 2X3',
      country: 'Canada',
    },
    status: 'PAID',
    timeline: {
      paidAt: '2026-05-25T08:14:00Z',
      paidRelative: '6 hours ago',
    },
  },
  'BTS-7K3M-9P2X': {
    id: 'BTS-7K3M-9P2X',
    product: {
      title: 'Indigo Dyed Fabric',
      image: '/artwork-2.jpg',
      priceNaira: 25000,
    },
    shippingFee: 3000,
    buyer: {
      displayName: 'Ngozi Adichie',
      memberSince: 'April 2026',
    },
    shippingAddress: {
      name: 'Ngozi Adichie',
      line1: '47 Glover Road',
      city: 'Ikoyi, Lagos',
      state: 'Lagos State',
      postal: '101233',
      country: 'Nigeria',
    },
    status: 'PAID',
    timeline: {
      paidAt: '2026-05-23T14:32:00Z',
      paidRelative: '2 days ago',
    },
  },
  'BTS-4F5R-1Q8Y': {
    id: 'BTS-4F5R-1Q8Y',
    product: {
      title: 'Geometric Abstract Composition',
      image: '/artwork-1.jpg',
      priceNaira: 45000,
    },
    shippingFee: 3500,
    buyer: {
      displayName: 'Kweku Mensah',
      memberSince: 'March 2026',
    },
    shippingAddress: {
      name: 'Kweku Mensah',
      line1: '8 Independence Avenue',
      city: 'Accra',
      state: 'Greater Accra',
      postal: 'GA-184',
      country: 'Ghana',
    },
    status: 'SHIPPED',
    timeline: {
      paidAt: '2026-05-20T10:00:00Z',
      paidRelative: '5 days ago',
      shippedAt: '2026-05-21T09:15:00Z',
      shippedRelative: '4 days ago',
    },
  },
  'BTS-9X2P-5T6Q': {
    id: 'BTS-9X2P-5T6Q',
    product: {
      title: 'Hand Thrown Vase',
      image: '/artwork-3.jpg',
      priceNaira: 88000,
    },
    shippingFee: 3000,
    buyer: {
      displayName: 'Fatima Hassan',
      memberSince: 'February 2026',
    },
    shippingAddress: {
      name: 'Fatima Hassan',
      line1: '5 Sokoto Road',
      city: 'Kano',
      state: 'Kano State',
      postal: '700233',
      country: 'Nigeria',
    },
    status: 'DELIVERED',
    timeline: {
      paidAt: '2026-05-11T16:00:00Z',
      paidRelative: '2 weeks ago',
      shippedAt: '2026-05-13T11:00:00Z',
      shippedRelative: '12 days ago',
      deliveredAt: '2026-05-22T14:00:00Z',
      deliveredRelative: '3 days ago',
    },
  },
  'BTS-3F5J-8K2M': {
    id: 'BTS-3F5J-8K2M',
    product: {
      title: 'Tooled Leather Journal',
      image: '/artwork-5.jpg',
      priceNaira: 25000,
    },
    shippingFee: 3000,
    buyer: {
      displayName: 'Amaka Eze',
      memberSince: 'January 2026',
    },
    shippingAddress: {
      name: 'Amaka Eze',
      line1: '23 Allen Avenue',
      city: 'Ikeja, Lagos',
      state: 'Lagos State',
      postal: '100271',
      country: 'Nigeria',
    },
    status: 'CANCELLED',
    timeline: {
      cancelledAt: '2026-04-25T12:00:00Z',
      cancelledRelative: '1 month ago',
    },
  },
}

const STATUS_PILLS: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  PAID: { bg: 'bg-primary', text: 'text-primary-foreground', label: 'New sale · Ready to ship' },
  SHIPPED: { bg: 'bg-gold', text: 'text-foreground', label: 'Shipped' },
  DELIVERED: { bg: 'bg-success', text: 'text-primary-foreground', label: 'Delivered' },
  CANCELLED: { bg: 'bg-border', text: 'text-muted', label: 'Cancelled' },
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatAddressForCopy = (a: ShippingAddress): string => {
  const lines = [a.name, a.line1]
  if (a.line2) lines.push(a.line2)
  lines.push(`${a.city}, ${a.state} ${a.postal}`)
  lines.push(a.country)
  return lines.join('\n')
}

export default function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { id } = use(params)
  const order = ORDERS[id]

  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order?.status ?? 'PAID')
  const [currentTimeline, setCurrentTimeline] = useState<OrderTimeline>(order?.timeline ?? {})
  const [shippingConfirm, setShippingConfirm] = useState(false)
  const [isShipping, setIsShipping] = useState(false)
  const [refCopied, setRefCopied] = useState(false)
  const [addressCopied, setAddressCopied] = useState(false)

  // Order not found
  if (!order) {
    return (
      <div className="bg-background min-h-screen text-foreground">
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
        <main className="mx-auto max-w-xl px-5 py-20 text-center">
          <h1 className="font-serif text-3xl font-normal mb-2">Order not found.</h1>
          <p className="font-sans text-base text-muted mb-6">
            That order reference doesn&apos;t match anything in your shop.
          </p>
          <Link
            href="/seller/orders"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded font-sans font-medium hover:opacity-90 transition-opacity"
          >
            Back to orders
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

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(formatAddressForCopy(order.shippingAddress))
    setAddressCopied(true)
    setTimeout(() => setAddressCopied(false), 2000)
  }

  const handleConfirmShipped = async () => {
    setIsShipping(true)
    await new Promise(r => setTimeout(r, 1200))
    const nowIso = new Date().toISOString()
    setCurrentStatus('SHIPPED')
    setCurrentTimeline(prev => ({
      ...prev,
      shippedAt: nowIso,
      shippedRelative: 'just now',
    }))
    setShippingConfirm(false)
    setIsShipping(false)
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Back-arrow header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-5 py-3 flex items-center">
          <Link
            href="/seller/orders"
            className="p-3 -m-3 hover:bg-input rounded transition-colors inline-flex"
            aria-label="Back to orders"
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
          <div className={`${pill.bg} ${pill.text} text-xs px-3 py-1 rounded-full font-sans font-medium shrink-0 mt-1`}>
            {pill.label}
          </div>
        </div>

        {/* Order title */}
        <h1 className="font-serif text-3xl sm:text-4xl font-normal mb-8 mt-4">
          Order details.
        </h1>

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
                    {currentTimeline.deliveredRelative ? ` · ${currentTimeline.deliveredRelative}` : ''}
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
                    {currentTimeline.cancelledRelative ? ` · ${currentTimeline.cancelledRelative}` : ''}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Product card */}
        <section className="mb-8">
          <h2 className="font-serif text-lg font-normal mb-4">Item</h2>
          <div className="bg-white border border-border rounded-lg p-4 flex gap-4">
            <img
              src={order.product.image}
              alt={order.product.title}
              className="w-20 h-20 rounded object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-sans text-xs text-muted mb-1">Your product</p>
              <p className="font-serif text-lg text-foreground mb-2 truncate">
                {order.product.title}
              </p>
              <p className="font-sans text-sm text-foreground tabular-nums">
                ₦{order.product.priceNaira.toLocaleString('en-NG')}
              </p>
            </div>
          </div>
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
              <span className="text-foreground font-medium">Buyer paid</span>
              <span className="font-serif text-xl text-accent tabular-nums">
                ₦{total.toLocaleString('en-NG')}
              </span>
            </div>
          </div>
        </section>

        {/* Buyer block */}
        <section className="mb-8">
          <h2 className="font-serif text-lg font-normal mb-4">Buyer</h2>
          <div className="bg-white border border-border rounded-lg p-4">
            <p className="font-sans text-base text-foreground font-medium">
              {order.buyer.displayName}
            </p>
            <p className="font-sans text-xs text-muted mt-1">
              On Bitscy since {order.buyer.memberSince}
            </p>
          </div>
        </section>

        {/* Shipping address — the decrypted block */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-lg font-normal">Ship to</h2>
            <button
              onClick={handleCopyAddress}
              className="font-sans text-sm text-accent hover:opacity-80 transition-opacity flex items-center gap-1.5"
            >
              {addressCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy address
                </>
              )}
            </button>
          </div>
          <div className="bg-white border border-border rounded-lg p-4">
            <p className="font-sans text-base text-foreground leading-relaxed whitespace-pre-line">
              {order.shippingAddress.name}
              {'\n'}
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && <>{'\n'}{order.shippingAddress.line2}</>}
              {'\n'}
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postal}
              {'\n'}
              {order.shippingAddress.country}
            </p>
            <p className="font-sans text-xs text-muted mt-3 pt-3 border-t border-border">
              Encrypted to your account. Only you can see this.
            </p>
          </div>
        </section>

        {/* Mark-as-shipped action — only when PAID */}
        {currentStatus === 'PAID' && (
          <>
            <div className="h-px bg-gold opacity-60 mb-6" />

            {!shippingConfirm ? (
              <button
                onClick={() => setShippingConfirm(true)}
                className="w-full bg-primary text-primary-foreground py-4 rounded font-sans font-medium hover:opacity-90 transition-opacity"
                style={{ minHeight: '56px' }}
              >
                Mark as shipped
              </button>
            ) : (
              <div className="bg-[#F5EFE3] rounded-lg p-4 space-y-4">
                <p className="font-sans text-sm text-foreground">
                  Mark this order as shipped to {order.buyer.displayName}? They&apos;ll see the status update.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmShipped}
                    disabled={isShipping}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isShipping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating…
                      </>
                    ) : (
                      'Confirm'
                    )}
                  </button>
                  <button
                    onClick={() => setShippingConfirm(false)}
                    disabled={isShipping}
                    className="flex-1 bg-transparent text-foreground py-3 rounded font-sans text-sm font-medium hover:bg-border transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Help affordance */}
        <p className="font-sans text-xs text-muted text-center mt-8">
          Need help with this order? Reach out to Bitscy support.
        </p>
      </main>
    </div>
  )
}
