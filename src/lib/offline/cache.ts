import { get, set } from 'idb-keyval';
import type { CaseListItem, DiaryStats } from '@/types/case';

/**
 * Last-known-good snapshot so the Board and Docket render instantly on cold
 * start and keep working with the radio off. SWR revalidates over the top.
 */
const CASES_KEY = 'snapshot:cases';
const STATS_KEY = 'snapshot:stats';

interface Snapshot<T> {
  data: T;
  savedAt: number;
}

export async function saveCases(key: string, items: CaseListItem[]): Promise<void> {
  try {
    await set(`${CASES_KEY}:${key}`, { data: items, savedAt: Date.now() } satisfies Snapshot<CaseListItem[]>);
  } catch {
    /* quota or private mode - the network path still works */
  }
}

export async function readCases(key: string): Promise<CaseListItem[] | null> {
  try {
    const snap = await get<Snapshot<CaseListItem[]>>(`${CASES_KEY}:${key}`);
    return snap?.data ?? null;
  } catch {
    return null;
  }
}

export async function saveStats(stats: DiaryStats): Promise<void> {
  try {
    await set(STATS_KEY, { data: stats, savedAt: Date.now() } satisfies Snapshot<DiaryStats>);
  } catch {
    /* ignore */
  }
}

export async function readStats(): Promise<DiaryStats | null> {
  try {
    const snap = await get<Snapshot<DiaryStats>>(STATS_KEY);
    return snap?.data ?? null;
  } catch {
    return null;
  }
}
