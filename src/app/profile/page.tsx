'use client'

import BottomNavigation from '@/components/bottom-navigation'

export default function ProfilePage() {
  return (
    <div className="flex flex-col h-screen bg-bitscy-background">
      {/* Header */}
      <header className="px-6 py-4 border-b border-bitscy-gold/20">
        <h1 className="font-serif text-2xl text-bitscy-text">Profile</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-md">
          <p className="text-bitscy-muted text-lg mb-4">Your profile page is coming soon.</p>
          <p className="text-bitscy-muted text-sm">Check back soon for account settings, order history, and more.</p>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
