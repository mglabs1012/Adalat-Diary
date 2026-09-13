const MS_DAY = 86_400_000;

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
