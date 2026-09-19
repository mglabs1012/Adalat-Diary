'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { CaseListItem } from '@/types/case';
import { groupByDiaryDay, type DiaryDayEntry, type DiaryDayGroup } from '@/lib/data/diaryDays';
import { dayKeyFromToday, daysUntil, formatDate, relativeDay, todayKey } from '@/lib/utils/date';
import { causeTitle, caseRef } from '@/lib/utils/case';
import { cn } from '@/lib/utils/cn';
import { useCases } from '@/hooks/useCases';
import { useDiaryPdf } from '@/hooks/useDiaryPdf';
import { AppBar } from '@/components/layout/AppBar';
import { CaseCard } from '@/components/cases/CaseCard';
import { StageBadge } from '@/components/cases/StageBadge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { ExportDialog } from '@/components/cases/ExportDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import {
  ConnectedSegmentTrack,
  connectedSegmentShape,
  connectedSegmentTone,
} from '@/components/ui/ConnectedSegments';
import { WavyLoader } from '@/components/ui/WavyLoader';

type SortOrder = 'oldest' | 'newest';
type ViewMode = 'cards' | 'list';
type DateFilter = { date?: string; from?: string; to?: string };

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 250;

function validDay(value: string | null): string | undefined {
  return value && DAY_PATTERN.test(value) ? value : undefined;
}

function filterFromParams(params: { get: (name: string) => string | null }): DateFilter {
  const date = validDay(params.get('date'));

  if (date) return { date };

  return {
    from: validDay(params.get('from')),
    to: validDay(params.get('to')),
  };
}

/**
 * A compact, date-first diary.
 *
 * The page for a day holds everything that touched it, the way a paper diary
 * does: the matters listed for that day, and the matters that were before the
 * court on it and have since been adjourned onward. That is why a matter
 * written in with only a previous date appears here at all — it sits on the
 * day it was actually heard, rather than nowhere, which is what happened when
 * the diary keyed off the next date alone.
 *
 * Board links pass a date or a date range, and this screen fetches only that
 * slice rather than loading the whole diary and hiding most of it.
 */
