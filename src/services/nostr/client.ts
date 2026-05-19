import { SimplePool, type Event } from 'nostr-tools';
import { NOSTR_RELAY_LIST } from '@/lib/env';

/**
 * Nostr client — manages relay pool and event publishing.
 *
 * Owned by the Catalog Engineer but used by both Catalog (products, profiles)
 * and Commerce (orders) for publishing signed events.
 *
 * The pool is a singleton — don't create new SimplePool instances per request.
 */

declare global {
  // eslint-disable-next-line no-var
  var __nostrPool: SimplePool | undefined;
}

function getPool(): SimplePool {
  if (!globalThis.__nostrPool) {
    globalThis.__nostrPool = new SimplePool();
  }
  return globalThis.__nostrPool;
}

export function getRelays(): string[] {
  return NOSTR_RELAY_LIST;
}

/**
 * Publish a signed event to all configured relays.
 * Returns the number of relays that accepted the event.
 * Does NOT throw if some relays fail — best-effort publish.
 */
export async function publishEvent(event: Event): Promise<number> {
  const pool = getPool();
  const relays = getRelays();

  if (relays.length === 0) {
    console.warn('No Nostr relays configured. Event not published.');
    return 0;
  }

  const promises = pool.publish(relays, event);
  const results = await Promise.allSettled(promises);

  const successCount = results.filter((r) => r.status === 'fulfilled').length;

  if (successCount === 0) {
    console.error('Failed to publish event to any relay', {
      eventId: event.id,
      kind: event.kind,
    });
  }

  return successCount;
}

/**
 * Fetch a single event by filter from the relay pool.
 * Times out after 3 seconds.
 */
export async function fetchEvent(filter: {
  kinds?: number[];
  authors?: string[];
  '#d'?: string[];
  ids?: string[];
}): Promise<Event | null> {
  const pool = getPool();
  const relays = getRelays();

  return pool.get(relays, filter, { maxWait: 3000 });
}
