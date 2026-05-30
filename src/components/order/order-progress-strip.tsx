/**
 * OrderProgressStrip — at-a-glance horizontal pip strip showing where an
 * order sits in its lifecycle. Lives on both buyer and seller order detail.
 *
 * Happy path:           Paid ─── Shipped ─── Delivered
 * Disputed (red):       Paid ─── Shipped ─── Disputed
 * Refunded (muted):     Paid ─── Shipped ─── Refunded
 * Cancelled (terminal): renders a single neutral pip; the rest of the
 *                       journey didn't happen and shouldn't be implied.
 *
 * Visual is intentionally small — just connected discs with labels — so
 * it complements the more detailed timeline section that follows on the
 * detail page rather than competing with it.
 */

import type { OrderStatus } from '@/types/shared'

interface OrderProgressStripProps {
  status: OrderStatus
  currentState?: string
}

type PipTone = 'primary' | 'error' | 'muted' | 'idle'

interface Step {
  label: string
  reached: boolean
  tone: PipTone
}

function classesFor(reached: boolean, tone: PipTone): { dot: string; label: string } {
  if (!reached) {
    return {
      dot: 'bg-background border-border',
      label: 'text-muted',
    }
  }
  if (tone === 'error') {
    return { dot: 'bg-error border-error', label: 'text-error font-medium' }
  }
  if (tone === 'muted') {
    return { dot: 'bg-muted border-muted', label: 'text-muted font-medium' }
  }
  return { dot: 'bg-primary border-primary', label: 'text-foreground font-medium' }
}

function connectorClass(reached: boolean, tone: PipTone): string {
  if (!reached) return 'bg-border'
  if (tone === 'error') return 'bg-error'
  if (tone === 'muted') return 'bg-muted'
  return 'bg-primary'
}

export function OrderProgressStrip({ status, currentState }: OrderProgressStripProps) {
  // PENDING + CANCELLED — short-circuit because the journey hasn't really
  // started (PENDING) or won't continue (CANCELLED). Render a single pip
  // labelled with the terminal state so the strip stays visually quiet.
  if (status === 'PENDING') {
    return (
      <div className="mb-8 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="w-3 h-3 rounded-full border-2 bg-background border-border"
        />
        <span className="font-sans text-xs text-muted">Awaiting payment</span>
      </div>
    )
  }
  if (status === 'CANCELLED') {
    return (
      <div className="mb-8 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="w-3 h-3 rounded-full border-2 bg-muted border-muted"
        />
        <span className="font-sans text-xs text-muted font-medium">Cancelled</span>
      </div>
    )
  }

  const isDisputed = currentState === 'disputed'
  const isRefunded = currentState === 'refunded'
  const isDelivered = status === 'DELIVERED' || currentState === 'delivered'
  const isShipped =
    status === 'SHIPPED' || isDelivered || isDisputed // disputed can happen post-ship
  // Paid is implicit from any status that isn't PENDING/CANCELLED.

  // Trailing step takes on the special-state identity when active. Otherwise
  // it's the happy-path "Delivered" pip — empty when not yet reached.
  let trailingLabel = 'Delivered'
  let trailingTone: PipTone = 'primary'
  let trailingReached = isDelivered
  if (isDisputed) {
    trailingLabel = 'Disputed'
    trailingTone = 'error'
    trailingReached = true
  } else if (isRefunded) {
    trailingLabel = 'Refunded'
    trailingTone = 'muted'
    trailingReached = true
  }

  const steps: Step[] = [
    { label: 'Paid', reached: true, tone: 'primary' },
    { label: 'Shipped', reached: isShipped, tone: 'primary' },
    { label: trailingLabel, reached: trailingReached, tone: trailingTone },
  ]

  return (
    <div
      className="mb-8 flex items-start justify-between gap-2 sm:gap-3 max-w-md"
      role="img"
      aria-label={`Order progress: ${steps.map(s => s.label).join(', ')}`}
    >
      {steps.map((step, i) => {
        const c = classesFor(step.reached, step.tone)
        const isLast = i === steps.length - 1
        // Connector inherits the tone of the destination step it leads to.
        const next = steps[i + 1]
        const connectorReached = next ? next.reached : false
        const connectorTone: PipTone = next ? next.tone : 'idle'
        return (
          <div key={step.label} className="flex items-start gap-2 sm:gap-3 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`w-3 h-3 rounded-full border-2 ${c.dot}`}
              />
              <span className={`font-sans text-xs ${c.label} whitespace-nowrap`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`h-0.5 flex-1 mt-[5px] ${connectorClass(connectorReached, connectorTone)}`}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
