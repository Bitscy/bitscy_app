'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'

const SELLER = {
  name: 'Adaeze Studio',
  initials: 'A',
  memberSince: 'April 2026',
  shopUrl: 'bitscy.com/shop/adaeze',
}

const STATS = {
  availableBalance: 127500,
  sats: 425000,
  totalSales: 8,
  totalEarned: 487000,
}

const PRODUCTS = [
  {
    id: 1,
    title: 'Indigo Dyed Fabric',
    price: 25000,
    image: '/artwork-2.jpg',
  },
  {
    id: 2,
    title: 'Beaded Statement Collar',
    price: 38000,
    image: '/artwork-6.jpg',
  },
  {
    id: 3,
    title: 'Hand Thrown Vase',
    price: 88000,
    image: '/artwork-3.jpg',
  },
  {
    id: 4,
    title: 'Tooled Leather Journal',
    price: 25000,
    image: '/artwork-5.jpg',
  },
]

interface SellerOrder {
  id: string
  product: string
  buyer: string
  total: number
  paidRelative: string
  shippedRelative?: string
  deliveredRelative?: string
  status: 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
}

const ORDERS: SellerOrder[] = [
  {
    id: 'BTS-2H8K-5L9M',
    product: 'Beaded Statement Collar',
    buyer: 'K. M.',
    total: 41000,
    paidRelative: '6 hours ago',
    status: 'PAID',
  },
  {
    id: 'BTS-7K3M-9P2X',
    product: 'Indigo Dyed Fabric',
    buyer: 'T. A.',
    total: 28000,
    paidRelative: '2 days ago',
    status: 'PAID',
  },
  {
    id: 'BTS-4F5R-1Q8Y',
    product: 'Geometric Abstract Composition',
    buyer: 'N. O.',
    total: 48500,
    paidRelative: '5 days ago',
    shippedRelative: '4 days ago',
    status: 'SHIPPED',
  },
  {
    id: 'BTS-9X2P-5T6Q',
    product: 'Hand Thrown Vase',
    buyer: 'F. H.',
    total: 91000,
    paidRelative: '2 weeks ago',
    shippedRelative: '12 days ago',
    deliveredRelative: '3 days ago',
    status: 'DELIVERED',
  },
]

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PAID: { bg: 'bg-primary', text: 'text-primary-foreground', label: 'New sale · Ready to ship' },
  SHIPPED: { bg: 'bg-gold', text: 'text-foreground', label: 'Shipped' },
  DELIVERED: { bg: 'bg-success', text: 'text-primary-foreground', label: 'Delivered' },
  CANCELLED: { bg: 'bg-border', text: 'text-muted', label: 'Cancelled' },
}

function SellerPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // ?empty=1 renders the brand-new-seller dashboard branch (₦0 balance,
  // 0 sales, 0 products, 0 orders). Real implementation derives this
  // from session-state checks against actual data.
  const isEmpty = searchParams.get('empty') === '1'

  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [shippingConfirm, setShippingConfirm] = useState<string | null>(null)
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>(
    ORDERS.reduce((acc, order) => ({ ...acc, [order.id]: order.status }), {})
  )
  // Mock: assume the seller hasn't finished their profile yet so the
  // "Complete your shop" banner renders. Production ties this to session
  // state (avatar + about + location all set).
  const [profileBannerVisible, setProfileBannerVisible] = useState(true)

  // Empty-state derived values
  const balance = isEmpty ? 0 : STATS.availableBalance
  const balanceSats = isEmpty ? 0 : STATS.sats
  const totalSales = isEmpty ? 0 : STATS.totalSales
  const totalEarned = isEmpty ? 0 : STATS.totalEarned
  const orders = isEmpty ? [] : ORDERS
  const products = isEmpty ? [] : PRODUCTS

  const handleCopyShopUrl = () => {
    navigator.clipboard.writeText(SELLER.shopUrl)
    setCopiedText('shop')
    setTimeout(() => setCopiedText(null), 2000)
  }

  const handleMarkAsShipped = (orderId: string) => {
    setOrderStatuses(prev => ({ ...prev, [orderId]: 'SHIPPED' }))
    setShippingConfirm(null)
  }

  const handleSignOut = () => {
    router.push('/')
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* TOP NAVIGATION */}
      <nav className="fixed top-0 z-50 w-full h-16 bg-background/80 backdrop-blur-sm border-b border-border flex items-center">
        <div className="w-full px-5 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Logo */}
          <Link
            href="/"
            className="font-serif text-2xl font-normal hover:opacity-80 transition-opacity"
          >
            Bitscy
          </Link>

          {/* Right: Avatar + Settings + Sign out */}
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="w-11 h-11 rounded-full flex items-center justify-center font-serif text-lg font-normal hover:opacity-80 transition-opacity"
              style={{ backgroundColor: 'rgba(214, 121, 97, 0.2)', color: '#1F1410' }}
              aria-label="View profile"
            >
              {SELLER.initials}
            </Link>
            <Link
              href="/seller/settings"
              className="text-sm text-muted hover:text-foreground transition-colors font-sans hidden sm:inline"
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="text-sm text-muted hover:text-foreground transition-colors font-sans"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="pt-20 lg:pt-24">
        <div className="w-full px-5 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto">
            {/* SHOP HEADER */}
            <div className="mb-8 lg:mb-12">
              <h1 className="font-serif text-3xl sm:text-4xl font-normal mb-2">
                {SELLER.name}
              </h1>
              <p className="font-sans text-sm sm:text-base text-muted mb-4">
                {totalSales} sales · {products.length} products listed · Member since {SELLER.memberSince}
              </p>

              {/* Shop URL Pill */}
              <div className="inline-flex items-center gap-3 bg-card border border-border px-4 py-2 rounded-full">
                <Link
                  href="/shop/adaeze"
                  className="font-sans text-xs sm:text-sm text-foreground tabular-nums hover:text-accent transition-colors"
                >
                  {SELLER.shopUrl}
                </Link>
                <button
                  onClick={handleCopyShopUrl}
                  className="text-xs sm:text-sm text-accent hover:opacity-80 transition-opacity font-sans font-medium"
                >
                  {copiedText === 'shop' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* COMPLETE-YOUR-SHOP BANNER (shown when profile is incomplete) */}
            {profileBannerVisible && (
              <div className="bg-[#F5EFE3] border border-border rounded-lg p-4 sm:p-5 mb-6 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg sm:text-xl font-normal text-foreground mb-1">
                    Complete your shop.
                  </h3>
                  <p className="font-sans text-sm text-muted mb-3 sm:max-w-md">
                    Add a photo and a sentence about your work so buyers know who you are.
                  </p>
                  <Link
                    href="/seller/profile?incomplete=1"
                    className="inline-block font-sans text-sm text-accent font-medium hover:opacity-80 transition-opacity"
                  >
                    Complete your shop →
                  </Link>
                </div>
                <button
                  onClick={() => setProfileBannerVisible(false)}
                  className="text-muted hover:text-foreground transition-colors p-1 -m-1 shrink-0"
                  aria-label="Dismiss"
                >
                  <span className="text-xs font-sans">Dismiss</span>
                </button>
              </div>
            )}

            {/* TWO COLUMN LAYOUT - Mobile stacked, Desktop side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
              {/* LEFT COLUMN - Balance and Stats (60% on desktop) */}
              <div className="lg:col-span-2 space-y-6">
                {/* BALANCE CARD */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <p className="font-sans text-xs uppercase tracking-widest text-muted mb-3">
                    Available balance
                  </p>
                  <div className="mb-1">
                    <p className={`font-serif text-5xl sm:text-6xl font-normal tabular-nums ${
                      balance === 0 ? 'text-muted' : 'text-foreground'
                    }`}>
                      ₦{balance.toLocaleString('en-NG')}
                    </p>
                  </div>
                  <p className="font-sans text-sm text-muted mb-1 tabular-nums">
                    ≈ {balanceSats.toLocaleString('en-NG')} sats
                  </p>
                  <p className="font-sans text-xs text-muted mb-6">
                    Updated just now
                  </p>
                  {balance === 0 ? (
                    <button
                      type="button"
                      disabled
                      className="block w-full text-center bg-primary text-primary-foreground py-3 px-4 rounded font-sans font-medium opacity-50 cursor-not-allowed"
                    >
                      Withdraw to bank
                    </button>
                  ) : (
                    <Link
                      href="/seller/withdraw"
                      className="block w-full text-center bg-primary text-primary-foreground py-3 px-4 rounded font-sans font-medium hover:opacity-90 transition-opacity"
                    >
                      Withdraw to bank
                    </Link>
                  )}
                </div>

                {/* STATS ROW */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-lg p-4">
                    <p className="font-sans text-xs uppercase tracking-widest text-muted mb-3">
                      Total sales
                    </p>
                    <p className={`font-serif text-4xl sm:text-5xl font-normal ${
                      totalSales === 0 ? 'text-muted' : 'text-foreground'
                    }`}>
                      {totalSales}
                    </p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4">
                    <p className="font-sans text-xs uppercase tracking-widest text-muted mb-3">
                      Total earned
                    </p>
                    <p className={`font-serif text-2xl sm:text-3xl font-normal tabular-nums ${
                      totalEarned === 0 ? 'text-muted' : 'text-foreground'
                    }`}>
                      ₦{(totalEarned / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN - Recent Orders (40% on desktop) */}
              <div className="lg:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-2xl font-normal">Recent orders</h2>
                  <Link
                    href="/seller/orders"
                    className="text-sm text-accent hover:opacity-80 transition-opacity font-sans"
                  >
                    See all
                  </Link>
                </div>

                <div className="space-y-3">
                  {orders.length === 0 && (
                    <div className="bg-card border border-border rounded-lg p-6 text-center">
                      <div
                        className="w-12 h-12 rounded-full border-2 mx-auto mb-4"
                        style={{ borderColor: '#E8B43D' }}
                        aria-hidden="true"
                      />
                      <p className="font-serif text-lg font-normal mb-2">No orders yet.</p>
                      <p className="font-sans text-sm text-muted mb-4">
                        Share your shop link to make your first sale.
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyShopUrl}
                        className="font-sans text-sm text-accent hover:opacity-80 transition-opacity font-medium"
                      >
                        {copiedText === 'shop' ? 'Copied' : 'Copy shop link'}
                      </button>
                    </div>
                  )}
                  {orders.map(order => {
                    const status = orderStatuses[order.id]!
                    const config = STATUS_CONFIG[status]!

                    return (
                      <div key={order.id} className="bg-card border border-border rounded-lg overflow-hidden">
                        <Link
                          href={`/seller/orders/${order.id}`}
                          className="block p-4 space-y-3 hover:bg-input/30 transition-colors"
                        >
                          {/* Status Pill */}
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted font-sans tabular-nums">
                              {order.id}
                            </p>
                            <div className={`${config.bg} ${config.text} text-xs px-3 py-1 rounded-full font-sans font-medium`}>
                              {config.label}
                            </div>
                          </div>

                          {/* Order Info */}
                          <div>
                            <p className="font-serif text-sm font-normal text-foreground">
                              {order.product}
                            </p>
                            <p className="font-sans text-xs text-accent">
                              Sold to {order.buyer}
                            </p>
                            <p className="font-sans text-sm text-foreground tabular-nums">
                              ₦{order.total.toLocaleString('en-NG')}
                            </p>
                          </div>

                          {/* Date Info */}
                          <p className="font-sans text-xs text-muted">
                            {order.paidRelative}
                          </p>
                        </Link>

                        {/* Mark as Shipped - Only for PAID orders */}
                        {status === 'PAID' && !shippingConfirm?.includes(order.id) && (
                          <div className="border-t border-border px-4 py-3">
                            <button
                              onClick={() => setShippingConfirm(order.id)}
                              className="w-full bg-primary text-primary-foreground py-2 px-3 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                              Mark as shipped
                            </button>
                          </div>
                        )}

                        {/* Confirmation State */}
                        {shippingConfirm === order.id && (
                          <div className="border-t border-border bg-[#F5EFE3] px-4 py-3">
                            <p className="font-sans text-sm text-foreground mb-3">
                              Mark this order as shipped to {order.buyer}? They&apos;ll see the status update.
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleMarkAsShipped(order.id)}
                                className="flex-1 bg-primary text-primary-foreground py-2 px-3 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setShippingConfirm(null)}
                                className="flex-1 bg-transparent text-foreground py-2 px-3 rounded font-sans text-sm font-medium hover:bg-border transition-colors"
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
              </div>
            </div>

            {/* YOUR PRODUCTS SECTION */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-normal">Your products</h2>
                <Link
                  href="/seller/products/new"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity h-10"
                >
                  <Plus size={16} />
                  Add product
                </Link>
              </div>

              {products.length === 0 ? (
                <div className="bg-white border border-dashed border-border rounded-lg p-8 text-center mb-6">
                  <p className="font-serif text-2xl font-normal mb-2">Add your first piece.</p>
                  <p className="font-sans text-sm text-muted mb-5 max-w-sm mx-auto">
                    It takes 5 minutes. Photos, price, description, done.
                  </p>
                  <Link
                    href="/seller/products/new"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Plus size={16} />
                    Add product
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {products.map(product => (
                    <Link
                      key={product.id}
                      href={`/seller/products/${product.id}/edit`}
                      className="group block text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-muted">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h3 className="font-serif text-sm font-normal text-foreground line-clamp-1">
                        {product.title}
                      </h3>
                      <p className="font-sans text-xs text-muted tabular-nums">
                        ₦{product.price.toLocaleString('en-NG')}
                      </p>
                    </Link>
                  ))}
                </div>
              )}

              {products.length > 0 && (
                <div className="text-center">
                  <Link
                    href="/seller/products"
                    className="font-sans text-sm text-accent hover:opacity-80 transition-opacity"
                  >
                    See all {products.length} products
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function SellerPage() {
  return (
    <Suspense fallback={<div className="bg-background min-h-screen" />}>
      <SellerPageContent />
    </Suspense>
  )
}
