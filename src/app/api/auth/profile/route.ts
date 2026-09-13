import type { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/models/User';
import { getSession } from '@/lib/auth/server';
import { profileSchema } from '@/lib/validation/profile';
import { fail, handleError, ok, unauthorized } from '@/lib/utils/api';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = logger('profile');

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    await connectDB();
    const user = await UserModel.findById(session.sub).select('username avatar').lean().exec();
    if (!user) return fail('Account not found.', 404);

    return ok(
      { username: user.username, avatar: user.avatar ?? null },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body) return fail('Invalid request body.');

    const { avatar } = profileSchema.parse(body);

    await connectDB();
    const user = await UserModel.findByIdAndUpdate(
      session.sub,
      avatar === null ? { $unset: { avatar: 1 } } : { $set: { avatar } },
      { new: true },
    )
      .select('username avatar')
      .lean()
      .exec();

    if (!user) return fail('Account not found.', 404);

    log.info(avatar === null ? 'avatar removed' : 'avatar updated', {
      username: session.username,
      bytes: avatar?.length ?? 0,
    });

    return ok({ username: user.username, avatar: user.avatar ?? null });
  } catch (err) {
    return handleError(err);
  }
}
