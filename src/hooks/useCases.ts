'use client';

import { useEffect, useMemo } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { fetcher } from '@/lib/api/client';
import { readCases, saveCases } from '@/lib/offline/cache';
import { casesKey, type CasesKeyOptions } from '@/lib/api/keys';
import type { CaseListResponse, CaseRecord } from '@/types/case';

export type UseCasesOptions = CasesKeyOptions;


export { casesKey };

export function useCases(opts: UseCasesOptions = {}) {
  const key = casesKey(opts);

  const { data, error, isLoading, mutate } = useSWR<CaseListResponse>(key, fetcher, {
    revalidateOnFocus: true,
    keepPreviousData: true,
    dedupingInterval: 4000,
    errorRetryCount: 2,
  });

  // Mirror every successful page into IndexedDB so a cold, offline start
  // still shows the docket instead of an empty screen.
  useEffect(() => {
    if (data?.items) void saveCases(key, data.items);
  }, [data, key]);

  // Offline fallback: hydrate from the last snapshot when the fetch failed.
  useEffect(() => {
    if (!error || data) return;
    let cancelled = false;
    void readCases(key).then((items) => {
      if (!cancelled && items) {
        void mutate(
          { items, total: items.length, page: 1, pageSize: items.length, hasMore: false },
          { revalidate: false },
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [error, data, key, mutate]);

  const items = useMemo<CaseRecord[]>(() => data?.items ?? [], [data]);

  return {
    cases: items,
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading: isLoading && !data,
    isOfflineData: Boolean(error && data),
    error,
    mutate,
  };
}

/** Invalidate every cases/stats key after a write. */
export function revalidateDiary() {
  return globalMutate(
    (key) => typeof key === 'string' && (key.startsWith('/api/cases') || key.startsWith('/api/stats')),
    undefined,
    { revalidate: true },
  );
}
