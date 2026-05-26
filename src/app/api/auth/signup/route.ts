import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

import { signup } from '@/services/auth/service';
import { buildSessionCookie, sessionCookieOptions } from '@/lib/session';
import { handleApiError, ApiError } from '@/lib/api-error';

const schema = z.object({
  username: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, and underscores only'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['BUYER', 'SELLER']).default('BUYER'),
  displayName: z.string().max(80).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const user = await signup(parsed.data);

    const token = buildSessionCookie({
      userId: user.id,
      role: user.role,
      username: user.username,
      npub: user.npub,
    });
    (await cookies()).set(sessionCookieOptions(token));

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
