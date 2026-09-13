'use client';

import { createContext, useContext } from 'react';

export interface ClientSession {
  id: string;
  username: string;
}

const SessionContext = createContext<ClientSession | null>(null);

/**
 * The session is already resolved in the (app) server layout, so it is handed
 * down through context rather than re-fetched from /api/auth/me on the client.
 * One fewer request on every cold start.
 */
export function SessionProvider({
  session,
  children,
}: {
  session: ClientSession;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): ClientSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession must be used inside the signed-in layout');
  return session;
}
