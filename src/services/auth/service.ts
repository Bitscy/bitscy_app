import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';

import * as repository from '../catalog/repository';
import { ApiError } from '@/lib/api-error';
import type { SessionData } from '@/lib/session';
import type { User } from '@/types/shared';
import { buildProfileEventTemplate } from '../nostr/events';
import { signEventWithKey } from '../nostr/signing';
import { publishEvent } from '../nostr/publisher';

const PBKDF2_ITERATIONS = 100_000;

async function encryptSecretKey(
  secretKey: Uint8Array<ArrayBuffer>,
  password: string,
): Promise<{ encryptedKey: string; keySalt: string; keyIv: string }> {
  const salt = new Uint8Array(16) as Uint8Array<ArrayBuffer>;
  const iv = new Uint8Array(12) as Uint8Array<ArrayBuffer>;
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, secretKey);

  return {
    encryptedKey: Buffer.from(encrypted).toString('base64url'),
    keySalt: Buffer.from(salt).toString('base64url'),
    keyIv: Buffer.from(iv).toString('base64url'),
  };
}

// Returns null if password is wrong — decryption will throw inside AES-GCM.
export async function decryptSecretKey(
  encryptedKey: string,
  keySalt: string,
  keyIv: string,
  password: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const salt = Uint8Array.from(Buffer.from(keySalt, 'base64url')) as Uint8Array<ArrayBuffer>;
    const iv = Uint8Array.from(Buffer.from(keyIv, 'base64url')) as Uint8Array<ArrayBuffer>;
    const ciphertext = Uint8Array.from(Buffer.from(encryptedKey, 'base64url')) as Uint8Array<ArrayBuffer>;

    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    );

    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, ciphertext);

    return new Uint8Array(decrypted) as Uint8Array<ArrayBuffer>;
  } catch {
    return null;
  }
}

export async function signup(params: {
  username: string;
  password: string;
  role?: 'BUYER' | 'SELLER';
  displayName?: string;
}): Promise<User> {
  const role = params.role ?? 'BUYER';

  const existing = await repository.findUserByUsername(params.username);
  if (existing) throw new ApiError('CONFLICT', 'Username already taken', 409);

  const secretKey = generateSecretKey() as Uint8Array<ArrayBuffer>;
  const hexPubkey = getPublicKey(secretKey);
  const npub = nip19.npubEncode(hexPubkey);

  const { encryptedKey, keySalt, keyIv } = await encryptSecretKey(secretKey, params.password);

  const user = await repository.createUser({
    npub,
    username: params.username,
    displayName: params.displayName ?? null,
    role,
    lightningAddr: role === 'SELLER' ? `${params.username}@bitscy.com` : null,
    encryptedKey,
    keySalt,
    keyIv,
  });

  return toUser(user);
}

export async function loginWithPassword(username: string, password: string): Promise<User> {
  const rawUser = await repository.findUserByUsername(username);

  if (!rawUser?.encryptedKey || !rawUser.keySalt || !rawUser.keyIv) {
    throw new ApiError('UNAUTHORIZED', 'Invalid credentials', 401);
  }

  const secretKey = await decryptSecretKey(
    rawUser.encryptedKey,
    rawUser.keySalt,
    rawUser.keyIv,
    password,
  );

  if (!secretKey) {
    throw new ApiError('UNAUTHORIZED', 'Invalid credentials', 401);
  }

  return toUser(rawUser);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const user = await repository.findUserByUsername(username);
  if (!user) return null;
  return toUser(user);
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await repository.findUserById(id);
  if (!user) return null;
  return toUser(user);
}

export async function updateProfile(
  userId: string,
  input: { displayName?: string; about?: string; avatar?: string },
  password?: string,
): Promise<User> {
  const rawUser = await repository.findUserById(userId);
  if (!rawUser) throw new ApiError('NOT_FOUND', 'User not found', 404);

  const updated = await repository.updateUser(userId, {
    ...(input.displayName !== undefined && { displayName: input.displayName }),
    ...(input.about !== undefined && { about: input.about }),
    ...(input.avatar !== undefined && { avatar: input.avatar }),
  });

  // Best-effort kind 0 Nostr publish using the user's own key.
  if (password && rawUser.encryptedKey && rawUser.keySalt && rawUser.keyIv) {
    try {
      const secretKey = await decryptSecretKey(
        rawUser.encryptedKey,
        rawUser.keySalt,
        rawUser.keyIv,
        password,
      );
      if (secretKey) {
        const template = buildProfileEventTemplate({
          displayName: updated.displayName,
          about: updated.about,
          avatar: updated.avatar,
        });
        const signedEvent = signEventWithKey(template, secretKey);
        await publishEvent(signedEvent);
      }
    } catch (err) {
      console.error('Profile Nostr publish failed for user', userId, err);
    }
  }

  return toUser(updated);
}

// Auth guards — synchronous, no DB call needed since role is stored in the session cookie.
export function requireUser(session: SessionData | null): SessionData {
  if (!session) throw new ApiError('UNAUTHORIZED', 'Sign in required', 401);
  return session;
}

export function requireSeller(session: SessionData | null): SessionData {
  const s = requireUser(session);
  if (s.role !== 'SELLER') throw new ApiError('FORBIDDEN', 'Seller account required', 403);
  return s;
}

type PrismaUser = NonNullable<Awaited<ReturnType<typeof repository.findUserById>>>;

function toUser(u: PrismaUser): User {
  return {
    id: u.id,
    npub: u.npub,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    about: u.about,
    lightningAddr: u.lightningAddr,
    role: u.role as User['role'],
    createdAt: u.createdAt.toISOString(),
  };
}
