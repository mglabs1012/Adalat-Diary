import 'server-only';
import { describeError, logger } from '@/lib/utils/logger';

const log = logger('prefetch');

export type Prefetched<T> = { ok: true; data: T } | { ok: false };

/**
 * Server-side prefetch that is allowed to fail.
 *
 * Seeding the SWR cache is an optimisation, not a requirement — if the database
 * hiccups we log it and render the screen without a fallback, and the client
 * retries on its own. A transient blip should not replace the whole board with
 * an error page. Callers that must distinguish "missing" from "unreachable"
 * (the case detail 404, say) can read the `ok` flag.
 */
export async function prefetch<T>(label: string, run: () => Promise<T>): Promise<Prefetched<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (err) {
    log.warn(`${label} prefetch failed — the client will retry`, describeError(err));
    return { ok: false };
  }
}
