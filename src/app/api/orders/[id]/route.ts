/**
 * /api/orders/[id]
 *
 * GET — fetch a single order (buyer or seller of that order only)
 */

import { NextResponse, type NextRequest } from 'next/server';

import { handleApiError, ApiError } from '@/lib/api-error';
import { getSession } from '@/lib/session';
import * as commerceService from '@/services/commerce/service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) throw new ApiError('UNAUTHORIZED', 'Sign in to view this order', 401);

    const { id } = await params;
    const order = await commerceService.getOrderForUser(id, session.userId);
    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}
