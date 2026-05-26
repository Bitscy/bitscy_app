'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check, Copy } from 'lucide-react'

export default function BuyerSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'create' | 'save'>('create')

  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName || !password) return
    setIsSubmitting(true)
    await new Promise(r => setTimeout(r, 800))
    setIsSubmitting(false)
    setStep('save')
  }

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleContinue = () => {
    router.push('/marketplace')
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-4 flex items-center justify-start">
          <Link
            href="/"
            className="font-serif text-2xl font-normal hover:opacity-80 transition-opacity"
          >
            Bitscy
          </Link>
        </div>
      </nav>

      <div className="pt-24 pb-12 sm:pt-32 sm:pb-20 px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {step === 'create' ? (
            <div className="space-y-8">
              <div className="space-y-3">
                <h1 className="font-serif text-5xl sm:text-6xl font-normal leading-tight">
                  Create your Bitscy identity.
                </h1>
                <p className="font-sans text-base text-muted max-w-lg">
                  A name and a password. We never see your password — it encrypts your account on
                  this device.
                </p>
              </div>

              <form onSubmit={handleCreate} className="space-y-8">
                {/* Your name */}
                <div className="space-y-3">
                  <label htmlFor="displayName" className="block font-sans text-base font-medium">
                    Your name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Tobi Akinwale"
                    className="w-full px-4 py-3 font-sans text-base border border-border rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:border-primary"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                  <p className="font-sans text-sm text-muted">
                    Shown on your orders so artists know who to thank.
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-3">
                  <label htmlFor="password" className="block font-sans text-base font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Choose a strong password"
                      className="w-full px-4 py-3 pr-12 font-sans text-base border border-border rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:border-primary transition-colors"
                      style={{ minHeight: '48px', fontSize: '16px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="font-sans text-sm text-accent">
                    Write this down. We can&apos;t reset it for you.
                  </p>
                </div>

                {/* Primary action */}
                <button
                  type="submit"
                  disabled={!displayName || !password || isSubmitting}
                  className="w-full h-14 bg-primary text-primary-foreground font-sans text-base font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Creating your account…
                    </>
                  ) : (
                    'Create my account'
                  )}
                </button>
              </form>

              {/* Secondary action */}
              <div className="text-center">
                <Link
                  href="/signin"
                  className="font-sans text-base text-primary hover:underline transition-colors"
                >
                  Already have an account? Sign in
                </Link>
              </div>

              {/* Open-protocol footnote */}
              <div className="pt-8 border-t border-border">
                <p className="font-sans text-xs text-muted text-center max-w-md mx-auto">
                  This identity works across Bitscy and any other site that supports the same open
                  identity standard. Your account is yours.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-3">
                <h1 className="font-serif text-5xl sm:text-6xl font-normal leading-tight">
                  Save your password.
                </h1>
                <p className="font-sans text-base text-muted">
                  Bitscy can never reset this for you. If you lose it, you lose your orders. Take 30
                  seconds to save it somewhere safe.
                </p>
              </div>

              {/* Password card */}
              <div className="space-y-6">
                <div className="bg-white border border-border rounded-lg p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-mono text-base sm:text-lg font-medium text-foreground break-all">
                      {password}
                    </p>
                    <button
                      onClick={handleCopyPassword}
                      className="flex-shrink-0 p-3 hover:bg-background rounded transition-colors"
                      aria-label="Copy password"
                    >
                      <Copy className="w-5 h-5 text-muted hover:text-foreground transition-colors" />
                    </button>
                  </div>

                  {copied && (
                    <div className="mt-4 flex items-center gap-2 text-success">
                      <Check className="w-4 h-4" />
                      <span className="font-sans text-sm">Copied to clipboard</span>
                    </div>
                  )}
                </div>

                <p className="font-sans text-sm text-muted">
                  We&apos;ll never show this to you again.
                </p>
              </div>

              {/* Checkbox gate */}
              <div className="space-y-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={passwordSaved}
                    onChange={e => setPasswordSaved(e.target.checked)}
                    className="w-5 h-5 mt-1 accent-primary rounded border border-border cursor-pointer"
                  />
                  <span className="font-sans text-base text-foreground pt-0.5">
                    I&apos;ve saved my password somewhere safe.
                  </span>
                </label>

                <button
                  onClick={handleContinue}
                  disabled={!passwordSaved}
                  className="w-full h-14 bg-primary text-primary-foreground font-sans text-base font-medium rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                >
                  Continue to browse
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setStep('create')}
                  className="font-sans text-base text-primary hover:underline transition-colors"
                >
                  Back to edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
