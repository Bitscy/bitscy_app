import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ArtistAvatar from '@/components/artist-avatar'

interface MockProduct {
  id: string
  title: string
  artist: string
  priceNaira: number
  priceSats: number
  images: string[]
  category: string
  description: string
  shipsFrom: string
  inStock: number
}

// Sample product data - in real app would come from database
const PRODUCTS: Record<string, MockProduct> = {
  '1': {
    id: '1',
    title: 'Geometric Abstract Composition',
    artist: 'Adaeze',
    priceNaira: 45000,
    priceSats: 125000,
    images: ['/artwork-1.jpg', '/artwork-1.jpg', '/artwork-1.jpg', '/artwork-1.jpg', '/artwork-1.jpg'],
    category: 'Paintings',
    description: `This striking geometric composition explores the intersection of traditional African patterns and contemporary abstract art. The work features bold intersecting shapes in warm earth tones, creating a sense of movement and depth. Hand-rendered with acrylic on stretched canvas.\n\nThe piece measures 60cm × 60cm and is part of Adaeze's ongoing exploration of form, color, and cultural narrative. Each element is carefully considered to create a harmonious balance between structure and spontaneity, inviting the viewer to find their own meaning in the composition.`,
    shipsFrom: 'Lagos',
    inStock: 1,
  },
  '2': {
    id: '2',
    title: 'Indigo Woven Textile',
    artist: 'Adaeze',
    priceNaira: 28000,
    priceSats: 85000,
    images: ['/artwork-2.jpg', '/artwork-2.jpg', '/artwork-2.jpg'],
    category: 'Textiles',
    description: `A hand-woven textile featuring traditional indigo dyeing techniques combined with contemporary geometric patterns. This piece showcases the meticulous craftsmanship of West African textile traditions.\n\nMeasuring 90cm × 120cm, this woven piece can be used as a wall hanging, table runner, or decorative textile. The rich indigo tones develop and deepen with wear, making each piece truly unique and personal to its owner.`,
    shipsFrom: 'Lagos',
    inStock: 1,
  },
  '3': {
    id: '3',
    title: 'Handthrown Ceramic Vessel',
    artist: 'Adaeze',
    priceNaira: 35000,
    priceSats: 95000,
    images: ['/artwork-3.jpg', '/artwork-3.jpg', '/artwork-3.jpg', '/artwork-3.jpg'],
    category: 'Ceramics',
    description: `A sculptural ceramic vessel hand-thrown on the wheel and finished with a subtle earth-tone glaze. This piece celebrates the organic beauty of handmade ceramics, with visible fingerprints and subtle variations that speak to its artisanal creation.\n\nStanding 28cm tall, this vessel works beautifully as a standalone sculptural object or as a functional piece for holding flowers, dried grasses, or treasured objects. The form invites touch and interaction.`,
    shipsFrom: 'Lagos',
    inStock: 1,
  },
  '4': {
    id: '4',
    title: 'Contemporary Color Field',
    artist: 'Adaeze',
    priceNaira: 52000,
    priceSats: 145000,
    images: ['/artwork-4.jpg', '/artwork-4.jpg', '/artwork-4.jpg', '/artwork-4.jpg'],
    category: 'Paintings',
    description: `A bold exploration of color, emotion, and spatial relationships. This large-scale painting features confident blocks of saturated color—coral, indigo, and warm gold—arranged to create visual harmony and tension.\n\nThe 80cm × 100cm canvas invites prolonged looking, revealing new relationships between colors and forms as your perspective shifts. Created with acrylic paint applied in multiple layers, the piece has subtle depth and texture.`,
    shipsFrom: 'Lagos',
    inStock: 1,
  },
  '5': {
    id: '5',
    title: 'Tooled Leather Journal',
    artist: 'Adaeze',
    priceNaira: 22000,
    priceSats: 65000,
    images: ['/artwork-5.jpg', '/artwork-5.jpg'],
    category: 'Leather',
    description: `A hand-tooled leather journal featuring traditional geometric patterns tooled into vegetable-tanned leather. The cover is carefully hand-stitched with traditional techniques, and the interior includes 100 pages of quality cream paper.\n\nMeasuring 15cm × 21cm, this journal is perfect for writing, sketching, or keeping as a beautiful object. The leather will develop a rich patina over time with use, becoming more beautiful and personal to its owner.`,
    shipsFrom: 'Lagos',
    inStock: 1,
  },
  '6': {
    id: '6',
    title: 'Beaded Statement Collar',
    artist: 'Adaeze',
    priceNaira: 38000,
    priceSats: 110000,
    images: ['/artwork-6.jpg', '/artwork-6.jpg', '/artwork-6.jpg', '/artwork-6.jpg', '/artwork-6.jpg'],
    category: 'Jewelry',
    description: `A striking beaded collar featuring hand-selected beads in coral, indigo, and gold arranged in traditional geometric patterns. Each bead is individually hand-strung and knotted for durability and flexibility.\n\nThis piece bridges traditional beadwork with contemporary fashion, making a bold statement whether worn as a collar or displayed as a sculptural object. The flexible design allows it to fit a range of necklines and body sizes.`,
    shipsFrom: 'Lagos',
    inStock: 1,
  },
  '7': {
    id: '7',
    title: 'Bronze Sculptural Form',
    artist: 'Adaeze',
    priceNaira: 88000,
    priceSats: 280000,
    images: ['/artwork-7.jpg', '/artwork-7.jpg', '/artwork-7.jpg'],
    category: 'Sculpture',
    description: `An organic bronze sculpture exploring form, movement, and space. Cast using traditional lost-wax techniques, this piece celebrates the material qualities of bronze while referencing natural forms found in nature.\n\nStanding 35cm tall, this sculpture is meant to be viewed from all angles, revealing new forms and relationships as you move around it. The patina will develop and change subtly over years, adding to its character and presence.`,
    shipsFrom: 'Lagos',
    inStock: 1,
  },
  '8': {
    id: '8',
    title: 'Woodcut Print Series',
    artist: 'Adaeze',
    priceNaira: 18000,
    priceSats: 55000,
    images: ['/artwork-8.jpg', '/artwork-8.jpg', '/artwork-8.jpg', '/artwork-8.jpg'],
    category: 'Prints',
    description: `A limited edition woodcut print featuring bold lines and striking contrast. Each print is hand-pulled from a hand-carved wood block, making each impression unique with subtle variations in ink and pressure.\n\nMeasuring 40cm × 50cm, this print celebrates the traditional craft of relief printing. Signed and numbered, each print is part of an edition of 10, ensuring both accessibility and exclusivity for collectors and art lovers.`,
    shipsFrom: 'Lagos',
    inStock: 1,
  },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params
  const product = PRODUCTS[id]

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bitscy-background">
        <h1 className="text-2xl font-serif text-bitscy-text">Product not found</h1>
        <Link href="/" className="mt-4 text-bitscy-primary underline">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-bitscy-background lg:bg-white">
      {/* Back Button - Mobile and Desktop */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-bitscy-background px-5 py-4 flex items-center">
        <Link
          href="/"
          className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-[#F5EDE0] transition-colors"
          aria-label="Back"
        >
          <ChevronLeft size={24} className="text-bitscy-primary" />
        </Link>
      </div>

      {/* Desktop Back Button */}
      <div className="hidden lg:flex px-10 py-6">
        <Link
          href="/"
          className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft size={24} className="text-bitscy-primary" />
        </Link>
      </div>

      {/* Mobile Layout */}
      <main className="lg:hidden flex-1 pt-16">
        {/* Hero Image - Full Width, Square */}
        <div className="w-full aspect-square bg-gray-200 overflow-hidden">
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Photo Dots Indicator */}
        <div className="flex justify-center gap-2 py-4 px-5">
          {product.images.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === 0 ? 'bg-[#D67961]' : 'bg-[#7D6F66]'
              }`}
            />
          ))}
        </div>

        {/* Content Section */}
        <div className="px-5 pt-4">
          {/* Product Title */}
          <h1 className="font-serif text-[28px] text-bitscy-text font-normal leading-tight mb-4">
            {product.title}
          </h1>

          {/* Artist Attribution */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-bitscy-muted text-sm font-normal">by</span>
            <ArtistAvatar />
            <Link href="/artist/adaeze" className="text-bitscy-primary font-medium text-sm">
              {product.artist}
            </Link>
          </div>

          {/* Price */}
          <div className="mb-6">
            <p className="font-serif text-[32px] text-[#D67961] font-normal" style={{ textDecoration: 'none' }}>
              ₦{product.priceNaira.toLocaleString('en-US')}
            </p>
            <p className="text-bitscy-muted text-sm font-normal" style={{ textDecoration: 'none' }}>
              {product.priceSats.toLocaleString('en-US')} sats
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-[#E8B43D] mb-6" />

          {/* Description */}
          <div className="mb-6">
            {product.description.split('\n\n').map((paragraph, index) => (
              <p
                key={index}
                className="text-bitscy-text text-base leading-[1.6] mb-4 last:mb-0"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-3 mb-24">
            {/* Category Pill */}
            <div className="bg-[#D67961] text-white px-3 py-1 rounded-full text-xs font-medium">
              {product.category}
            </div>
            {/* Ships From */}
            <span className="text-bitscy-muted text-xs font-normal">
              Ships from {product.shipsFrom}
            </span>
            {/* Stock */}
            <span className="text-bitscy-muted text-xs font-normal">
              {product.inStock} in stock
            </span>
          </div>
        </div>
      </main>

      {/* Desktop Layout */}
      <main className="hidden lg:flex flex-1 px-10">
        <div className="max-w-6xl mx-auto flex gap-12 w-full py-8">
          {/* Left Column - Image */}
          <div className="w-1/2 flex flex-col">
            {/* Hero Image */}
            <div className="aspect-square bg-gray-200 overflow-hidden rounded-lg mb-4">
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Photo Dots Indicator */}
            <div className="flex justify-center gap-2">
              {product.images.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === 0 ? 'bg-[#D67961]' : 'bg-[#7D6F66]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="w-1/2 flex flex-col">
            {/* Product Title */}
            <h1 className="font-serif text-[36px] text-bitscy-text font-normal leading-tight mb-6">
              {product.title}
            </h1>

            {/* Artist Attribution */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-bitscy-muted text-sm font-normal">by</span>
              <ArtistAvatar />
              <Link href="/artist/adaeze" className="text-bitscy-primary font-medium text-sm">
                {product.artist}
              </Link>
            </div>

            {/* Price */}
            <div className="mb-6">
              <p className="font-serif text-[36px] text-[#D67961] font-normal" style={{ textDecoration: 'none' }}>
                ₦{product.priceNaira.toLocaleString('en-US')}
              </p>
              <p className="text-bitscy-muted text-sm font-normal" style={{ textDecoration: 'none' }}>
                {product.priceSats.toLocaleString('en-US')} sats
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-[#E8B43D] mb-6" />

            {/* Description */}
            <div className="mb-6">
              {product.description.split('\n\n').map((paragraph, index) => (
                <p
                  key={index}
                  className="text-bitscy-text text-base leading-[1.6] mb-4 last:mb-0"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Category Pill */}
              <div className="bg-[#D67961] text-white px-3 py-1 rounded-full text-xs font-medium">
                {product.category}
              </div>
              {/* Ships From */}
              <span className="text-bitscy-muted text-xs font-normal">
                Ships from {product.shipsFrom}
              </span>
              {/* Stock */}
              <span className="text-bitscy-muted text-xs font-normal">
                {product.inStock} in stock
              </span>
            </div>

            {/* Action Button - Inline on Desktop */}
            <Link
              href={`/checkout/order-${product.id}`}
              className="flex items-center justify-center w-full h-14 bg-[#2D5F5D] text-white font-medium rounded-lg transition-colors hover:bg-[#1F4A48] active:scale-95"
            >
              Buy with Lightning
            </Link>
          </div>
        </div>
      </main>

      {/* Fixed Bottom Action Bar - Mobile Only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5DDD0] px-5 py-3">
        <Link
          href={`/checkout/order-${product.id}`}
          className="block w-full h-14 bg-[#2D5F5D] text-white font-medium rounded-lg transition-colors hover:bg-[#1F4A48] active:scale-95 flex items-center justify-center"
        >
          Buy with Lightning
        </Link>
      </div>
    </div>
  )
}
