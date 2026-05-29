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

  // Lightning init requires LNBITS_ADMIN_KEY (or eventually a real Breez
  // mnemonic). For engineers not working on payments, those env vars
  // won't be set — and we don't want their dev server to refuse to boot.
  // Catch and warn; Lightning routes will fail clearly at request time
  // if anyone actually tries to use them without the keys.
  try {
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
  } catch (err) {
    console.warn(
      '[instrumentation] Lightning event listener not registered:',
      err instanceof Error ? err.message : err,
    );
    console.warn(
      '[instrumentation] Payment-related routes will fail until the relevant env vars are set. Non-Lightning routes (auth, products, profile, etc.) are unaffected.',
    );
  }
}
