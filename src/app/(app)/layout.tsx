import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/server';
import { connectDB } from '@/lib/db/mongodb';
import { UserModel } from '@/lib/models/User';
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

  // One projected read for the avatar. Resolving it here rather than fetching
  // from the client means the header never flashes an empty circle, and the
  // JWT stays small — an image has no business in a cookie.
  let avatar: string | null = null;
  try {
    await connectDB();
    const user = await UserModel.findById(session.sub).select('avatar').lean().exec();
    avatar = user?.avatar ?? null;
  } catch {
    // A picture is not worth failing the whole shell over.
  }

  return (
    <SessionProvider session={{ id: session.sub, username: session.username, avatar }}>
      <SyncProvider>
        <AppShell>{children}</AppShell>
      </SyncProvider>
    </SessionProvider>
  );
}
