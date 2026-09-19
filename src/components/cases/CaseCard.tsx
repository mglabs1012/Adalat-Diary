'use client';

import Link from 'next/link';
import { memo } from 'react';
import type { DiaryRole } from '@/lib/data/diaryDays';
import type { CaseListItem } from '@/types/case';
import { caseRef, causeTitle } from '@/lib/utils/case';
import { formatDate, relativeDay, urgencyOf } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { shareCaseText } from '@/hooks/useDiaryPdf';
import { Icon } from '@/components/ui/Icon';
import { DateChip } from './DateChip';
import { StageBadge } from './StageBadge';

interface CaseCardProps {
  record: CaseListItem;
  /**
   * How this matter relates to the diary page it is being shown on: still to
   * be taken up that day, or heard on it and since moved on. Only the diary
   * passes it — everywhere else a card stands on its own.
   */
  dayRole?: DiaryRole;
  /** The diary already groups by date, so the calendar tile is redundant there. */
  hideDateChip?: boolean;
  /** Denser variant for sidebars and secondary columns. */
  compact?: boolean;
  /** Keeps all case information visible while fitting more records per screen. */
  dense?: boolean;
}

/**
 * Three-zone docket card: header (CRN + stage), body (cause title + forum),
 * footer (next date against previous date).
 *
 * The card is an <article> with a full-bleed link overlay rather than one big
 * <a>: that keeps the whole surface clickable while still allowing a real
 * share button inside it, which nesting a button in an anchor would not.
 * Memoised — a long docket re-renders on every keystroke in the search box.
 */
export const CaseCard = memo(function CaseCard({
  record,
  dayRole,
  hideDateChip,
  compact,
  dense,
}: CaseCardProps) {
  const urgency = urgencyOf(record.nextDate);
  const isDisposed = record.status === 'disposed';
  const compactLayout = compact || dense;
  // On a diary page, a matter already heard is history: it should not wear the
  // same urgency colours as one still waiting to be called.
  const settled = dayRole === 'heard';
  const awaitingDate = !isDisposed && !record.nextDate;

  return (
    <article
      className={cn(
        'card group relative flex h-full overflow-hidden transition-shadow focus-within:shadow-e2 hover:shadow-e2',
        dense
          ? 'h-[9.5rem] gap-space-sm p-space-sm'
          : compact
            ? 'h-[10rem] gap-space-md p-space-md'
            : 'h-[11rem] gap-space-md p-space-base',
      )}
    >
{/* A coloured edge marks what needs attention, without adding a badge. */}
      {!isDisposed && !settled && urgency === 'today' ? (
        <span className="absolute inset-y-0 left-0 w-1.5 bg-secondary-container" aria-hidden />
      ) : null}
      {!isDisposed && !settled && urgency === 'overdue' ? (
        <span className="absolute inset-y-0 left-0 w-1.5 bg-error" aria-hidden />
      ) : null}
      {awaitingDate && !settled ? (
        <span className="absolute inset-y-0 left-0 w-1.5 bg-outline/50" aria-hidden />
      ) : null}

      {hideDateChip ? null : <DateChip date={record.nextDate} className="mt-0.5 shrink-0" />}

      <div className={cn('flex min-w-0 flex-1 flex-col justify-between gap-space-xs', dense && 'gap-1')}>
        <div className="flex items-start justify-between gap-space-sm">
          <span
            className={cn(
              'tnum truncate rounded bg-surface-container px-1.5 py-0.5 text-[13px] font-medium tracking-[0.05em]',
              record.crn ? 'text-on-surface-variant' : 'text-on-surface-variant/60 italic',
            )}
          >
            {caseRef(record)}
          </span>
          <div className="flex flex-shrink-0 items-center gap-space-xxs">
            {settled ? (
              <span className="rounded-full bg-surface-container px-1.5 py-0.5 text-label-sm uppercase tracking-wide text-on-surface-variant">
                Heard
              </span>
            ) : null}
            {record.pinned ? (
              <Icon name="pin" size={14} className="text-secondary" aria-label="Pinned" />
            ) : null}
            {record._pending ? (
              <Icon name="sync" size={13} className="text-on-surface-variant" aria-label="Waiting to sync" />
            ) : null}
            <StageBadge stage={record.stage} />
          </div>
        </div>

        <h3
          className={cn(
            'font-display text-primary transition-colors group-hover:text-primary-container',
            compactLayout ? 'line-clamp-2 text-label-lg' : 'line-clamp-2 text-headline-sm',
          )}
        >
          {/* The overlay sits on the title so the accessible name is right. */}
          <Link href={`/cases/${record.id}`} className="after:absolute after:inset-0 after:content-['']">
            {causeTitle(record)}
          </Link>
        </h3>

        <div className="flex items-center gap-space-xs text-on-surface-variant">
          <Icon name="courthouse" size={14} className="shrink-0" />
          <span className={cn('truncate', dense ? 'text-label-md' : 'text-body-sm')}>
            {record.court}
            {record.courtRoom ? ` · ${record.courtRoom}` : ''}
          </span>
        </div>

        <div className={cn('mt-space-xxs flex items-center justify-between gap-space-sm border-t border-on-surface/5 pt-space-xs', dense && 'pt-1')}>
          <span
            className={cn(
              'inline-flex min-w-0 items-center gap-1 truncate text-label-md',
              (isDisposed || settled) && 'text-on-surface-variant',
              !isDisposed && !settled && awaitingDate && 'text-on-surface-variant',
              !isDisposed && !settled && urgency === 'overdue' && 'text-error',
              !isDisposed && !settled && urgency === 'today' && 'text-secondary',
              !isDisposed && !settled && (urgency === 'soon' || urgency === 'later') &&
                'text-on-surface-variant',
            )}
          >
            <Icon
              name={isDisposed ? 'check' : awaitingDate ? 'alert' : settled ? 'arrowRight' : 'clock'}
              size={13}
              className="shrink-0"
            />
            {isDisposed
              ? 'Disposed'
              : awaitingDate
                ? 'Next date awaited'
                : settled
                  ? `Adjourned to ${formatDate(record.nextDate)}`
                  : relativeDay(record.nextDate)}
          </span>

          <div className="flex items-center gap-space-sm">
            {compactLayout || settled ? null : (
              <span className="tnum truncate text-label-md text-on-surface-variant">
                Prev: {formatDate(record.preDate)}
              </span>
            )}
            {/* Above the overlay, so it shares instead of navigating. */}
            <button
              onClick={() => void shareCaseText(record)}
              aria-label={`Share ${caseRef(record)}`}
              title="Share this matter"
              className="press relative z-10 -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            >
              <Icon name="share" size={15} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});
