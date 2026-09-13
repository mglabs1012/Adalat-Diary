import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
import { AppShell } from '@/components/layout/AppShell';
import { SessionProvider } from '@/components/layout/SessionProvider';
import { SyncProvider } from '@/components/layout/SyncProvider';

/**
 * The signed-in shell. Middleware already redirects unauthenticated requests;
 * this second check means a screen can never render against a missing session
 * if that matcher is ever loosened.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <SessionProvider session={{ id: session.sub, username: session.username }}>
      <SyncProvider>
        <AppShell>{children}</AppShell>
      </SyncProvider>
    </SessionProvider>
  );
}
