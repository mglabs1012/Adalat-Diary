import { toDiaryDay } from '@/lib/utils/date';

/**
 * Which days a matter occupies in the diary.
 *
 * A paper diary is a book of dates, not a list of files: a matter is written
 * on the page for the day it is before the court, and it stays on that page
 * for good. The app used to key everything off `nextDate` alone, so a matter
 * entered with only a previous date — the common case when a register is
 * being copied in, or when the court has not yet given the next date — sat on
 * no page at all and was invisible on both the board and the diary.
 *
 * `hearingDates` fixes that by deriving, from the record itself, every day the
 * matter belongs on: the day it was last heard, the day it is next listed, and
 * every day already in its procedural history. It is a plain array so Mongo
 * can index it multikey — one lookup answers "what is in the diary on this
 * day", whichever of the three put it there.
 *
 * Every date here comes from the user. Nothing is inferred from the clock:
 * chamber work happens at odd hours, and a matter written up at 1 a.m. belongs
 * on the day it was heard, not on the day the app happened to be open.
 */

export interface HearingDateSource {
  preDate?: Date | string | null;
  nextDate?: Date | string | null;
  history?: readonly { date?: Date | string | null }[] | null;
}

/** Every day this record belongs on, de-duplicated and in chronological order. */
export function computeHearingDates(source: HearingDateSource): Date[] {
  const seen = new Map<number, Date>();

  const add = (value: Date | string | null | undefined) => {
    const day = toDiaryDay(value);
    if (day) seen.set(day.getTime(), day);
  };

  add(source.preDate);
  add(source.nextDate);
  for (const entry of source.history ?? []) add(entry?.date);

  return [...seen.values()].sort((a, b) => a.getTime() - b.getTime());
}
