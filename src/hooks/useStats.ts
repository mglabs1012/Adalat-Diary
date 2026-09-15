'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api/client';
import { readStats, saveStats } from '@/lib/offline/cache';
import type { DiaryStats } from '@/types/case';

const ZERO: DiaryStats = { today: 0, tomorrow: 0, thisWeek: 0, active: 0, overdue: 0, disposed: 0 };

export function useStats() {
  const { data, error, isLoading, mutate } = useSWR<DiaryStats>('/api/stats', fetcher, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    isPaused: () => typeof navigator !== 'undefined' && !navigator.onLine,
  });

  useEffect(() => {
    if (data) void saveStats(data);
  }, [data]);

  useEffect(() => {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (data || (!error && !offline)) return;
    void readStats().then((cached) => {
      if (cached) void mutate(cached, { revalidate: false });
    });
  }, [error, data, mutate]);

  return { stats: data ?? ZERO, isLoading: isLoading && !data, error };
}
