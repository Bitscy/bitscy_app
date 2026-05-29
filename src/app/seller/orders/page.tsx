'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

type OrderStatus = 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
type FilterKey = 'ALL' | 'PAID' | 'SHIPPED' | 'DELIVERED'

interface SellerOrderRow {
  id: string
  product: string
  productImage: string
  buyer: string
  total: number
  paidRelative?: string
  shippedRelative?: string
  deliveredRelative?: string
  cancelledRelative?: string
  status: OrderStatus
}

// Mock data — same orders as /seller dashboard recent-orders + a few more.
// In production this comes from GET /api/seller/orders.
const ORDERS_SEED: SellerOrderRow[] = [
  {
    id: 'BTS-2H8K-5L9M',
    product: 'Beaded Statement Collar',
    productImage: '/artwork-6.jpg',
    buyer: 'T. Akinwale',
    total: 41000,
    paidRelative: '6 hours ago',
    status: 'PAID',
  },
  {
    id: 'BTS-7K3M-9P2X',
    product: 'Indigo Dyed Fabric',
    productImage: '/artwork-2.jpg',
    buyer: 'N. Adichie',
    total: 28000,
    paidRelative: '2 days ago',
    status: 'PAID',
  },
  {
    id: 'BTS-4F5R-1Q8Y',
    product: 'Geometric Abstract Composition',
    productImage: '/artwork-1.jpg',
    buyer: 'K. Mensah',
    total: 48500,
    paidRelative: '5 days ago',
    shippedRelative: '4 days ago',
    status: 'SHIPPED',
  },
  {
    id: 'BTS-9X2P-5T6Q',
    product: 'Hand Thrown Vase',
    productImage: '/artwork-3.jpg',
    buyer: 'F. Hassan',
    total: 91000,
    paidRelative: '2 weeks ago',
    shippedRelative: '12 days ago',
    deliveredRelative: '3 days ago',
    status: 'DELIVERED',
  },
  {
    id: 'BTS-3F5J-8K2M',
    product: 'Tooled Leather Journal',
    productImage: '/artwork-5.jpg',
    buyer: 'A. Eze',
    total: 25000,
    cancelledRelative: '1 month ago',
    status: 'CANCELLED',
  },
]

const STATUS_PILLS: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  PAID: { bg: 'bg-primary', text: 'text-primary-foreground', label: 'New sale · Ready to ship' },
  SHIPPED: { bg: 'bg-gold', text: 'text-foreground', label: 'Shipped' },
  DELIVERED: { bg: 'bg-success', text: 'text-primary-foreground', label: 'Delivered' },
  CANCELLED: { bg: 'bg-border', text: 'text-muted', label: 'Cancelled' },
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PAID', label: 'Ready to ship' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
]

