import type { CaseFilter } from '@/types/case';

export interface CasesKeyOptions {
  filter?: CaseFilter;
  q?: string;
  stage?: string;
  page?: number;
  pageSize?: number;
}

export const STATS_KEY = '/api/stats';

/**
 * The SWR cache key for a case list, and the URL that satisfies it.
 *
 * Lives outside the client hooks so a Server Component can compute the same
 * key and seed the cache with data it already has — no waterfall on first
 * paint. Parameters are written in a fixed order so identical queries always
 * produce identical keys.
 */
export function casesKey(opts: CasesKeyOptions = {}): string {
  const params = new URLSearchParams();
  params.set('filter', opts.filter ?? 'all');
  if (opts.q) params.set('q', opts.q);
  if (opts.stage) params.set('stage', opts.stage);
  params.set('page', String(opts.page ?? 1));
  params.set('pageSize', String(opts.pageSize ?? 20));
  return `/api/cases?${params.toString()}`;
}

export const caseKey = (id: string) => `/api/cases/${id}`;
