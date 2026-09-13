'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api/client';
import type { CaseRecord } from '@/types/case';

export function useCase(id?: string, fallbackData?: CaseRecord) {
  const { data, error, isLoading, mutate } = useSWR<CaseRecord>(
    id ? `/api/cases/${id}` : null,
    fetcher,
    { fallbackData, revalidateOnFocus: true, dedupingInterval: 3000 },
  );

  return { record: data, error, isLoading: isLoading && !data, mutate };
}
