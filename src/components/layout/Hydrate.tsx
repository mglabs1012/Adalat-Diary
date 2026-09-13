'use client';

import { SWRConfig } from 'swr';

/**
 * Seeds the SWR cache with data the server already fetched, keyed exactly as
 * the client hooks will ask for it. The screen paints real content on the
 * first frame and SWR revalidates quietly underneath — no skeleton flash, no
 * request waterfall.
 */
export function Hydrate({
  fallback,
  children,
}: {
  fallback: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
