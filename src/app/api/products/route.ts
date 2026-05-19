/**
 * /api/products
 *
 * Owned by the Catalog Engineer.
 *
 * This is the CANONICAL pattern for API routes in this project.
 * Other engineers should copy this shape for their own endpoints:
 *   1. Validate input with Zod
 *   2. Call the service layer (never the repository directly)
 *   3. Catch errors via handleApiError
 */

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { handleApiError, ApiError } from '@/lib/api-error';
import * as catalogService from '@/services/catalog/service';
import { createProductSchema, listProductsQuerySchema } from '@/validators/product';

export async function GET(request: NextRequest) {
  try {
    const params = listProductsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const result = await catalogService.listProducts(params);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleApiError(
        new ApiError('VALIDATION_ERROR', 'Invalid query parameters', 400, error.flatten()),
      );
    }
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO(catalog): replace placeholder with real session lookup
    const sellerId = await getAuthenticatedSellerId(request);
    if (!sellerId) {
      throw new ApiError('UNAUTHORIZED', 'Sign in to list a product', 401);
    }

    const body = createProductSchema.parse(await request.json());
    const product = await catalogService.createProductForSeller(body, sellerId);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleApiError(
        new ApiError('VALIDATION_ERROR', 'Invalid product data', 400, error.flatten()),
      );
    }
    return handleApiError(error);
  }
}

/**
 * TODO(catalog): Replace with real session resolution.
 * Read the session cookie, look up the user, return their ID if they're a seller.
 */
async function getAuthenticatedSellerId(_request: NextRequest): Promise<string | null> {
  // Stub until auth service is built
  return null;
}
