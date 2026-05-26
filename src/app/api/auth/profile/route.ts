import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/session';
import { updateProfile, requireUser } from '@/services/auth/service';
import { handleApiError, ApiError } from '@/lib/api-error';

const patchSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  about: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  password: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = requireUser(await getSession());

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const { password, ...profileFields } = parsed.data;

    if (!profileFields.displayName && !profileFields.about && !profileFields.avatar) {
      throw new ApiError('VALIDATION_ERROR', 'At least one field must be provided', 400);
    }

    const user = await updateProfile(session.userId, profileFields, password);
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
