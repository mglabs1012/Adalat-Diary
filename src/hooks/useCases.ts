'use client';

import { useEffect, useMemo } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { fetcher } from '@/lib/api/client';
import { readCases, saveCases } from '@/lib/offline/cache';
import { caseKey, casesKey, type CasesKeyOptions } from '@/lib/api/keys';
import type { CaseListItem, CaseListResponse, CaseRecord } from '@/types/case';

export type UseCasesOptions = CasesKeyOptions;


export { casesKey };

function isDiaryKey(key: unknown): key is string {
  return typeof key === 'string' && (key.startsWith('/api/cases') || key === '/api/stats');
}

function toListItem(record: CaseRecord): CaseListItem {
  return {
    id: record.id,
    crn: record.crn,
    caseNo: record.caseNo,
    court: record.court,
    courtRoom: record.courtRoom,
    party1: record.party1,
    party2: record.party2,
    stage: record.stage,
    preDate: record.preDate,
    nextDate: record.nextDate,
    purpose: record.purpose,
    pinned: record.pinned,
    status: record.status,
  };
}

export function useCases(opts: UseCasesOptions = {}) {
  const key = casesKey(opts);

  const { data, error, isLoading, mutate } = useSWR<CaseListResponse>(key, fetcher, {
    // Server Components already seeded the first paint. Do not immediately
    // request the exact same list again after hydration.
    revalidateIfStale: false,
    revalidateOnFocus: false,
    keepPreviousData: true,
    dedupingInterval: 12_000,
    errorRetryCount: 2,
    // An offline cold start reads IndexedDB below instead of spending time on
    // a request that cannot complete.
    isPaused: () => typeof navigator !== 'undefined' && !navigator.onLine,
  });

  // Mirror every successful page into IndexedDB so a cold, offline start
  // still shows the docket instead of an empty screen.
  useEffect(() => {
    if (data?.items) void saveCases(key, data.items);
  }, [data, key]);

  // Offline fallback: hydrate from IndexedDB immediately on a cold start,
  // rather than waiting for the network request to fail first.
  useEffect(() => {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (data || (!error && !offline)) return;
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

  const items = useMemo<CaseListItem[]>(() => data?.items ?? [], [data]);

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
  return globalMutate(isDiaryKey, undefined, { revalidate: true });
}

/**
 * Paint a successful write into every cached view immediately. The eventual
 * revalidation remains the source of truth, but navigation no longer waits
 * for every board/docket/diary request to complete.
 */
export async function updateCachedCase(record: CaseRecord): Promise<void> {
  const item = toListItem(record);
  await Promise.all([
    globalMutate(caseKey(record.id), record, { revalidate: false }),
    globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/api/cases?'),
      (current?: CaseListResponse) => {
        if (!current?.items.some((existing) => existing.id === record.id)) return current;
        return {
          ...current,
          items: current.items.map((existing) => (existing.id === record.id ? item : existing)),
        };
      },
      { revalidate: false },
    ),
  ]);
}

/** Remove a deleted record without making the docket flash stale content. */
export async function removeCachedCase(id: string): Promise<void> {
  await Promise.all([
    globalMutate(caseKey(id), undefined, { revalidate: false }),
    globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/api/cases?'),
      (current?: CaseListResponse) => {
        if (!current?.items.some((record) => record.id === id)) return current;
        return {
          ...current,
          items: current.items.filter((record) => record.id !== id),
          total: Math.max(0, current.total - 1),
        };
      },
      { revalidate: false },
    ),
  ]);
}
