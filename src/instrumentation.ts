/**
 * Next.js instrumentation hook — runs once at server boot before any requests.
 *
 * This is the canonical place to register the Breez SDK event listener so that
 * Lightning settlements trigger markPaid() regardless of which API route is
 * handling traffic at the time. The listener must be registered exactly once.
 */

export async function register() {
  // Only run on the Node.js server runtime, not in the Edge runtime or browser.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { addEventHandler } = await import('@/services/lightning/breez-platform');
  const { markPaid } = await import('@/services/commerce/service');

  await addEventHandler((event) => {
    // Breez SDK Liquid 0.9.x event shape (same for LNBits and mock backends):
    //   event.type                        → "paymentSucceeded" | "paymentFailed" | ...
    //   event.details.paymentType         → "receive" | "send"
    //   event.details.details.paymentHash → hex string (Lightning only)
    //
    // Only process incoming receives — ignore our own outbound send confirmations
    // (e.g., withdrawal payments to Bitnob), which would spuriously call markPaid.
    const isReceive = event.details?.paymentType === 'receive';
    const hash = event.details?.details?.paymentHash;
    if (event.type === 'paymentSucceeded' && isReceive && hash) {
      // markPaid is idempotent — the race with frontend polling is resolved
      // atomically inside it (WHERE status = 'PENDING').
      markPaid(hash).catch((err: unknown) => {
        console.error('[breez] markPaid failed for paymentHash:', hash, err);
      });
    }
  });
}
