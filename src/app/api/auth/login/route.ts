import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/models/User';
import { fakeVerify, verifyPassword } from '@/lib/auth/password';
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/auth/session';
import { loginSchema } from '@/lib/validation/auth';
import { fail, handleError, ok } from '@/lib/utils/api';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = logger('auth');

/** One message for every failure mode — never reveal which usernames exist. */
const REJECT = 'Incorrect username or password.';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail('Invalid request body.');

    const { username, password, remember } = loginSchema.parse(body);

    await connectDB();

    const user = await UserModel.findOne({ username }).select('+passwordHash').exec();
    if (!user) {
      await fakeVerify();
      log.warn('login failed — no such user', { username });
      return fail(REJECT, 401);
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
      log.warn('login failed — wrong password', { username });
      return fail(REJECT, 401);
    }

    const id = String(user._id);
    const displayName = user.displayName ?? null;
    // Fire-and-forget: a failed timestamp write must not fail the login.
    void UserModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).exec();

    log.info('signed in', { username, id });

    const token = await signSession({ sub: id, username }, remember);
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(remember));

    return ok({ username, displayName });
  } catch (err) {
    return handleError(err);
  }
}
