import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { ok } from '@/lib/utils/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { path: '/', maxAge: 0, httpOnly: true });
  return ok({ signedOut: true });
}
