import { describe, it, expect, beforeEach } from 'vitest';
import { deriveSellerMnemonic } from '@/services/lightning/mnemonic';

describe('deriveSellerMnemonic', () => {
  beforeEach(() => {
    process.env.SYSTEM_NSEC = 'nsec1test000000000000000000000000000000000000000000000000000000';
  });

  it('returns a 24-word BIP39 mnemonic', () => {
    const mnemonic = deriveSellerMnemonic('seller-uuid-abc123');
    const words = mnemonic.split(' ');
    expect(words).toHaveLength(24);
  });

  it('is deterministic — same sellerId always returns same mnemonic', () => {
    const a = deriveSellerMnemonic('seller-uuid-abc123');
    const b = deriveSellerMnemonic('seller-uuid-abc123');
    expect(a).toBe(b);
  });

  it('is unique per seller — different sellerIds produce different mnemonics', () => {
    const a = deriveSellerMnemonic('seller-uuid-abc123');
    const b = deriveSellerMnemonic('seller-uuid-xyz789');
    expect(a).not.toBe(b);
  });

  it('throws when SYSTEM_NSEC is not set', () => {
    delete process.env.SYSTEM_NSEC;
    expect(() => deriveSellerMnemonic('seller-id')).toThrow('SYSTEM_NSEC');
  });
});
