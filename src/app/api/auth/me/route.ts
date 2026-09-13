import { getSession } from '@/lib/auth/server';
import { fail, ok } from '@/lib/utils/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return fail('Not signed in.', 401);

  return ok(
    { username: session.username, id: session.sub },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
