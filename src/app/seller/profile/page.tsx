'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Plus, X, Loader2 } from 'lucide-react'

interface ExistingProfile {
  shopName: string
  displayName: string
  avatarUrl: string | null
  location: string
  about: string
  lightningAddress: string
}

// Mock current profile state. In production this is fetched from
// GET /api/users/me. The "incomplete" preview is triggered via ?incomplete=1.
const FULL_PROFILE: ExistingProfile = {
  shopName: 'Adaeze Studio',
  displayName: 'Adaeze Okonkwo',
  avatarUrl: null, // imagine seller has not uploaded a real avatar yet
  location: 'Lagos, Nigeria',
  about:
    'Hand-woven textiles, beaded jewelry, and small ceramic forms. Made slowly, in Lagos.',
  lightningAddress: '',
}

const BLANK_PROFILE: ExistingProfile = {
  shopName: 'Adaeze Studio',
  displayName: '',
  avatarUrl: null,
  location: '',
  about: '',
  lightningAddress: '',
}

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isFirstTime = searchParams.get('incomplete') === '1'

  const initial = isFirstTime ? BLANK_PROFILE : FULL_PROFILE

  // Form state
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatarUrl)
  const [avatarState, setAvatarState] = useState<'empty' | 'uploading' | 'uploaded'>(
    initial.avatarUrl ? 'uploaded' : 'empty'
  )
  const [location, setLocation] = useState(initial.location)
  const [about, setAbout] = useState(initial.about)
  const [lightningAddress, setLightningAddress] = useState(initial.lightningAddress)

  const [isSaving, setIsSaving] = useState(false)

  // Avatar handlers
  const handleAvatarAdd = () => {
    setAvatarState('uploading')
    setTimeout(() => {
      // Mock upload — uses one of the existing artwork files for preview
      setAvatarUrl('/artwork-2.jpg')
      setAvatarState('uploaded')
    }, 1200)
  }

  const handleAvatarRemove = () => {
    setAvatarUrl(null)
    setAvatarState('empty')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    router.push('/seller')
  }

  // Copy variations by mode
  const headline = isFirstTime ? 'Tell us about your craft.' : 'Edit your profile.'
  const subtitle = isFirstTime
    ? 'A few details so buyers know who you are. You can change these anytime.'
    : ''
  const ctaLabel = isFirstTime ? 'Continue to my shop' : 'Save changes'
  const ctaSaving = isFirstTime ? 'Saving…' : 'Saving…'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="mx-auto max-w-2xl px-5 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link
            href="/seller"
            className="flex items-center justify-center w-11 h-11 hover:bg-border rounded transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="mx-auto max-w-2xl px-5 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Title */}
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-foreground mb-3">
          {headline}
        </h1>
        {subtitle && (
          <p className="font-sans text-base text-muted mb-8 max-w-lg">{subtitle}</p>
        )}
        {!subtitle && <div className="mb-8" />}

        {/* 1. Profile photo */}
        <div className="mb-10">
          <h2 className="font-serif text-xl font-normal mb-1">Profile photo.</h2>
          <p className="text-sm text-muted mb-5">A photo of you or your work. Optional.</p>

          <div className="flex items-center gap-5">
            {avatarState === 'empty' && (
              <button
                type="button"
                onClick={handleAvatarAdd}
                className="w-24 h-24 rounded-full bg-white border border-dashed border-border flex flex-col items-center justify-center hover:bg-border/10 transition-colors shrink-0"
                aria-label="Add profile photo"
              >
                <Plus className="w-5 h-5 text-muted mb-1" />
                <span className="text-xs text-muted">Add</span>
              </button>
            )}

            {avatarState === 'uploading' && (
              <div className="w-24 h-24 rounded-full bg-gray-100 border border-border flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-muted animate-spin" />
              </div>
            )}

            {avatarState === 'uploaded' && avatarUrl && (
              <div className="w-24 h-24 rounded-full relative overflow-hidden shrink-0">
                <img
                  src={avatarUrl}
                  alt="Profile photo"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  className="absolute top-0 right-0 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                  aria-label="Remove profile photo"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
            )}

            <div className="text-sm text-muted">
              <p className="text-foreground font-medium">Bitscy will resize</p>
              <p>your photo. Square works best.</p>
            </div>
          </div>
        </div>

        {/* 2. Display name */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-normal mb-3">Your name.</h2>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="As you'd like buyers to see it"
            className="w-full px-4 py-3 bg-white rounded border border-border text-base font-normal text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            style={{ minHeight: '48px', fontSize: '16px' }}
          />
          <p className="text-xs text-muted mt-2">
            This appears on your shop page next to your work.
          </p>
        </div>

        {/* 3. Location */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-normal mb-3">Where you&apos;re based.</h2>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Lagos, Nigeria"
            className="w-full px-4 py-3 bg-white rounded border border-border text-base font-normal text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            style={{ minHeight: '48px', fontSize: '16px' }}
          />
          <p className="text-xs text-muted mt-2">
            City and country. Shown to buyers so they know where pieces ship from.
          </p>
        </div>

        {/* 4. About */}
        <div className="mb-8">
          <h2 className="font-serif text-xl font-normal mb-3">About your work.</h2>
          <textarea
            value={about}
            onChange={e => setAbout(e.target.value)}
            placeholder="A sentence or two about what you make and why."
            className="w-full px-4 py-3 bg-white rounded border border-border text-base font-normal text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
            rows={4}
            style={{ fontSize: '16px' }}
            maxLength={280}
          />
          <p className="text-xs text-muted mt-2 tabular-nums">
            {about.length} / 280
          </p>
        </div>

        {/* 5. Lightning address (optional) */}
        <div className="mb-10">
          <h2 className="font-serif text-xl font-normal mb-3">Lightning address (optional).</h2>
          <input
            type="text"
            value={lightningAddress}
            onChange={e => setLightningAddress(e.target.value)}
            placeholder="you@yourwallet.com"
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full px-4 py-3 bg-white rounded border border-border text-base font-normal text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            style={{ minHeight: '48px', fontSize: '16px' }}
          />
          <p className="text-xs text-muted mt-2">
            If you have a personal Lightning address, buyers can pay directly to it.
            You can always withdraw to your bank instead.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gold mb-8" />

        {/* Save / Continue */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-primary text-primary-foreground py-4 px-6 rounded font-sans text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ minHeight: '56px' }}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {ctaSaving}
            </>
          ) : (
            ctaLabel
          )}
        </button>

        {/* Skip (first-time only) OR Cancel */}
        <div className="text-center mt-4">
          {isFirstTime ? (
            <Link
              href="/seller"
              className="font-sans text-sm text-muted hover:text-foreground transition-colors"
            >
              Skip for now
            </Link>
          ) : (
            <Link
              href="/seller"
              className="font-sans text-sm text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </Link>
          )}
        </div>
      </form>
    </div>
  )
}

export default function SellerProfilePage() {
  return (
    <Suspense fallback={<div className="bg-background min-h-screen" />}>
      <ProfilePageContent />
    </Suspense>
  )
}
