'use client';

import { usePathname } from 'next/navigation';

/**
 * A deliberately short route entrance. Data is kept in SWR while the new
 * segment arrives, so this softens navigation without hiding useful content
 * behind a long animation.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-enter flex min-h-[100dvh] flex-1 flex-col">
      {children}
    </div>
  );
}
