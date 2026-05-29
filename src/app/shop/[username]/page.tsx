'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface ShopProduct {
  id: string
  title: string
  image: string
  priceNaira: number
  priceSats: number
}

interface ShopProfile {
  username: string
  shopName: string
  fullName: string
  initials: string
  city: string
  bio: string
  products: ShopProduct[]
}

// Local mock data. When the catalog endpoints are wired, this is replaced by
// a GET /api/shops/[username] fetch.
const SHOPS: Record<string, ShopProfile> = {
  adaeze: {
    username: 'adaeze',
    shopName: 'Adaeze Studio',
    fullName: 'Adaeze Okonkwo',
    initials: 'A',
    city: 'Lagos',
    bio: 'Hand-woven textiles, beaded jewelry, and small ceramic forms. Made slowly, in Lagos.',
    products: [
      { id: 'indigo-fabric', title: 'Indigo Dyed Fabric', image: '/artwork-2.jpg', priceNaira: 25000, priceSats: 85000 },
      { id: 'beaded-collar', title: 'Beaded Statement Collar', image: '/artwork-6.jpg', priceNaira: 38000, priceSats: 129000 },
      { id: 'thrown-vase', title: 'Hand Thrown Vase', image: '/artwork-3.jpg', priceNaira: 88000, priceSats: 299000 },
      { id: 'leather-journal', title: 'Tooled Leather Journal', image: '/artwork-5.jpg', priceNaira: 25000, priceSats: 85000 },
      { id: 'geometric-abstract', title: 'Geometric Abstract Composition', image: '/artwork-1.jpg', priceNaira: 45000, priceSats: 153000 },
      { id: 'adire-hanging', title: 'Adire Wall Hanging', image: '/artwork-4.jpg', priceNaira: 52000, priceSats: 177000 },
    ],
  },
  ngozi: {
    username: 'ngozi',
    shopName: 'Ngozi',
    fullName: 'Ngozi Adichie',
    initials: 'N',
    city: 'Enugu',
    bio: 'Just getting started. New pieces coming soon.',
    products: [],
  },
}

export default function ShopPage({ params }: { params: Promise<{ username: string }> }) {
  const router = useRouter()
  const { username } = use(params)
  const shop = SHOPS[username] ?? SHOPS['adaeze']!

  const [copied, setCopied] = useState(false)

  const shopUrl = `bitscy.com/shop/${shop.username}`

  const handleCopy = () => {
    navigator.clipboard.writeText(shopUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Back arrow header */}
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

      {/* Seller hero */}
      <section className="px-5 sm:px-8 pt-10 pb-8">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center lg:items-start lg:text-left">
          {/* Avatar */}
          <div
            className="w-24 h-24 lg:w-30 lg:h-30 rounded-full flex items-center justify-center font-serif text-4xl lg:text-5xl font-normal mb-5"
            style={{ backgroundColor: 'rgba(214, 121, 97, 0.2)', color: '#1F1410' }}
          >
            {shop.initials}
          </div>

          {/* Shop name */}
          <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-tight mb-2">
            {shop.shopName}
          </h1>

          {/* Subtitle */}
          <p className="font-sans text-sm sm:text-base text-muted mb-5">
            by {shop.fullName} · {shop.products.length} {shop.products.length === 1 ? 'piece' : 'pieces'} · Ships from {shop.city}
          </p>

          {/* Bio */}
          <p className="font-sans text-base text-foreground leading-relaxed max-w-xl mb-6">
            {shop.bio}
          </p>

          {/* Share pill */}
          <div className="inline-flex items-center gap-3 bg-white border border-border px-4 py-2 rounded-full">
            <span className="font-sans text-xs sm:text-sm text-foreground tabular-nums">
              {shopUrl}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs sm:text-sm text-accent hover:opacity-80 transition-opacity font-sans font-medium"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </section>

      {/* Gold divider */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <div className="h-px bg-gold opacity-60" />
      </div>

      {/* Products grid OR empty state */}
      <section className="px-5 sm:px-8 py-10">
        <div className="max-w-6xl mx-auto">
          {shop.products.length > 0 ? (
            <>
              {/* Section heading row */}
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="font-serif text-2xl sm:text-3xl font-normal">All pieces</h2>
                <p className="font-sans text-sm text-muted">
                  {shop.products.length} {shop.products.length === 1 ? 'piece' : 'pieces'}
                </p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {shop.products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] block"
                  >
                    <div className="w-full aspect-square bg-gray-200 overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif text-base sm:text-lg text-foreground font-normal line-clamp-2 mb-2">
                        {product.title}
                      </h3>
                      <p className="text-accent font-medium text-base sm:text-lg mb-1 tabular-nums">
                        ₦{product.priceNaira.toLocaleString('en-US')}
                      </p>
                      <p className="text-muted text-xs sm:text-sm font-normal tabular-nums">
                        {product.priceSats.toLocaleString('en-US')} sats
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="py-16 sm:py-24 flex flex-col items-center justify-center text-center">
              <div
                className="w-20 h-20 rounded-full border-2 mb-6"
                style={{ borderColor: '#E8B43D' }}
                aria-hidden="true"
              />
              <h2 className="font-serif text-3xl font-normal mb-3">No pieces yet.</h2>
              <p className="font-sans text-base text-muted max-w-md">
                {shop.shopName} hasn&apos;t listed anything yet. Check back soon.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
