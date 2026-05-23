import Link from 'next/link'
import { ChevronRight, Menu } from 'lucide-react'

const PRODUCTS = [
  {
    id: 1,
    title: 'Indigo Dyed Fabric',
    artist: 'Zainab Okafor',
    price: 25000,
    image: '/artwork-2.jpg',
  },
  {
    id: 2,
    title: 'Brass Geometric Pendant',
    artist: 'Ama Mensah',
    price: 45000,
    image: '/artwork-6.jpg',
  },
  {
    id: 4,
    title: 'Hand Thrown Vase',
    artist: 'Fatima Hassan',
    price: 85000,
    image: '/artwork-3.jpg',
  },
  {
    id: 6,
    title: 'Golden Filigree Earrings',
    artist: 'Zainab Okafor',
    price: 35000,
    image: '/artwork-4.jpg',
  },
]

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Top Navigation */}
      <nav className="fixed top-0 z-50 w-full transition-all duration-300 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-normal">Bitscy</Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/marketplace" className="font-sans text-sm hover:text-accent transition-colors">Marketplace</Link>
            <Link href="/sell" className="font-sans text-sm hover:text-accent transition-colors">Sell on Bitscy</Link>
            <Link href="/signin" className="font-sans text-sm hover:text-accent transition-colors">Sign in</Link>
            <Link href="/sell" className="bg-primary text-primary-foreground px-6 py-2.5 rounded font-sans text-sm font-medium hover:opacity-90 transition-opacity">
              Open your shop
            </Link>
          </div>

          <button className="md:hidden p-2" aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            {/* Hero Text */}
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-normal leading-tight text-pretty">
                  Made by African women. Sold to the world.
                </h1>
                <p className="font-sans text-base sm:text-lg text-muted max-w-md">
                  Bitscy is a marketplace for African women who create. Artists, weavers, jewellers, potters, leatherworkers. Earn directly without the middleman.
                </p>
              </div>

              <ul className="font-sans text-sm space-y-2 text-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1">✓</span>
                  <span>List work in minutes</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1">✓</span>
                  <span>Paid in naira to Nigerian bank account</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1">✓</span>
                  <span>No business registration required</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent mt-1">✓</span>
                  <span>No PayPal or Stripe</span>
                </li>
              </ul>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/sell" className="inline-flex items-center justify-center bg-primary text-primary-foreground px-8 py-3.5 rounded font-sans font-medium hover:opacity-90 transition-opacity">
                  Open your shop
                </Link>
                <Link href="/marketplace" className="inline-flex items-center justify-center border-2 border-primary text-primary px-8 py-3.5 rounded font-sans font-medium hover:bg-primary hover:text-primary-foreground transition-all">
                  Browse the marketplace
                </Link>
              </div>

              <p className="font-sans text-xs text-muted pt-4">
                Built by African women. For African women. Powered by open Bitcoin technology.
              </p>
            </div>

            {/* Hero Image */}
            <div className="relative h-96 sm:h-[500px] lg:h-[600px] rounded-lg overflow-hidden">
              <img
                src="/hero-artisan.jpg"
                alt="African woman artisan at work"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED PRODUCTS */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between mb-8 sm:mb-12">
            <h2 className="font-serif text-4xl sm:text-5xl font-normal">Currently on Bitscy</h2>
            <Link href="/marketplace" className="font-sans text-sm text-primary hover:text-accent font-medium flex items-center gap-1 transition-colors">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {PRODUCTS.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="group cursor-pointer">
                <div className="relative overflow-hidden rounded-lg bg-gray-100 mb-3 h-48 sm:h-56 lg:h-64">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-serif text-base sm:text-lg font-normal mb-1">{product.title}</h3>
                <p className="font-sans text-sm text-muted mb-2">{product.artist}</p>
                <p className="font-sans text-base sm:text-lg font-medium text-accent">₦{product.price.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. TWO-COLUMN VALUE PROPS */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* For Artists */}
            <div className="bg-white rounded-lg p-8 sm:p-10 space-y-6">
              <h3 className="font-serif text-3xl sm:text-4xl font-normal">For artists: Sell your craft. Get paid fairly.</h3>
              <p className="font-sans text-base text-muted leading-relaxed">
                No vendor application. No business registration. No middleman taking a cut. You set your prices, list your work, and get paid directly to your Nigerian bank account when someone buys.
              </p>
              <p className="font-sans text-base text-muted leading-relaxed">
                Whether you're a painter in Lagos, a weaver in Kano, or a jeweller in Accra, Bitscy connects you to buyers worldwide who value your craft.
              </p>
              <Link href="/sell" className="inline-flex items-center justify-center bg-primary text-primary-foreground px-8 py-3.5 rounded font-sans font-medium hover:opacity-90 transition-opacity">
                Open your shop
              </Link>
            </div>

            {/* For Buyers */}
            <div className="bg-white rounded-lg p-8 sm:p-10 space-y-6">
              <h3 className="font-serif text-3xl sm:text-4xl font-normal">For buyers: Discover art you can't find anywhere else.</h3>
              <p className="font-sans text-base text-muted leading-relaxed">
                No account required to browse. No endless algorithm feed. Just real work from real makers, priced fairly.
              </p>
              <p className="font-sans text-base text-muted leading-relaxed">
                Pay from your phone. Get it delivered anywhere in the world. Every purchase supports the artist directly.
              </p>
              <Link href="/marketplace" className="inline-flex items-center justify-center border-2 border-primary text-primary px-8 py-3.5 rounded font-sans font-medium hover:bg-primary hover:text-primary-foreground transition-all">
                Browse the marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS - SELLERS */}
      <section className="py-10 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-4xl sm:text-5xl font-normal mb-4">For artists: from your studio to the world</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 mb-12">
              <div className="space-y-3">
                <div className="font-serif text-5xl font-normal text-accent">1</div>
                <h3 className="font-serif text-xl font-normal">Open your shop</h3>
                <p className="font-sans text-sm text-muted">Tell us about your craft and upload a profile photo.</p>
              </div>
              <div className="space-y-3">
                <div className="font-serif text-5xl font-normal text-accent">2</div>
                <h3 className="font-serif text-xl font-normal">List your work</h3>
                <p className="font-sans text-sm text-muted">Add photos, descriptions, and prices. Set your own terms.</p>
              </div>
              <div className="space-y-3">
                <div className="font-serif text-5xl font-normal text-accent">3</div>
                <h3 className="font-serif text-xl font-normal">Get paid</h3>
                <p className="font-sans text-sm text-muted">Withdraw instantly to your Nigerian bank account.</p>
              </div>
            </div>

            <p className="font-sans text-base text-muted leading-relaxed mb-8">
              Our payment network works across every country, without banks or middlemen blocking the path. You never have to think about it — it just works.
            </p>

            <Link href="/sell" className="inline-flex items-center justify-center bg-primary text-primary-foreground px-8 py-3.5 rounded font-sans font-medium hover:opacity-90 transition-opacity">
              Open your shop
            </Link>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS - BUYERS */}
      <section className="py-10 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-4xl sm:text-5xl font-normal mb-4">For buyers: support the maker, not the middleman</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 mb-12">
              <div className="space-y-3">
                <div className="font-serif text-5xl font-normal text-accent">1</div>
                <h3 className="font-serif text-xl font-normal">Find work you love</h3>
                <p className="font-sans text-sm text-muted">Browse real products from real makers. No algorithm, no ads.</p>
              </div>
              <div className="space-y-3">
                <div className="font-serif text-5xl font-normal text-accent">2</div>
                <h3 className="font-serif text-xl font-normal">Pay from your phone</h3>
                <p className="font-sans text-sm text-muted">Fast, secure checkout. Your payment goes directly to the artist.</p>
              </div>
              <div className="space-y-3">
                <div className="font-serif text-5xl font-normal text-accent">3</div>
                <h3 className="font-serif text-xl font-normal">Get it delivered</h3>
                <p className="font-sans text-sm text-muted">Shipped to you anywhere in the world.</p>
              </div>
            </div>

            <p className="font-sans text-base text-muted leading-relaxed mb-8">
              Our payment network is built to work globally, without the delays and fees that plague traditional platforms. You pay what you see — nothing hidden.
            </p>

            <Link href="/marketplace" className="inline-flex items-center justify-center border-2 border-primary text-primary px-8 py-3.5 rounded font-sans font-medium hover:bg-primary hover:text-primary-foreground transition-all">
              Browse the marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* 6. MISSION */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="relative h-80 sm:h-96 lg:h-[500px] rounded-lg overflow-hidden">
              <img
                src="/mission-artist.jpg"
                alt="African woman artist at work"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-6">
              <h2 className="font-serif text-4xl sm:text-5xl font-normal">Why Bitscy exists</h2>

              <p className="font-sans text-base text-muted leading-relaxed">
                Three years ago, a Nigerian painter in Lagos wanted to sell her work online. PayPal doesn't support Nigeria. Stripe doesn't either. Etsy's payment processor blocked her. She paused her practice because the world's largest platforms were built for everywhere except where she is.
              </p>

              <p className="font-sans text-base text-muted leading-relaxed">
                This happens to thousands of African artists every day. Banks don't move fast enough. Payment processors demand business licenses and tax ID numbers. The infrastructure was built assuming you'd run your shop from California or Berlin.
              </p>

              <p className="font-sans text-base text-muted leading-relaxed">
                Bitscy fixes this. We're a marketplace built for artists in Africa, by women who work in tech and art. No middleman. No gatekeeping. Just fair payment for beautiful work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CLOSING CTA + FOOTER */}
      <section className="py-10 sm:py-24">
        <div className="mx-auto max-w-2xl px-5 sm:px-6 text-center">
          <h2 className="font-serif text-5xl sm:text-6xl font-normal mb-8">Ready to begin?</h2>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/sell" className="inline-flex items-center justify-center bg-primary text-primary-foreground px-8 py-4 rounded font-sans font-medium text-lg hover:opacity-90 transition-opacity">
              Open your shop
            </Link>
            <Link href="/marketplace" className="inline-flex items-center justify-center border-2 border-primary text-primary px-8 py-4 rounded font-sans font-medium text-lg hover:bg-primary hover:text-primary-foreground transition-all">
              Browse the marketplace
            </Link>
          </div>

          <p className="font-sans text-sm text-muted whitespace-nowrap">
            Free to join. No fees to list. Bitscy takes 2% when you sell.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
            <div className="sm:col-span-3 lg:col-span-1">
              <div className="font-serif text-2xl font-normal mb-2">Bitscy</div>
              <p className="font-sans text-xs text-muted">African women artists. Global marketplace.</p>
            </div>

            <div>
              <h4 className="font-sans font-semibold text-sm mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><Link href="/marketplace" className="font-sans text-sm text-muted hover:text-accent transition-colors">Marketplace</Link></li>
                <li><Link href="/sell" className="font-sans text-sm text-muted hover:text-accent transition-colors">Sell on Bitscy</Link></li>
                <li><Link href="/marketplace" className="font-sans text-sm text-muted hover:text-accent transition-colors">Browse</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-sans font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="font-sans text-sm text-muted hover:text-accent transition-colors">About</Link></li>
                <li><Link href="/faq" className="font-sans text-sm text-muted hover:text-accent transition-colors">FAQ</Link></li>
                <li><Link href="/contact" className="font-sans text-sm text-muted hover:text-accent transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-sans font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/terms" className="font-sans text-sm text-muted hover:text-accent transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="font-sans text-sm text-muted hover:text-accent transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>


        </div>
      </footer>
    </div>
  )
}
