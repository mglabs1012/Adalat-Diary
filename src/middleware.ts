import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

const PUBLIC_PAGES = new Set(['/login', '/signup', '/offline']);

/**
 * Runs on the edge before every page request. Verifying the JWT here means an
 * unauthenticated visitor never reaches a screen that would fetch case data —
 * no flash of an empty docket, no wasted database round trip.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PAGES.has(pathname);

  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    // Remember where they were headed so login can return them there.
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (session && (pathname === '/login' || pathname === '/signup')) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Pages only. API routes check the session themselves (they must return 401
   * JSON, not a redirect), and static assets, the manifest and the service
   * worker have to stay reachable while signed out.
   */
  matcher: [
    '/((?!api|_next/static|_next/image|icons|manifest.webmanifest|sw.js|robots.txt|favicon.ico).*)',
  ],
};
