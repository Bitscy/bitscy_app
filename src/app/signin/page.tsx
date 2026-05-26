'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

export default function SigninPage() {
  const router = useRouter()
  const [shopName, setShopName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [forgotPasswordExpanded, setForgotPasswordExpanded] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopName || !password) return

    setIsSubmitting(true)
    setHasError(false)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200))

    // On success, navigate to /seller
    router.push('/seller')
  }

  const isFormValid = shopName.trim() && password

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-normal hover:opacity-80 transition-opacity">
            Bitscy
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 pb-12 sm:pt-32 sm:pb-20 px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-3">
              <h1 className="font-serif text-5xl sm:text-6xl font-normal leading-tight">
                Sign in.
              </h1>
              <p className="font-sans text-base text-muted">
                Continue to your shop.
              </p>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-8">
              {/* Shop Name Field */}
              <div className="space-y-3">
                <label htmlFor="shopName" className="block font-sans text-base font-medium">
                  Shop name
                </label>
                <input
                  id="shopName"
                  type="text"
                  value={shopName}
                  onChange={(e) => {
                    setShopName(e.target.value)
                    setHasError(false)
                  }}
                  placeholder="Adaeze Studio"
                  className={`w-full px-4 py-3 font-sans text-base border rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    hasError
                      ? 'border-error focus:ring-error'
                      : 'border-border focus:border-primary focus:ring-primary'
                  }`}
                  disabled={isSubmitting}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <label htmlFor="password" className="block font-sans text-base font-medium">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setHasError(false)
                    }}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-3 pr-12 font-sans text-base border rounded focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                      hasError
                        ? 'border-error focus:ring-error'
                        : 'border-border focus:border-primary focus:ring-primary'
                    }`}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-1 disabled:opacity-50"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Error Message */}
                {hasError && (
                  <p className="font-sans text-sm text-error">
                    Check your shop name and password.
                  </p>
                )}
              </div>

              {/* Primary Action */}
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full h-14 bg-primary text-primary-foreground font-sans text-base font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Secondary Actions */}
            <div className="space-y-4 text-center">
              {/* Don't have a shop link */}
              <p className="font-sans text-base">
                <span className="text-muted">Don&apos;t have a shop yet? </span>
                <Link
                  href="/signup"
                  className="text-accent hover:underline transition-colors"
                >
                  Open one
                </Link>
              </p>

              {/* Buyer signup link */}
              <p className="font-sans text-sm">
                <span className="text-muted">Just want to buy? </span>
                <Link
                  href="/buyer/signup"
                  className="text-accent hover:underline transition-colors"
                >
                  Sign up here
                </Link>
              </p>

              {/* Forgot Password Section */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setForgotPasswordExpanded(!forgotPasswordExpanded)}
                  className="font-sans text-base text-accent hover:underline transition-colors"
                >
                  Forgot your password?
                </button>

                {/* Expanded Message */}
                {forgotPasswordExpanded && (
                  <div className="pt-2 space-y-3 text-center">
                    <p className="font-sans text-base text-muted leading-relaxed">
                      Bitscy can&apos;t reset passwords — that&apos;s how your shop stays yours. If you&apos;ve lost it, you&apos;ll need to open a new shop.
                    </p>
                    <Link
                      href="/signup"
                      className="inline-block font-sans text-base text-accent hover:underline transition-colors"
                    >
                      Open a new shop
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