export function DiaryScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [filter, setFilter] = useState<DateFilter>(() => filterFromParams(params));
  const [, startTransition] = useTransition();
  const { busy, shareDay } = useDiaryPdf();
  const [exportOpen, setExportOpen] = useState(false);
  const [sort, setSort] = useState<SortOrder>('oldest');
  const [view, setView] = useState<ViewMode>('cards');

  const { date, from, to } = filter;
  const isFiltered = Boolean(date || from || to);

  const listOptions = useMemo(
    () =>
      date
        ? { filter: 'range' as const, from: date, to: date, pageSize: PAGE_SIZE, keepPreviousData: false }
        : from || to
          ? { filter: 'range' as const, from, to, pageSize: PAGE_SIZE, keepPreviousData: false }
          : { filter: 'upcoming' as const, pageSize: PAGE_SIZE, keepPreviousData: false },
    [date, from, to],
  );

  const { cases: selected, isLoading: listLoading } = useCases(listOptions);
  const { cases: overdue, isLoading: overdueLoading } = useCases(
    { filter: 'overdue', pageSize: PAGE_SIZE },
    !isFiltered,
  );
  // Matters the court has not yet given a date for. They belong to no page, so
  // they get a section of their own rather than dropping out of the diary.
  const { cases: undated } = useCases({ filter: 'undated', pageSize: PAGE_SIZE }, !isFiltered);

  const groups = useMemo<DiaryDayGroup[]>(() => {
    if (isFiltered) {
      // Only the days actually asked for — a record pulled in by one of its
      // dates carries others, and those belong on their own pages.
      const window = date ? { from: date, to: date } : { from, to };
      return groupByDiaryDay(selected, window, sort);
    }
    // The unfiltered diary is a forward view: what is still to be taken up,
    // plus anything whose date has passed without being dealt with.
    const ahead = [...overdue, ...selected].filter((record) => record.nextDate);
    return groupByDiaryDay(ahead, undefined, sort).map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => entry.role === 'listed'),
    })).filter((group) => group.entries.length);
  }, [date, from, isFiltered, overdue, selected, sort, to]);

  // This screen opts out of prior-query retention, so a new date cannot show
  // records from the old date while its focused request is resolving.
  const loading = listLoading || (!isFiltered && overdueLoading);
  const filterLabel = date
    ? formatDate(date)
    : from || to
      ? `${from ? formatDate(from) : 'Earliest'} – ${to ? formatDate(to) : 'Latest'}`
      : 'All upcoming dates';

  const total = groups.reduce((n, group) => n + group.entries.length, 0);

  function replaceFilter(next: DateFilter) {
    // Update local state first. This makes controls and the data query react
    // immediately, while the URL updates in the background without scrolling.
    setFilter(next);

    const query = new URLSearchParams(params.toString());
    query.delete('date');
    query.delete('from');
    query.delete('to');
    if (next.date) query.set('date', next.date);
    else {
      if (next.from) query.set('from', next.from);
      if (next.to) query.set('to', next.to);
    }
    startTransition(() => {
      router.replace(query.size ? `${pathname}?${query.toString()}` : pathname, { scroll: false });
    });
  }

  const today = todayKey();
  const tomorrow = dayKeyFromToday(1);
  const weekEnd = dayKeyFromToday(7);

  return (
    <>
      <AppBar
        title="Diary"
        subtitle={filterLabel}
        actions={
          <>
            <Button
              size="sm"
              variant="tonal"
              icon="share"
              onClick={() => setExportOpen(true)}
              loading={busy === 'month'}
            >
              <span className="hidden sm:inline">Share PDF</span>
            </Button>
            <ButtonLink href="/cases/new" icon="add" size="sm" pill className="ml-space-xs hidden lg:inline-flex">
              New case
            </ButtonLink>
          </>
        }
      />

      <main className="page flex flex-1 flex-col gap-space-base pb-nav pt-appbar">
        <section className="card flex flex-col gap-space-sm p-space-sm sm:p-space-md">
          <div className="grid grid-cols-1 gap-space-sm lg:grid-cols-[minmax(11rem,15rem)_1fr] lg:items-end">
            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-label-sm uppercase tracking-wide text-on-surface-variant">
                Jump to date
              </span>
              <DatePicker
                ids={{ id: 'diary-jump', invalid: false }}
                value={date ?? ''}
                onChange={(value) => replaceFilter({ date: value || undefined })}
                placeholder="Any date"
                className="h-10 min-h-10 py-1.5 text-body-sm"
              />
            </label>

            <div className="flex flex-col gap-space-sm sm:flex-row sm:items-end sm:justify-between lg:justify-end lg:gap-space-md">
              <ConnectedSegmentTrack className="w-full sm:w-auto" aria-label="Quick dates">
                <FilterButton index={0} count={3} active={date === today} onClick={() => replaceFilter({ date: today })}>
                  Today
                </FilterButton>
                <FilterButton index={1} count={3} active={date === tomorrow} onClick={() => replaceFilter({ date: tomorrow })}>
                  Tomorrow
                </FilterButton>
                <FilterButton
                  index={2}
                  count={3}
                  active={from === today && to === weekEnd}
                  onClick={() => replaceFilter({ from: today, to: weekEnd })}
                >
                  Week
                </FilterButton>
              </ConnectedSegmentTrack>

              <ConnectedSegmentTrack className="w-full sm:w-auto">
                <button
                  type="button"
                  aria-label={sort === 'oldest' ? 'Sorting oldest first' : 'Sorting newest first'}
                  title={sort === 'oldest' ? 'Oldest first' : 'Newest first'}
                  onClick={() => setSort((current) => (current === 'oldest' ? 'newest' : 'oldest'))}
                  className={cn(
                    'press flex h-8 flex-1 items-center justify-center gap-1.5 px-2.5 text-label-md sm:flex-none',
                    connectedSegmentShape(false, 0, 3),
                    connectedSegmentTone(false),
                  )}
                >
                  <Icon name="sort" size={15} />
                  <span>{sort === 'oldest' ? 'Oldest' : 'Newest'}</span>
                </button>
                <ViewButton index={1} count={3} view="cards" active={view === 'cards'} onClick={() => setView('cards')} />
                <ViewButton index={2} count={3} view="list" active={view === 'list'} onClick={() => setView('list')} />
              </ConnectedSegmentTrack>
            </div>
          </div>

          {isFiltered ? (
            <div className="flex items-center justify-between gap-space-sm border-t border-on-surface/5 pt-space-sm">
              <p className="truncate text-label-md text-on-surface-variant">
                Showing <span className="text-primary">{filterLabel}</span>
                <span className="tnum"> · {total} {total === 1 ? 'entry' : 'entries'}</span>
              </p>
              <button
                type="button"
                onClick={() => replaceFilter({})}
                className="press shrink-0 rounded-full px-2.5 py-1 text-label-md text-primary hover:bg-surface-container"
              >
                Clear filter
              </button>
            </div>
          ) : null}
        </section>

        {loading ? (
          <ListSkeleton rows={4} />
        ) : groups.length ? (
          groups.map((group) => (
            <DiaryGroup
              key={group.key}
              group={group}
              view={view}
              busy={busy}
              onShare={() => void shareDay(new Date(group.date))}
            />
          ))
        ) : (
          <EmptyState
            icon={isFiltered ? 'search' : 'diary'}
            title={isFiltered ? 'Nothing on this page of the diary' : 'No dates ahead'}
            body={
              isFiltered
                ? 'No matter was listed or heard on these dates. Choose another date, or clear the filter.'
                : 'Once a case carries a next date, it lands here in chronological order.'
            }
            actionLabel={isFiltered ? 'Clear filter' : 'Add a case'}
            actionHref={isFiltered ? undefined : '/cases/new'}
            onAction={isFiltered ? () => replaceFilter({}) : undefined}
          />
        )}

        {!isFiltered && undated.length ? <UndatedSection cases={undated} view={view} /> : null}
      </main>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
}

