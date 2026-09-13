import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getOwnerId } from '@/lib/auth/server';
import { AuthConfigurationError } from '@/lib/auth/session';
import { describeError, logger } from '@/lib/utils/logger';

const log = logger('api');

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Errors that mean "the database is unreachable", not "your request was bad". */
const CONNECTION_ERRORS = new Set([
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoTimeoutError',
  'MongoNotConnectedError',
]);

function isConnectionProblem(err: unknown): boolean {
  const e = err as { name?: string; message?: string; codeName?: string };
  if (e?.name && CONNECTION_ERRORS.has(e.name)) return true;
  if (e?.codeName === 'AtlasError') return true;
  return /MONGODB_URI|authentication failed|bad auth|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(
    String(e?.message ?? ''),
  );
}

/** Maps thrown errors to the right status without leaking driver internals. */
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return fail('Please check the highlighted fields.', 422, {
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const e = err as { code?: number; message?: string };
  if (e?.code === 11000) {
    return fail('A case with this CRN already exists in your diary.', 409);
  }

  if (err instanceof AuthConfigurationError) {
    log.error('authentication configuration is invalid', describeError(err));
    return fail(
      'Server authentication is not configured. Add a valid AUTH_SECRET in this Vercel environment and redeploy.',
      500,
    );
  }

  // A dead database is not a 500 — it is temporary, and the message should say
  // so plainly rather than sending the advocate hunting through their records.
  if (isConnectionProblem(err)) {
    log.error('database unavailable', describeError(err));
    return fail('Cannot reach the database right now. Your records are safe — please retry.', 503);
  }

  log.error('unhandled error', describeError(err));
  return fail('Something went wrong on our side. Please retry.', 500);
}

export function unauthorized() {
  return fail('Please sign in to open your diary.', 401);
}

/**
 * Every case query is scoped by this — the signed-in user's id, straight off
 * the session. Null means "not signed in".
 */
export async function requireOwnerId(): Promise<string | null> {
  return getOwnerId();
}
