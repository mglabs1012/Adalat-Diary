import { cookies } from 'next/headers';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { ok } from '@/lib/utils/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { ...sessionCookieOptions(), maxAge: 0 });
  return ok({ signedOut: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
