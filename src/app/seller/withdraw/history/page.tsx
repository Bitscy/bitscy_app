'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Copy, Check } from 'lucide-react'

type WithdrawalStatus = 'SUCCESS' | 'PENDING' | 'FAILED'

interface Withdrawal {
  id: string
  reference: string
  amountNgn: number
  bankName: string
  accountLast4: string
  status: WithdrawalStatus
  completedRelative?: string
  pendingRelative?: string
  failureReason?: string
}

// Mock seller withdrawal log. In production: GET /api/payouts (or similar)
// returns the seller's full Payout history.
const WITHDRAWALS: Withdrawal[] = [
  {
    id: 'wd-1',
    reference: 'BTS-WD-9K3X-2L5M',
    amountNgn: 80000,
    bankName: 'GTBank',
    accountLast4: '1234',
    status: 'SUCCESS',
    completedRelative: '3 days ago',
  },
  {
    id: 'wd-2',
    reference: 'BTS-WD-7H2N-4Q8R',
    amountNgn: 25000,
    bankName: 'GTBank',
    accountLast4: '1234',
    status: 'SUCCESS',
    completedRelative: '1 week ago',
  },
  {
    id: 'wd-3',
    reference: 'BTS-WD-3M5P-6V1Y',
    amountNgn: 42300,
    bankName: 'GTBank',
    accountLast4: '1234',
    status: 'SUCCESS',
    completedRelative: '2 weeks ago',
  },
  {
    id: 'wd-4',
    reference: 'BTS-WD-8X4F-9L7T',
    amountNgn: 15000,
    bankName: 'GTBank',
    accountLast4: '1234',
    status: 'PENDING',
    pendingRelative: 'just now',
  },
]

const STATUS_PILLS: Record<WithdrawalStatus, { bg: string; text: string; label: string }> = {
  SUCCESS: { bg: 'bg-success', text: 'text-primary-foreground', label: 'Sent' },
  PENDING: { bg: 'bg-gold', text: 'text-foreground', label: 'In transit' },
  FAILED: { bg: 'bg-error', text: 'text-primary-foreground', label: 'Failed' },
}

export default function WithdrawalHistoryPage() {
  const [copiedRef, setCopiedRef] = useState<string | null>(null)

  const handleCopyRef = (reference: string) => {
    navigator.clipboard.writeText(reference)
    setCopiedRef(reference)
    setTimeout(() => setCopiedRef(null), 2000)
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Back-arrow header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-5 py-3 flex items-center">
          <Link
            href="/seller/withdraw"
            className="p-3 -m-3 hover:bg-input rounded transition-colors inline-flex"
            aria-label="Back to withdraw"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" strokeWidth={2} />
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-5 sm:px-6 lg:px-8 py-6 pb-12">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal mb-2">Withdrawals.</h1>
        <p className="font-sans text-sm text-muted mb-8">
          {WITHDRAWALS.length} {WITHDRAWALS.length === 1 ? 'withdrawal' : 'withdrawals'} all time
        </p>

        {WITHDRAWALS.length === 0 ? (
          /* Empty state */
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div
              className="w-16 h-16 rounded-full border-2 mb-5"
              style={{ borderColor: '#E8B43D' }}
              aria-hidden="true"
            />
            <h2 className="font-serif text-2xl font-normal mb-2">No withdrawals yet.</h2>
            <p className="font-sans text-sm text-muted max-w-sm">
              Your withdrawals will appear here once you cash out.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {WITHDRAWALS.map(w => {
              const pill = STATUS_PILLS[w.status]
              const isCopied = copiedRef === w.reference

              return (
                <div
                  key={w.id}
                  className="bg-white border border-border rounded-lg p-4 space-y-3"
                >
                  {/* Top row: amount + status pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-2xl text-accent tabular-nums">
                        ₦{w.amountNgn.toLocaleString('en-NG')}
                      </p>
                      <p className="font-sans text-sm text-muted mt-0.5">
                        to {w.bankName} ****{w.accountLast4}
                      </p>
                    </div>
                    <div
                      className={`${pill.bg} ${pill.text} text-xs px-3 py-1 rounded-full font-sans font-medium shrink-0`}
                    >
                      {pill.label}
                    </div>
                  </div>

                  {/* Failure reason, if any */}
                  {w.status === 'FAILED' && w.failureReason && (
                    <p className="font-sans text-xs text-error">
                      {w.failureReason}
                    </p>
                  )}

                  {/* Date + reference */}
                  <div className="border-t border-border pt-3 flex items-center justify-between gap-3">
                    <p className="font-sans text-xs text-muted">
                      {w.status === 'SUCCESS' && w.completedRelative
                        ? `Arrived ${w.completedRelative}`
                        : w.status === 'PENDING' && w.pendingRelative
                        ? `Started ${w.pendingRelative}`
                        : 'Status unknown'}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopyRef(w.reference)}
                      className="font-sans text-xs text-accent hover:opacity-80 transition-opacity flex items-center gap-1 tabular-nums"
                      aria-label="Copy reference"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> {w.reference}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
