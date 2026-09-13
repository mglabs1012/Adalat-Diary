import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession, type SessionPayload } from './session';

/**
 * Reads the session in a Server Component or Route Handler.
 * Node runtime only — middleware verifies the same token on the edge.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** The owner id every case query is scoped by. Null means "not signed in". */
export async function getOwnerId(): Promise<string | null> {
  return (await getSession())?.sub ?? null;
}
