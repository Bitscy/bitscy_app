/**
 * /api/webhooks/breez
 *
 * POST — Breez settlement webhook. Called by Breez when a payment settles.
 * Signature verification required. Idempotent — duplicate webhooks are no-ops.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

import { handleApiError, ApiError } from '@/lib/api-error';
import * as commerceService from '@/services/commerce/service';

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.BREEZ_WEBHOOK_SECRET;
  if (!secret) {
    // In dev without a secret configured, skip verification.
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }

  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const sigBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  if (sigBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(sigBuf, expectedBuf);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-breez-signature') ?? '';

    if (!verifySignature(rawBody, signature)) {
      throw new ApiError('FORBIDDEN', 'Invalid webhook signature', 403);
    }

    const payload = JSON.parse(rawBody) as { paymentHash?: string; settled?: boolean };

    if (!payload.paymentHash || !payload.settled) {
      // Non-settlement event — acknowledge and ignore
      return NextResponse.json({ ok: true });
    }

    await commerceService.markPaid(payload.paymentHash);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
