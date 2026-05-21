/**
 * /api/lnurlp/[username]/callback
 *
 * LNURL-pay step 2: wallet POSTs amount in millisats, server returns a BOLT-11 invoice.
 * This is what external Lightning wallets call after the first metadata fetch.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { handleApiError, ApiError } from '@/lib/api-error';
import * as catalogService from '@/services/catalog/service';
import * as lightningClient from '@/services/lightning/breez-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const amountMsat = request.nextUrl.searchParams.get('amount');
    if (!amountMsat) throw new ApiError('VALIDATION_ERROR', 'amount parameter required', 400);

    const amountMsatBig = BigInt(amountMsat);
    const amountSats = amountMsatBig / 1000n;

    const seller = await catalogService.getSellerByUsername(username);
    if (!seller) throw new ApiError('NOT_FOUND', `No seller: ${username}`, 404);

    const lightningAddress = seller.lightningAddress;
    const invoice = await lightningClient.createInvoice({
      sellerLightningAddress: lightningAddress,
      amountSats,
      description: `Payment to ${seller.displayName ?? seller.username} on Bitscy`,
    });

    return NextResponse.json({ pr: invoice.bolt11, routes: [] });
  } catch (error) {
    return handleApiError(error);
  }
}
