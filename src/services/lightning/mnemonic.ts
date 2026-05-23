import { createHmac } from 'crypto';
import { entropyToMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

/**
 * Derives a unique, reproducible BIP39 mnemonic for each seller's Breez wallet.
 *
 * HMAC-SHA256(key=SYSTEM_NSEC, data="bitscy-seller-wallet-<sellerId>") → 32 bytes
 * → 24-word BIP39 mnemonic → Breez wallet seed.
 *
 * Same sellerId always produces the same wallet. Wallet survives server restarts.
 * SYSTEM_NSEC never leaves the server — it is never sent to Breez.
 */
export function deriveSellerMnemonic(sellerId: string): string {
  const systemNsec = process.env.SYSTEM_NSEC;
  if (!systemNsec) throw new Error('SYSTEM_NSEC env var is required for Lightning wallet derivation');

  // 32 bytes of deterministic entropy, unique per seller
  const entropy = createHmac('sha256', systemNsec)
    .update(`bitscy-seller-wallet-${sellerId}`)
    .digest(); // Returns Buffer (subclass of Uint8Array)

  return entropyToMnemonic(entropy, wordlist);
}
