'use client'

import { Bell } from 'lucide-react'
import Link from 'next/link'
import BalanceCard from '@/components/balance-card'
import MetricCard from '@/components/metric-card'
import OrderRow from '@/components/order-row'
import SellerProductCard from '@/components/seller-product-card'
import BottomNavigation from '@/components/bottom-navigation'

const SAMPLE_ORDERS = [
  {
    id: '1',
    image: '/artwork-1.jpg',
    title: 'Geometric Abstract Composition',
    buyerName: 'To Tobi',
    timeAgo: '2 hours ago',
    status: 'Paid' as const,
  },
  {
    id: '2',
    image: '/artwork-2.jpg',
    title: 'Indigo Woven Textile',
    buyerName: 'To Chioma',
    timeAgo: '5 hours ago',
    status: 'Shipped' as const,
  },
  {
    id: '3',
    image: '/artwork-3.jpg',
    title: 'Handthrown Ceramic Vessel',
    buyerName: 'To Amara',
    timeAgo: '1 day ago',
    status: 'Delivered' as const,
  },
]

const SELLER_PRODUCTS = [
  {
    id: '1',
    image: '/artwork-1.jpg',
    title: 'Geometric Abstract Composition',
    priceNaira: 45000,
    priceSats: 125000,
    status: 'Active' as const,
  },
  {
    id: '2',
    image: '/artwork-2.jpg',
    title: 'Indigo Woven Textile',
    priceNaira: 28000,
    priceSats: 85000,
    status: 'Active' as const,
  },
  {
    id: '3',
    image: '/artwork-3.jpg',
    title: 'Handthrown Ceramic Vessel',
    priceNaira: 35000,
    priceSats: 95000,
    status: 'Sold' as const,
  },
  {
    id: '4',
    image: '/artwork-4.jpg',
    title: 'Contemporary Color Field',
    priceNaira: 52000,
    priceSats: 145000,
    status: 'Active' as const,
  },
  {
    id: '5',
    image: '/artwork-5.jpg',
    title: 'Tooled Leather Journal',
    priceNaira: 22000,
    priceSats: 65000,
    status: 'Active' as const,
  },
]

export default function SellerDashboard() {
  return (
    <div className="flex flex-col min-h-screen bg-bitscy-background pb-20">
      {/* Header */}
      <header className="px-5 py-6 lg:px-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="font-serif text-[26px] lg:text-[28px] text-bitscy-text font-normal">
            Hello, Adaeze
          </h1>
          <button
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#F5EDE0] transition-colors"
            aria-label="Notifications"
          >
            <Bell size={24} className="text-bitscy-text" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-5 lg:px-10">
        <div className="max-w-6xl mx-auto space-y-10">
          {/* Balance Card */}
          <section>
            <BalanceCard />
          </section>

          {/* Metrics Row */}
          <section>
            <div className="grid grid-cols-2 gap-4">
              <MetricCard number="12" label="sales this month" />
              <MetricCard number="₦680,000" label="total earned" numberColor="indigo" />
            </div>
          </section>

          {/* Recent Orders Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-[22px] text-bitscy-text font-normal">
                Recent orders
              </h2>
              <Link
                href="/seller/orders"
                className="text-bitscy-primary font-medium text-[14px] hover:underline"
              >
                See all
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {SAMPLE_ORDERS.map((order) => (
                <OrderRow
                  key={order.id}
                  image={order.image}
                  title={order.title}
                  buyerName={order.buyerName}
                  timeAgo={order.timeAgo}
                  status={order.status}
                />
              ))}
            </div>
          </section>

          {/* Your Products Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-[22px] text-bitscy-text font-normal">
                Your products
              </h2>
              <Link
                href="/products/new"
                className="text-[#D67961] font-medium text-[14px] hover:underline"
              >
                + List a piece
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {SELLER_PRODUCTS.map((product) => (
                <SellerProductCard
                  key={product.id}
                  image={product.image}
                  title={product.title}
                  priceNaira={product.priceNaira}
                  priceSats={product.priceSats}
                  status={product.status}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
