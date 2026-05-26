import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

import { loginWithPassword } from '@/services/auth/service';
import { buildSessionCookie, sessionCookieOptions } from '@/lib/session';
import { handleApiError, ApiError } from '@/lib/api-error';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'Username and password required', 400);
    }

    const user = await loginWithPassword(parsed.data.username, parsed.data.password);

    const token = buildSessionCookie({
      userId: user.id,
      role: user.role,
      username: user.username,
      npub: user.npub,
    });
    (await cookies()).set(sessionCookieOptions(token));

    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
