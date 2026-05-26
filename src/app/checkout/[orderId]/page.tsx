'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Copy, Check } from 'lucide-react'

interface MockProduct {
  id: string
  title: string
  artist: string
  artistSlug: string
  price: number
  sats: number
  shipping: number
  shipsFrom: string
  thumbnail: string
}

// Mock product data (matches /products/[id])
const PRODUCTS: Record<string, MockProduct> = {
  'indigo-fabric': {
    id: 'indigo-fabric',
    title: 'Indigo Dyed Fabric',
    artist: 'Adaeze',
    artistSlug: 'adaeze',
    price: 25000,
    sats: 85000,
    shipping: 3000,
    shipsFrom: 'Lagos',
    thumbnail: '/artwork-2.jpg',
  },
}

const MOCK_INVOICE = 'lnbc280000n1pj0q5zppp5dzxqwk8pqvnkd0j8y3z9f5k0xwmlq4r0p6v2h9k1c5n0d7m8l9j'

export default function CheckoutPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter()
  const { orderId } = use(params)
  const [step, setStep] = useState(1)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(874) // 14:34 in seconds
  const [isExpired, setIsExpired] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  // Extract product id from orderId (e.g., "order-indigo-fabric" -> "indigo-fabric")
  const productId = orderId.replace('order-', '')
  const product = PRODUCTS[productId] ?? PRODUCTS['indigo-fabric']!
  const total = product.price + product.shipping

  // Step 1 state
  const [address, setAddress] = useState({
    name: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: 'Nigeria',
    postal: '',
  })

  // Step 2 state
  const [signup, setSignup] = useState({
    name: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [signin, setSignin] = useState({
    name: '',
    password: '',
  })
  const [showSigninPassword, setShowSigninPassword] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (step !== 3 || isExpired || paymentConfirmed) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [step, isExpired, paymentConfirmed])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAddressChange = (field: string, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }))
  }

  const canContinueStep1 = () => {
    return address.name && address.line1 && address.city && address.state && address.postal
  }

  const handleContinueStep1 = () => {
    if (isAuthenticated) {
      setStep(3)
    } else {
      setStep(2)
    }
  }

  const handleSignup = () => {
    if (signup.name && signup.password) {
      setIsAuthenticated(true)
      setStep(3)
    }
  }

  const handleSignIn = () => {
    if (signin.name && signin.password) {
      setIsAuthenticated(true)
      setShowSignIn(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(MOCK_INVOICE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTryAgain = () => {
    setIsExpired(false)
    setTimeLeft(874)
  }

  const handlePaymentConfirmed = () => {
    router.push(`/checkout/${orderId}/success`)
  }

  // Determine which steps to show
  const stepsLabel = isAuthenticated ? 'Review · Pay' : 'Review · Account · Pay'

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Back Arrow Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-5 py-3 flex items-center">
          <button
            onClick={() => {
              if (step === 1) {
                router.back()
              } else if (step === 2) {
                setStep(1)
              } else if (step === 3 && !paymentConfirmed) {
                setStep(isAuthenticated ? 1 : 2)
              }
            }}
            className="p-3 -m-3 hover:bg-input rounded transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6">
        {/* Step Indicator */}
        {!paymentConfirmed && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              {stepsLabel.split(' · ').map((label, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className={`text-xs font-sans ${
                      (idx === 0 && step >= 1) ||
                      (idx === 1 && step >= 2) ||
                      (idx === 2 && step >= 3)
                        ? 'text-foreground font-medium'
                        : 'text-muted'
                    }`}
                  >
                    {label}
                  </span>
                  {idx < stepsLabel.split(' · ').length - 1 && (
                    <span className="text-muted text-xs">·</span>
                  )}
                </div>
              ))}
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{
                  width: `${
                    isAuthenticated
                      ? (step === 1 ? 50 : 100)
                      : (step === 1 ? 33 : step === 2 ? 66 : 100)
                  }%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {/* STEP 1: ORDER REVIEW */}
        {step === 1 && !paymentConfirmed && (
          <div className="space-y-6">
            {/* What you're buying */}
            <div className="bg-card rounded border border-border p-4">
              <div className="flex gap-4 mb-4">
                <img
                  src={product.thumbnail}
                  alt={product.title}
                  className="w-16 h-16 rounded object-cover shrink-0"
                />
                <div className="flex-1">
                  <p className="font-serif font-medium text-foreground">{product.title}</p>
                  <p className="text-sm text-muted">by {product.artist}</p>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2 font-sans text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-mono text-foreground">₦{product.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-muted">Shipping</span>
                  <span className="font-mono text-foreground">₦{product.shipping.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-foreground font-medium">Total</span>
                  <div>
                    <div className="font-serif text-2xl text-accent tabular-nums">
                      ₦{total.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted tabular-nums">
                      ({(product.sats + product.sats * product.shipping / product.price).toLocaleString()} sats)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Where it ships */}
            <div>
              <h2 className="font-serif text-xl mb-4">Where it ships</h2>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your name"
                  value={address.name}
                  onChange={(e) => handleAddressChange('name', e.target.value)}
                  className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                />

                <input
                  type="text"
                  placeholder="Address line 1"
                  value={address.line1}
                  onChange={(e) => handleAddressChange('line1', e.target.value)}
                  className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                />

                <input
                  type="text"
                  placeholder="Address line 2 (optional)"
                  value={address.line2}
                  onChange={(e) => handleAddressChange('line2', e.target.value)}
                  className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="City"
                    value={address.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    placeholder="State / Region"
                    value={address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Country"
                    value={address.country}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    placeholder="Postal code"
                    value={address.postal}
                    onChange={(e) => handleAddressChange('postal', e.target.value)}
                    className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <p className="text-sm text-muted font-sans">
              Your address is encrypted before it&apos;s sent. Only {product.artist} can read it.
            </p>

            <button
              onClick={handleContinueStep1}
              disabled={!canContinueStep1()}
              className={`w-full py-3 rounded font-sans font-medium transition-opacity ${
                canContinueStep1()
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-input text-muted cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 2: ACCOUNT GATE */}
        {step === 2 && !paymentConfirmed && !isAuthenticated && (
          <div className="space-y-6">
            {/* Shipping summary */}
            <div className="bg-card rounded border border-border p-4 flex justify-between items-center">
              <div className="text-sm font-sans">
                <span className="text-muted">Shipping to: </span>
                <span className="text-foreground">
                  {address.line1}, {address.city}
                </span>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-accent font-sans text-sm hover:text-primary transition-colors"
              >
                Edit
              </button>
            </div>

            <div>
              <h1 className="font-serif text-4xl mb-2">Create your Bitscy identity.</h1>
              <p className="text-muted font-sans">
                A name and a password. We never see your password — it encrypts your account on this device, and lets you come back to track this order.
              </p>
            </div>

            {!showSignIn ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Tobi Akinwale"
                  value={signup.name}
                  onChange={(e) => setSignup((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                />

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={signup.password}
                    onChange={(e) => setSignup((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <p className="text-xs text-accent font-sans">
                  Write this down. We can&apos;t reset it for you.
                </p>

                <button
                  onClick={handleSignup}
                  disabled={!signup.name || !signup.password}
                  className={`w-full py-3 rounded font-sans font-medium transition-opacity ${
                    signup.name && signup.password
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'bg-input text-muted cursor-not-allowed'
                  }`}
                >
                  Pay ₦{total.toLocaleString()}
                </button>

                <p className="text-center text-sm font-sans">
                  <button
                    onClick={() => setShowSignIn(true)}
                    className="text-accent hover:text-primary transition-colors"
                  >
                    Already have an account? Sign in
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="font-serif text-lg">Sign in</h3>

                <input
                  type="text"
                  placeholder="Your name"
                  value={signin.name}
                  onChange={(e) => setSignin((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                />

                <div className="relative">
                  <input
                    type={showSigninPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={signin.password}
                    onChange={(e) => setSignin((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 bg-input rounded border border-border font-sans text-base outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => setShowSigninPassword(!showSigninPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  >
                    {showSigninPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                <button
                  onClick={handleSignIn}
                  disabled={!signin.name || !signin.password}
                  className={`w-full py-3 rounded font-sans font-medium transition-opacity ${
                    signin.name && signin.password
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'bg-input text-muted cursor-not-allowed'
                  }`}
                >
                  Sign in
                </button>

                <button
                  onClick={() => setShowSignIn(false)}
                  className="text-accent text-sm font-sans hover:text-primary transition-colors"
                >
                  Back to create account
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: PAYMENT */}
        {step === 3 && !paymentConfirmed && (
          <div className="space-y-6">
            {/* Shipping summary */}
            <div className="bg-card rounded border border-border p-4 flex justify-between items-center">
              <div className="text-sm font-sans">
                <span className="text-muted">Shipping to: </span>
                <span className="text-foreground">
                  {address.line1}, {address.city}
                </span>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-accent font-sans text-sm hover:text-primary transition-colors"
              >
                Edit
              </button>
            </div>

            {isExpired ? (
              <div className="space-y-6 text-center">
                <div>
                  <p className="font-sans text-sm text-muted mb-4">Invoice expired</p>
                  <div className="w-72 h-72 mx-auto bg-input rounded border border-border flex items-center justify-center opacity-50 mb-6 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-error font-serif">Expired</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleTryAgain}
                  className="w-full py-3 bg-primary text-primary-foreground rounded font-sans font-medium hover:opacity-90 transition-opacity"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div>
                  <p className="font-sans text-sm text-muted">Pay</p>
                  <div className="font-serif text-5xl text-accent my-2 tabular-nums">
                    ₦{total.toLocaleString()}
                  </div>
                  <p className="font-sans text-sm text-muted tabular-nums">
                    {(product.sats + product.sats * product.shipping / product.price).toLocaleString()} sats
                  </p>
                </div>

                {/* QR Code placeholder */}
                <div className="bg-card rounded border border-border p-4 inline-block">
                  <div className="w-72 h-72 bg-white rounded flex items-center justify-center text-center">
                    <div className="text-sm text-muted font-sans">
                      <div className="mb-2">QR Code</div>
                      <code className="text-xs break-all">{MOCK_INVOICE}</code>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-sans text-base text-foreground flex items-center justify-center gap-2 mb-4">
                    <span className="w-2 h-2 bg-muted rounded-full animate-pulse"></span>
                    Waiting for payment…
                  </p>

                  {!isExpired && (
                    <p className="font-sans text-sm text-muted tabular-nums">
                      Expires in{' '}
                      <span className="text-gold font-medium">{formatTime(timeLeft)}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 py-3 border border-primary text-primary rounded font-sans font-medium hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy invoice
                      </>
                    )}
                  </button>
                  <a
                    href={`lightning:${MOCK_INVOICE}`}
                    className="flex-1 py-3 border border-primary text-primary rounded font-sans font-medium hover:bg-primary/5 transition-colors text-center"
                  >
                    Open in wallet
                  </a>
                </div>

                <div className="text-sm font-sans text-muted">
                  Don&apos;t have a Lightning wallet?{' '}
                  <button
                    onClick={() => {
                      alert(
                        'You can use Wallet of Satoshi, Phoenix, or other Lightning wallets to complete this payment.'
                      )
                    }}
                    className="text-accent hover:text-primary transition-colors"
                  >
                    Pay from your phone in seconds →
                  </button>
                </div>

                {/* Demo button to confirm payment */}
                <button
                  onClick={handlePaymentConfirmed}
                  className="w-full py-3 bg-success/10 text-success rounded font-sans font-medium hover:bg-success/20 transition-colors text-xs"
                >
                  [Demo] Mark as paid
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
