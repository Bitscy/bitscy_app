'use client'

import { useState } from 'react'
import Link from 'next/link'
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

export default function BrowsePage() {
  const [selectedCategory, setSelectedCategory] = useState('Paintings')

  return (
    <div className="flex flex-col min-h-screen bg-bitscy-background">
      {/* Header */}
      <BrowseHeader />

      {/* Category Pills */}
      <CategoryPills onCategoryChange={setSelectedCategory} />

      {/* Product Grid */}
      <main className="flex-1 px-5 pt-4 pb-20 bg-bitscy-background">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {SAMPLE_PRODUCTS.map((product) => (
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
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
