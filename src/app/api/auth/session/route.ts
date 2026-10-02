import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

/** Verify that this browser accepted the cookie before leaving the auth form. */
export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    { signedIn: Boolean(session) },
    { status: session ? 200 : 401, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