function FilterButton({
  children,
  active,
  onClick,
  index,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  index: number;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'press h-8 flex-1 px-3 text-label-md transition-colors sm:flex-none',
        connectedSegmentShape(active, index, count),
        connectedSegmentTone(active),
      )}
    >
      {children}
    </button>
  );
}

function ViewButton({
  view,
  active,
  onClick,
  index,
  count,
}: {
  view: ViewMode;
  active: boolean;
  onClick: () => void;
  index: number;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-label={`Use ${view} view`}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'press flex h-8 w-8 items-center justify-center transition-colors',
        connectedSegmentShape(active, index, count),
        connectedSegmentTone(active),
      )}
    >
      <Icon name={view === 'cards' ? 'grid' : 'list'} size={15} />
    </button>
  );
}

function DiaryGroup({
  group,
  view,
  busy,
  onShare,
}: {
  group: DiaryDayGroup;
  view: ViewMode;
  busy: ReturnType<typeof useDiaryPdf>['busy'];
  onShare: () => void;
}) {
  const diff = daysUntil(group.date) ?? 0;
  const heard = group.entries.filter((entry) => entry.role === 'heard').length;

  return (
    /* A diary spread: from xl the date is a column of its own beside its
       matters, the way a page is headed, instead of a full-width bar with
       the share control stranded at the far edge. */
    <section className="date-stack scroll-mt-[5rem] flex flex-col gap-space-sm xl:grid xl:grid-cols-[11.5rem_minmax(0,1fr)] xl:items-start xl:gap-space-xl">
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-10 -mx-screen-margin flex items-center justify-between gap-space-sm bg-surface/94 px-screen-margin py-1.5 backdrop-blur-xl lg:top-16 lg:-mx-space-2xl lg:px-space-2xl xl:mx-0 xl:flex-col xl:items-start xl:gap-space-xs xl:bg-transparent xl:px-0 xl:py-0 xl:pt-1 xl:backdrop-blur-none">
        <div className="flex min-w-0 flex-wrap items-center gap-x-space-sm gap-y-1 xl:flex-col xl:items-start">
          <h2 className={cn('tnum font-display text-label-lg sm:text-headline-sm', diff === 0 ? 'text-secondary' : 'text-primary')}>
            {formatDate(group.date)}
          </h2>
          <span
            className={cn(
              'pill shrink-0 px-2 py-0.5 text-label-sm uppercase tracking-wide',
              diff === 0 ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant',
            )}
          >
            {relativeDay(group.date)} · {group.entries.length}
          </span>
          {heard ? (
            <span className="shrink-0 text-label-sm text-on-surface-variant/80">
              {heard} already heard
            </span>
          ) : null}
        </div>
        <button
          onClick={onShare}
          disabled={busy !== null}
          aria-label={`Share the cause list for ${formatDate(group.date)} as a PDF`}
          title="Share this day as a PDF"
          className="press flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary disabled:opacity-50 xl:-ml-2"
        >
          {busy === 'day' ? <WavyLoader size="sm" label="Building PDF" /> : <Icon name="share" size={15} />}
          <span className="hidden xl:inline">Share day</span>
        </button>
      </div>

      {view === 'cards' ? (
        <div className="grid grid-cols-1 items-stretch gap-space-sm sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {group.entries.map((entry) => (
            <CaseCard
              key={`${group.key}-${entry.record.id}`}
              record={entry.record}
              dayRole={entry.role}
              hideDateChip
              dense
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-on-surface/8 bg-surface-container-lowest shadow-e1">
          {group.entries.map((entry) => (
            <DiaryListRow key={`${group.key}-${entry.record.id}`} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Matters with no next date. In a paper diary these are the files sitting on
 * the desk waiting for the court to give a date; they have no page of their
 * own, so the diary keeps them in view at the end rather than losing them.
 */
function UndatedSection({ cases, view }: { cases: CaseListItem[]; view: ViewMode }) {
  const entries: DiaryDayEntry[] = cases.map((record) => ({ record, role: 'heard' }));

  return (
    <section className="date-stack flex flex-col gap-space-sm border-t border-on-surface/8 pt-space-md xl:grid xl:grid-cols-[11.5rem_minmax(0,1fr)] xl:items-start xl:gap-space-xl">
      <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1 xl:flex-col xl:items-start xl:pt-1">
        <h2 className="font-display text-label-lg text-primary sm:text-headline-sm">
          Awaiting a next date
        </h2>
        <span className="pill shrink-0 bg-surface-container px-2 py-0.5 text-label-sm uppercase tracking-wide text-on-surface-variant">
          {cases.length}
        </span>
        <p className="w-full text-label-md text-on-surface-variant">
          Open matters the court has not listed again. Record the date and they move onto their day.
        </p>
      </div>

      {view === 'cards' ? (
        <div className="grid grid-cols-1 items-stretch gap-space-sm sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
          {cases.map((record) => (
            <CaseCard key={record.id} record={record} hideDateChip dense />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-on-surface/8 bg-surface-container-lowest shadow-e1">
          {entries.map((entry) => (
            <DiaryListRow key={entry.record.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

function DiaryListRow({ entry }: { entry: DiaryDayEntry }) {
  const { record, role } = entry;
  return (
    <Link
      href={`/cases/${record.id}`}
      className="group flex items-center gap-space-sm border-b border-on-surface/5 px-space-sm py-2.5 last:border-b-0 hover:bg-surface-container-low"
    >
      <span className="tnum w-20 shrink-0 truncate text-label-md text-on-surface-variant sm:w-28">{caseRef(record)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-label-lg text-primary group-hover:text-primary-container">
          {causeTitle(record)}
        </span>
        <span className="block truncate text-label-md text-on-surface-variant">
          {record.court}{record.courtRoom ? ` · ${record.courtRoom}` : ''}{record.purpose ? ` · ${record.purpose}` : ''}
        </span>
      </span>
      {role === 'heard' ? (
        <span className="hidden shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant sm:inline-flex">
          {record.nextDate ? `Adjourned to ${formatDate(record.nextDate)}` : 'No next date'}
        </span>
      ) : null}
      <StageBadge stage={record.stage} className="hidden shrink-0 md:inline-flex" />
      <Icon name="chevron" size={15} className="shrink-0 text-on-surface-variant/70" />
    </Link>
  );
}