export default function SellerOrdersListPage() {
  const [filter, setFilter] = useState<FilterKey>('ALL')
  const [orderStatuses, setOrderStatuses] = useState<Record<string, OrderStatus>>(
    Object.fromEntries(ORDERS_SEED.map(o => [o.id, o.status]))
  )
  const [shippingConfirm, setShippingConfirm] = useState<string | null>(null)
  const [shippingInProgress, setShippingInProgress] = useState<string | null>(null)

  const handleConfirmShipped = async (orderId: string) => {
    setShippingInProgress(orderId)
    await new Promise(r => setTimeout(r, 1000))
    setOrderStatuses(prev => ({ ...prev, [orderId]: 'SHIPPED' }))
    setShippingConfirm(null)
    setShippingInProgress(null)
  }

  // Apply filter
  const visible = ORDERS_SEED.filter(o => {
    const status = orderStatuses[o.id] ?? o.status
    if (filter === 'ALL') return true
    return status === filter
  })

  // Count per filter
  const countFor = (key: FilterKey): number => {
    if (key === 'ALL') return ORDERS_SEED.length
    return ORDERS_SEED.filter(o => (orderStatuses[o.id] ?? o.status) === key).length
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

      <main className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8 py-6 pb-12">
        {/* Title */}
        <h1 className="font-serif text-4xl sm:text-5xl font-normal mb-2">Orders.</h1>
        <p className="font-sans text-sm text-muted mb-6">
          {ORDERS_SEED.length} {ORDERS_SEED.length === 1 ? 'order' : 'orders'} all time
        </p>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map(f => {
            const isActive = filter === f.key
            const count = countFor(f.key)
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white border border-border text-foreground hover:border-primary'
                }`}
                style={{ minHeight: '36px' }}
              >
                {f.label}
                <span className={`ml-2 text-xs ${isActive ? 'opacity-80' : 'text-muted'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div
              className="w-16 h-16 rounded-full border-2 mb-5"
              style={{ borderColor: '#E8B43D' }}
              aria-hidden="true"
            />
            <h2 className="font-serif text-2xl font-normal mb-2">
              {filter === 'ALL' ? 'No orders here yet.' : 'No orders in this view.'}
            </h2>
            <p className="font-sans text-sm text-muted max-w-sm">
              {filter === 'ALL'
                ? 'Your first sale is one share away.'
                : 'Try a different filter, or check back later.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(order => {
              const status = orderStatuses[order.id] ?? order.status
              const pill = STATUS_PILLS[status]!
              const isPaid = status === 'PAID'
              const isConfirming = shippingConfirm === order.id

              return (
                <div key={order.id} className="bg-white border border-border rounded-lg overflow-hidden">
                  <Link
                    href={`/seller/orders/${order.id}`}
                    className="block p-4 hover:bg-input/30 transition-colors"
                  >
                    {/* Top row: ref + pill */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <p className="text-xs text-muted font-sans tabular-nums">{order.id}</p>
                      <div className={`${pill.bg} ${pill.text} text-xs px-3 py-1 rounded-full font-sans font-medium`}>
                        {pill.label}
                      </div>
                    </div>

                    {/* Middle: product info */}
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={order.productImage}
                        alt={order.product}
                        className="w-14 h-14 rounded object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-base text-foreground truncate">
                          {order.product}
                        </p>
                        <p className="font-sans text-xs text-accent">
                          Sold to {order.buyer}
                        </p>
                        <p className="font-sans text-sm text-foreground tabular-nums">
                          ₦{order.total.toLocaleString('en-NG')}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                    </div>

                    {/* Bottom row: relative date */}
                    <p className="font-sans text-xs text-muted">
                      {status === 'CANCELLED'
                        ? order.cancelledRelative
                        : status === 'DELIVERED'
                        ? `Delivered ${order.deliveredRelative}`
                        : status === 'SHIPPED'
                        ? `Shipped ${order.shippedRelative}`
                        : `Paid ${order.paidRelative}`}
                    </p>
                  </Link>

                  {/* Inline mark-as-shipped (only PAID) */}
                  {isPaid && !isConfirming && (
                    <div className="border-t border-border px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setShippingConfirm(order.id)}
                        className="w-full bg-primary text-primary-foreground py-2 px-3 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        Mark as shipped
                      </button>
                    </div>
                  )}

                  {/* Confirm state */}
                  {isPaid && isConfirming && (
                    <div className="border-t border-border bg-[#F5EFE3] px-4 py-3 space-y-3">
                      <p className="font-sans text-sm text-foreground">
                        Mark this order as shipped to {order.buyer}? They&apos;ll see the status update.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmShipped(order.id)}
                          disabled={shippingInProgress === order.id}
                          className="flex-1 bg-primary text-primary-foreground py-2 px-3 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {shippingInProgress === order.id ? (
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
                          onClick={() => setShippingConfirm(null)}
                          disabled={shippingInProgress === order.id}
                          className="flex-1 bg-transparent text-foreground py-2 px-3 rounded font-sans text-sm font-medium hover:bg-border transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
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
