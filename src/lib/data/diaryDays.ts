import { diaryDayKey } from '@/lib/utils/date';
import type { CaseListItem } from '@/types/case';

/**
 * Turning a flat list of matters into pages of a diary.
 *
 * One matter can appear on several pages — the day it was heard and the day
 * it is next listed are both real entries — so grouping is a fan-out, not a
 * partition. Both the diary screen and the PDF exports group through here, so
 * a shared cause list can never disagree with what is on screen.
 */

export type DiaryRole =
  /** Its next date falls on this day: still to be taken up. */
  | 'listed'
  /** It was before the court on this day and has since moved on. */
  | 'heard';

export interface DiaryDayEntry {
  record: CaseListItem;
  role: DiaryRole;
}

export interface DiaryDayGroup {
  /** yyyy-MM-dd */
  key: string;
  /** ISO midnight for the same day, for formatting. */
  date: string;
  entries: DiaryDayEntry[];
}

export interface DiaryWindow {
  /** yyyy-MM-dd, inclusive. */
  from?: string;
  to?: string;
}

/**
 * Every diary day a record occupies. Falls back to its two dates for a record
 * that predates the stored array — an offline cache written by an older
 * build, for instance.
 */
export function daysOf(record: CaseListItem): string[] {
  const stored = record.hearingDates;
  if (stored?.length) return [...new Set(stored.map((d) => d.slice(0, 10)))];
  return [...new Set([diaryDayKey(record.preDate), diaryDayKey(record.nextDate)])].filter(Boolean);
}

function inWindow(key: string, window?: DiaryWindow): boolean {
  if (!window) return true;
  if (window.from && key < window.from) return false;
  if (window.to && key > window.to) return false;
  return true;
}

/** Listed matters lead the page, then pinned ones, then by court and cause. */
function compare(a: DiaryDayEntry, b: DiaryDayEntry): number {
  if (a.role !== b.role) return a.role === 'listed' ? -1 : 1;
  if (a.record.pinned !== b.record.pinned) return a.record.pinned ? -1 : 1;
  const court = a.record.court.localeCompare(b.record.court);
  if (court) return court;
  return a.record.party1.localeCompare(b.record.party1);
}

export function groupByDiaryDay(
  cases: readonly CaseListItem[],
  window?: DiaryWindow,
  order: 'oldest' | 'newest' = 'oldest',
): DiaryDayGroup[] {
  const map = new Map<string, DiaryDayGroup>();

  for (const record of cases) {
    const listedKey = diaryDayKey(record.nextDate);
    for (const key of daysOf(record)) {
      if (!inWindow(key, window)) continue;
      const group = map.get(key) ?? { key, date: `${key}T00:00:00.000Z`, entries: [] };
      group.entries.push({ record, role: key === listedKey ? 'listed' : 'heard' });
      map.set(key, group);
    }
  }

  const direction = order === 'oldest' ? 1 : -1;
  return [...map.values()]
    .map((group) => ({ ...group, entries: group.entries.sort(compare) }))
    .sort((a, b) => direction * a.key.localeCompare(b.key));
}

/** Convenience for callers that only need the records on each day. */
export function casesOf(group: DiaryDayGroup): CaseListItem[] {
  return group.entries.map((entry) => entry.record);
}
