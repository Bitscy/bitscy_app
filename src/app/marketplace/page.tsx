'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import BrowseHeader from '@/components/browse-header'
import CategoryPills from '@/components/category-pills'
import ProductCard from '@/components/product-card'
import BottomNavigation from '@/components/bottom-navigation'

interface Product {
  id: string
  image: string
  title: string
  priceNaira: number
  priceSats: number
}

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: '1',
    image: '/artwork-1.jpg',
    title: 'Geometric Abstract Composition',
    priceNaira: 45000,
    priceSats: 125000,
  },
  {
    id: '2',
    image: '/artwork-2.jpg',
    title: 'Indigo Woven Textile',
    priceNaira: 28000,
    priceSats: 85000,
  },
  {
    id: '3',
    image: '/artwork-3.jpg',
    title: 'Handthrown Ceramic Vessel',
    priceNaira: 35000,
    priceSats: 95000,
  },
  {
    id: '4',
    image: '/artwork-4.jpg',
    title: 'Contemporary Color Field',
    priceNaira: 52000,
    priceSats: 145000,
  },
  {
    id: '5',
    image: '/artwork-5.jpg',
    title: 'Tooled Leather Journal',
    priceNaira: 22000,
    priceSats: 65000,
  },
  {
    id: '6',
    image: '/artwork-6.jpg',
    title: 'Beaded Statement Collar',
    priceNaira: 38000,
    priceSats: 110000,
  },
  {
    id: '7',
    image: '/artwork-7.jpg',
    title: 'Bronze Sculptural Form',
    priceNaira: 88000,
    priceSats: 280000,
  },
  {
    id: '8',
    image: '/artwork-8.jpg',
    title: 'Woodcut Print Series',
    priceNaira: 18000,
    priceSats: 55000,
  },
]

function BrowsePageContent() {
  const searchParams = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState('Paintings')

  // Design-time toggles for the three async states.
  // Real implementation derives these from SWR / fetch isLoading + data length + error.
  const isLoading = searchParams.get('loading') === '1'
  const isEmpty = searchParams.get('empty') === '1'
  const hasError = searchParams.get('error') === '1'

  return (
    <div className="flex flex-col min-h-screen bg-bitscy-background">
      <BrowseHeader />
      <CategoryPills onCategoryChange={setSelectedCategory} />

      <main className="flex-1 px-5 pt-4 pb-20 bg-bitscy-background">
        <div className="mx-auto max-w-7xl">
          {/* LOADING */}
          {isLoading && (
            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              aria-busy="true"
              aria-label="Loading products"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="bg-white rounded-lg overflow-hidden">
                  <div className="aspect-square bg-input animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 bg-input rounded animate-pulse" />
                    <div className="h-5 w-1/2 bg-input rounded animate-pulse" />
                    <div className="h-3 w-1/3 bg-input rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ERROR */}
          {!isLoading && hasError && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div
                className="w-16 h-16 rounded-full border-2 mb-5 flex items-center justify-center"
                style={{ borderColor: '#B85049' }}
                aria-hidden="true"
              >
                <span className="text-error text-2xl">!</span>
              </div>
              <h2 className="font-serif text-3xl font-normal mb-2">Connection issue.</h2>
              <p className="font-sans text-base text-muted mb-6 max-w-sm">
                We couldn&apos;t load the marketplace. Check your connection and try again.
              </p>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-sans font-medium hover:opacity-90 transition-opacity"
              >
                <Loader2 className="w-4 h-4" />
                Try again
              </Link>
            </div>
          )}

          {/* EMPTY */}
          {!isLoading && !hasError && isEmpty && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <div
                className="w-20 h-20 rounded-full border-2 mb-6"
                style={{ borderColor: '#E8B43D' }}
                aria-hidden="true"
              />
              <h2 className="font-serif text-3xl font-normal mb-2">Nothing listed yet.</h2>
              <p className="font-sans text-base text-muted mb-6 max-w-sm">
                The marketplace is brand new. Be one of the first artists to list a piece.
              </p>
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-sans font-medium hover:opacity-90 transition-opacity"
              >
                Open your shop
              </Link>
            </div>
          )}

          {/* POPULATED */}
          {!isLoading && !hasError && !isEmpty && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {SAMPLE_PRODUCTS.map(product => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <ProductCard
                    image={product.image}
                    title={product.title}
                    priceNaira={product.priceNaira}
                    priceSats={product.priceSats}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="bg-bitscy-background min-h-screen" />}>
      <BrowsePageContent />
    </Suspense>
  )
}
