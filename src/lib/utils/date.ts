const MS_DAY = 86_400_000;

/**
 * The diary's own calendar.
 *
 * A court diary has exactly one timezone — the court's — and every page in it
 * is a day in that zone.  Pinning it makes "today" mean the same thing in a
 * Server Component running in UTC on Vercel, in a serverless API route, and
 * on the phone in the advocate's hand, which is the only way the board, the
 * diary and a shared PDF can agree on what is listed today.
 */
export const DIARY_TIME_ZONE = process.env.NEXT_PUBLIC_DIARY_TIME_ZONE || 'Asia/Kolkata';

// 'en-CA' formats as yyyy-MM-dd, which is the shape the whole app keys on.
const DIARY_DAY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: DIARY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Floors a value to the start of its calendar day in UTC.
 *
 * UTC, not local: a date typed as `2026-09-10` is stored by the validator as
 * `2026-09-10T00:00:00.000Z`, so flooring in UTC keeps a derived day
 * byte-identical to one the user entered directly — on a laptop in Ajmer and
 * on a function in Washington alike.
 */
export function toDiaryDay(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** `yyyy-MM-dd` for a stored diary day — the key both server and client group by. */
export function diaryDayKey(value: Date | string | null | undefined): string {
  const day = toDiaryDay(value);
  return day ? day.toISOString().slice(0, 10) : '';
}

/** Today's page in the diary, as `yyyy-MM-dd`. */
export function todayKey(now: Date = new Date()): string {
  return DIARY_DAY_FMT.format(now);
}

/** Today's page, as the UTC midnight the records are stored at. */
export function diaryToday(now: Date = new Date()): Date {
  return new Date(`${todayKey(now)}T00:00:00.000Z`);
}

/** `yyyy-MM-dd` for a day offset from today, in the diary's calendar. */
export function dayKeyFromToday(offset: number, now: Date = new Date()): string {
  return new Date(diaryToday(now).getTime() + offset * MS_DAY).toISOString().slice(0, 10);
}

/** Local midnight — all diary comparisons are day-level, never instant-level. */
export function startOfDay(d: Date | string = new Date()): Date {
  const date = typeof d === 'string' ? new Date(d) : new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date | string, days: number): Date {
  const date = startOfDay(d);
  date.setDate(date.getDate() + days);
  return date;
}

export function endOfDay(d: Date | string = new Date()): Date {
  const date = startOfDay(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

/** `yyyy-MM-dd` in local time — what <input type="date"> expects. */
export function toInputDate(d?: Date | string | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
}

const DAY_FMT = new Intl.DateTimeFormat('en-IN', { day: '2-digit' });
const MON_FMT = new Intl.DateTimeFormat('en-IN', { month: 'short' });
const FULL_FMT = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const LONG_FMT = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function formatDate(d?: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? '—' : FULL_FMT.format(date);
}

export function formatLongDate(d: Date | string = new Date()): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return LONG_FMT.format(date);
}

/** Calendar chip: { day: "14", month: "OCT" }. */
export function dateChip(d?: Date | string | null): { day: string; month: string } | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return { day: DAY_FMT.format(date), month: MON_FMT.format(date).toUpperCase() };
}

export function daysUntil(d?: Date | string | null): number | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return Math.round((startOfDay(date).getTime() - startOfDay().getTime()) / MS_DAY);
}

/** "Today", "Tomorrow", "in 4 days", "5 days overdue". */
export function relativeDay(d?: Date | string | null): string {
  const diff = daysUntil(d);
  if (diff === null) return 'No date';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export type DateUrgency = 'today' | 'soon' | 'later' | 'overdue' | 'none';

export function urgencyOf(d?: Date | string | null): DateUrgency {
  const diff = daysUntil(d);
  if (diff === null) return 'none';
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'soon';
  return 'later';
}
