'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { Check, Copy } from 'lucide-react'

interface SuccessOrder {
  buyerOrderId: string
  productTitle: string
  productImage: string
  artist: string
  priceNaira: number
}

// Mock data keyed by orderId. In production: GET /api/orders/[id] returns this.
const ORDERS: Record<string, SuccessOrder> = {
  'order-indigo-fabric': {
    buyerOrderId: 'BTS-7K3M-9P2X',
    productTitle: 'Indigo Dyed Fabric',
    productImage: '/artwork-2.jpg',
    artist: 'Adaeze',
    priceNaira: 25000,
  },
}

const DEFAULT_ORDER = ORDERS['order-indigo-fabric']!

export default function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = use(params)
  const order = ORDERS[orderId] ?? DEFAULT_ORDER

  const [copied, setCopied] = useState(false)

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.buyerOrderId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      <main className="mx-auto max-w-2xl px-5 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Success ornament */}
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-success" strokeWidth={3} />
          </div>
        </div>

        <div className="text-center">
          <h1 className="font-serif text-4xl sm:text-5xl font-normal mb-2 leading-tight">
            You just supported {order.artist}.
          </h1>
          <p className="font-sans text-base text-muted mb-10">Your order is on its way.</p>
        </div>

        {/* Order summary card */}
        <div className="bg-white border border-border rounded-lg p-6 mb-8">
          <div className="flex gap-4 mb-6">
            <img
              src={order.productImage}
              alt={order.productTitle}
              className="w-16 h-16 rounded object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-serif text-lg font-medium truncate">{order.productTitle}</p>
              <p className="font-sans text-sm text-muted">by {order.artist}</p>
              <p className="font-serif text-lg text-accent mt-2 tabular-nums">
                ₦{order.priceNaira.toLocaleString('en-NG')}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4 font-sans text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted">Order ID</span>
              <div className="flex items-center gap-2">
                <code className="text-foreground tabular-nums">{order.buyerOrderId}</code>
                <button
                  onClick={handleCopyOrderId}
                  className="text-accent hover:text-primary transition-colors"
                  aria-label="Copy order ID"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href={`/buyer/orders/${order.buyerOrderId}`}
            className="block w-full text-center bg-primary text-primary-foreground py-3 rounded font-sans font-medium hover:opacity-90 transition-opacity"
          >
            Track your order
          </Link>
          <Link
            href="/marketplace"
            className="block w-full text-center text-primary font-sans font-medium hover:text-primary/80 transition-colors py-3"
          >
            Keep browsing
          </Link>
        </div>
      </main>
    </div>
  )
}
