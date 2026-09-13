import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/models/User';
import { hashPassword } from '@/lib/auth/password';
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/auth/session';
import { signupSchema } from '@/lib/validation/auth';
import { fail, handleError, ok } from '@/lib/utils/api';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = logger('auth');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return fail('Invalid request body.');

    const { username, password, remember } = signupSchema.parse(body);
    const passwordHash = await hashPassword(password);

    await connectDB();

    const existing = await UserModel.exists({ username });
    if (existing) {
      log.info('signup rejected — username taken', { username });
      return fail('That username is already taken.', 409);
    }

    const created = await UserModel.create({ username, passwordHash });
    const id = String(created._id);

    log.info('account created', { username, id });

    const token = await signSession({ sub: id, username }, remember);
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(remember));

    return ok({ username }, { status: 201 });
  } catch (err) {
    // A racing signup trips the unique index rather than the exists() check.
    if ((err as { code?: number })?.code === 11000) {
      return fail('That username is already taken.', 409);
    }
    return handleError(err);
  }
}
