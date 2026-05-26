import { NextResponse } from 'next/server';

import { getSession } from '@/lib/session';
import { getUserById } from '@/services/auth/service';
import { handleApiError, ApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new ApiError('UNAUTHORIZED', 'Not signed in', 401);

    const user = await getUserById(session.userId);
    if (!user) throw new ApiError('UNAUTHORIZED', 'Session invalid', 401);

    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
