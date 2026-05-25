'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check, Copy, Loader2 } from 'lucide-react'

// Mock data — in production this comes from /api/wallet/balance and a
// bank-accounts endpoint. The available balance and saved banks are
// per-seller and fetched on mount.
const AVAILABLE_BALANCE = 127500 // ₦
const AVAILABLE_SATS = 425000

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string // store the full number; mask on render
  accountHolder: string
}

const NIGERIAN_BANKS = [
  'GTBank',
  'Zenith Bank',
  'Access Bank',
  'UBA',
  'First Bank',
  'FCMB',
  'Stanbic IBTC',
  'Wema Bank',
  'Kuda',
  'Opay',
]

const maskAccount = (num: string) => `****${num.slice(-4)}`

type View = 'form' | 'submitting' | 'success'

export default function WithdrawPage() {
  const router = useRouter()

  const [savedBanks, setSavedBanks] = useState<BankAccount[]>([
    { id: 'gt-1', bankName: 'GTBank', accountNumber: '0123451234', accountHolder: 'Adaeze Okonkwo' },
  ])
  const [selectedBankId, setSelectedBankId] = useState<string>('gt-1')
  const [amount, setAmount] = useState<string>(String(AVAILABLE_BALANCE))
  const [view, setView] = useState<View>('form')

  // Add-bank form state
  const [showAddBank, setShowAddBank] = useState(false)
  const [newBankName, setNewBankName] = useState(NIGERIAN_BANKS[0]!)
  const [newAccountNumber, setNewAccountNumber] = useState('')
  const [newAccountHolder, setNewAccountHolder] = useState('')

  // Success-state reference id and copy state
  const referenceId = 'BTS-WD-9K3X-2L5M'
  const [refCopied, setRefCopied] = useState(false)

  const numericAmount = parseInt(amount || '0', 10)
  const isOverBalance = numericAmount > AVAILABLE_BALANCE
  const isValidAmount = numericAmount > 0 && !isOverBalance
  const canWithdraw = selectedBankId !== '' && isValidAmount && !showAddBank
  const selectedBank = savedBanks.find(b => b.id === selectedBankId)

  const handleWithdrawAll = () => {
    setAmount(String(AVAILABLE_BALANCE))
  }

  const handleSaveBank = () => {
    if (!newAccountNumber || !newAccountHolder) return
    const newId = `bank-${Date.now()}`
    const newBank: BankAccount = {
      id: newId,
      bankName: newBankName,
      accountNumber: newAccountNumber,
      accountHolder: newAccountHolder,
    }
    setSavedBanks(prev => [...prev, newBank])
    setSelectedBankId(newId)
    // Reset and close the form
    setNewBankName(NIGERIAN_BANKS[0]!)
    setNewAccountNumber('')
    setNewAccountHolder('')
    setShowAddBank(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canWithdraw) return
    setView('submitting')
    await new Promise(resolve => setTimeout(resolve, 1800))
    setView('success')
  }

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referenceId)
    setRefCopied(true)
    setTimeout(() => setRefCopied(false), 2000)
  }

  const handleAnother = () => {
    setAmount(String(AVAILABLE_BALANCE))
    setView('form')
  }

  // ----- SUCCESS VIEW -----
  if (view === 'success') {
    return (
      <div className="bg-background min-h-screen text-foreground">
        {/* No back arrow on success — the CTAs handle navigation */}
        <main className="mx-auto max-w-xl px-5 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
          {/* Success ornament */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-success" strokeWidth={3} />
            </div>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-tight mb-3 tabular-nums">
            ₦{numericAmount.toLocaleString('en-NG')} sent.
          </h1>
          <p className="font-sans text-base text-muted mb-10 max-w-md mx-auto">
            It should arrive in your {selectedBank?.bankName} account in about 30 minutes.
          </p>

          {/* Reference row */}
          <div className="inline-flex items-center gap-3 bg-white border border-border px-4 py-2 rounded-full mb-10">
            <span className="font-sans text-xs text-muted">Ref:</span>
            <span className="font-sans text-sm tabular-nums text-foreground">{referenceId}</span>
            <button
              onClick={handleCopyRef}
              className="text-accent hover:opacity-80 transition-opacity"
              aria-label="Copy reference"
            >
              {refCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Link
              href="/seller"
              className="block w-full bg-primary text-primary-foreground py-3 rounded font-sans font-medium hover:opacity-90 transition-opacity"
            >
              Back to dashboard
            </Link>
            <button
              onClick={handleAnother}
              className="block w-full text-accent font-sans font-medium hover:opacity-80 transition-opacity py-3"
            >
              Withdraw another amount
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ----- FORM VIEW (default + submitting) -----
  return (
    <div className="bg-background min-h-screen text-foreground">
      {/* Back arrow header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="px-5 py-3 flex items-center">
          <button
            onClick={() => router.back()}
            className="p-3 -m-3 hover:bg-input rounded transition-colors"
            aria-label="Go back"
            disabled={view === 'submitting'}
          >
            <ChevronLeft className="w-6 h-6 text-foreground" strokeWidth={2} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-xl px-5 sm:px-6 lg:px-8 py-6 pb-24">
        {/* Page title */}
        <h1 className="font-serif text-4xl sm:text-5xl font-normal leading-tight mb-8">
          Withdraw.
        </h1>

        {/* 1. Balance card */}
        <section className="bg-white border border-border rounded-lg p-5 mb-8">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="font-sans text-xs uppercase tracking-widest text-muted">
              Available to withdraw
            </p>
            <Link
              href="/seller/withdraw/history"
              className="font-sans text-xs text-accent hover:opacity-80 transition-opacity"
            >
              View history
            </Link>
          </div>
          <p className="font-serif text-4xl sm:text-5xl font-normal tabular-nums">
            ₦{AVAILABLE_BALANCE.toLocaleString('en-NG')}
          </p>
          <p className="font-sans text-sm text-muted mt-1 tabular-nums">
            ≈ {AVAILABLE_SATS.toLocaleString('en-NG')} sats
          </p>
        </section>

        {/* 2. Bank account selector */}
        <section className="mb-8">
          <h2 className="font-serif text-xl font-normal mb-4">Where it goes.</h2>

          <div className="space-y-3">
            {savedBanks.map(bank => {
              const isSelected = selectedBankId === bank.id
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => {
                    setSelectedBankId(bank.id)
                    setShowAddBank(false)
                  }}
                  className="w-full bg-white border border-border rounded-lg p-4 flex items-center gap-4 text-left hover:bg-input/40 transition-colors"
                  disabled={view === 'submitting'}
                >
                  {/* Bank initials square */}
                  <div className="w-10 h-10 rounded bg-[#F5EFE3] flex items-center justify-center shrink-0">
                    <span className="font-serif text-sm text-foreground">
                      {bank.bankName.charAt(0)}
                    </span>
                  </div>
                  {/* Bank info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-base font-medium text-foreground">
                      {bank.bankName}
                    </p>
                    <p className="font-sans text-sm text-muted truncate">
                      {maskAccount(bank.accountNumber)} · {bank.accountHolder}
                    </p>
                  </div>
                  {/* Radio dot */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      isSelected ? 'border-accent' : 'border-border'
                    }`}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                  </div>
                </button>
              )
            })}

            {/* Add bank: collapsed card OR expanded inline form */}
            {!showAddBank ? (
              <button
                type="button"
                onClick={() => setShowAddBank(true)}
                className="w-full bg-white border border-dashed border-border rounded-lg p-4 text-center hover:bg-input/40 transition-colors"
                disabled={view === 'submitting'}
              >
                <span className="font-sans text-base text-accent font-medium">
                  + Add another bank account
                </span>
              </button>
            ) : (
              <div className="bg-white border border-border rounded-lg p-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="bankName" className="block font-sans text-sm font-medium">
                    Bank name
                  </label>
                  <select
                    id="bankName"
                    value={newBankName}
                    onChange={e => setNewBankName(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-border rounded font-sans text-base focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  >
                    {NIGERIAN_BANKS.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="accountNumber" className="block font-sans text-sm font-medium">
                    Account number
                  </label>
                  <input
                    id="accountNumber"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    value={newAccountNumber}
                    onChange={e => setNewAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="0123456789"
                    className="w-full px-4 py-3 bg-white border border-border rounded font-sans text-base tabular-nums placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="accountHolder" className="block font-sans text-sm font-medium">
                    Account holder name
                  </label>
                  <input
                    id="accountHolder"
                    type="text"
                    value={newAccountHolder}
                    onChange={e => setNewAccountHolder(e.target.value)}
                    placeholder="As it appears on your bank account"
                    className="w-full px-4 py-3 bg-white border border-border rounded font-sans text-base placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                  <p className="font-sans text-xs text-muted">
                    We&apos;ll show this back to you before every withdrawal so you can double-check it.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveBank}
                    disabled={!newAccountNumber || !newAccountHolder}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded font-sans font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save bank
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBank(false)
                      setNewAccountNumber('')
                      setNewAccountHolder('')
                    }}
                    className="text-muted font-sans font-medium hover:text-foreground transition-colors px-3"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. Amount block */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-xl font-normal">How much.</h2>
            <button
              type="button"
              onClick={handleWithdrawAll}
              className="font-sans text-sm text-accent hover:opacity-80 transition-opacity"
              disabled={view === 'submitting'}
            >
              Withdraw all
            </button>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground font-medium pointer-events-none">
              ₦
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
              className={`w-full pl-8 pr-4 py-3 bg-white border rounded font-sans text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-primary ${
                isOverBalance ? 'border-error' : 'border-border'
              }`}
              style={{ minHeight: '48px', fontSize: '16px' }}
              disabled={view === 'submitting'}
            />
          </div>

          {isOverBalance ? (
            <p className="font-sans text-sm text-error mt-2 tabular-nums">
              You only have ₦{AVAILABLE_BALANCE.toLocaleString('en-NG')} to withdraw.
            </p>
          ) : (
            <p className="font-sans text-sm text-muted mt-2 tabular-nums">
              Available: ₦{AVAILABLE_BALANCE.toLocaleString('en-NG')}.
            </p>
          )}
        </section>

        {/* 4. Preview block — only when there's a sensible amount and bank */}
        {selectedBank && isValidAmount && (
          <section className="bg-[#F5EFE3] rounded-lg p-4 mb-8 space-y-3">
            <div>
              <p className="font-sans text-xs text-muted mb-1">You&apos;re sending</p>
              <p className="font-serif text-2xl text-accent tabular-nums">
                ₦{numericAmount.toLocaleString('en-NG')}
              </p>
            </div>
            <div>
              <p className="font-sans text-xs text-muted mb-1">To</p>
              <p className="font-sans text-sm text-foreground">
                {selectedBank.bankName} · {maskAccount(selectedBank.accountNumber)}
              </p>
            </div>
            <div>
              <p className="font-sans text-xs text-muted mb-1">Arrives in</p>
              <p className="font-sans text-sm text-foreground">
                About 30 minutes during banking hours.
              </p>
            </div>
            <p className="font-sans text-xs text-success pt-1">
              No fees on this withdrawal.
            </p>
          </section>
        )}

        {/* 5. Confirm CTA */}
        <div className="h-px bg-gold opacity-60 mb-6" />

        <button
          type="submit"
          disabled={!canWithdraw || view === 'submitting'}
          className="w-full bg-primary text-primary-foreground py-4 rounded font-sans text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ minHeight: '56px' }}
        >
          {view === 'submitting' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="tabular-nums">
                Sending ₦{numericAmount.toLocaleString('en-NG')} to {selectedBank?.bankName} {selectedBank ? maskAccount(selectedBank.accountNumber) : ''}…
              </span>
            </>
          ) : (
            <span className="tabular-nums">
              Withdraw ₦{numericAmount.toLocaleString('en-NG')}
            </span>
          )}
        </button>
      </form>
    </div>
  )
}
