'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { CaseListItem } from '@/types/case';
import { addDays, daysUntil, formatDate, relativeDay, toInputDate } from '@/lib/utils/date';
import { causeTitle, caseRef } from '@/lib/utils/case';
import { cn } from '@/lib/utils/cn';
import { useCases } from '@/hooks/useCases';
import { useDiaryPdf } from '@/hooks/useDiaryPdf';
import { AppBar } from '@/components/layout/AppBar';
import { CaseCard } from '@/components/cases/CaseCard';
import { StageBadge } from '@/components/cases/StageBadge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ExportDialog } from '@/components/cases/ExportDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { WavyLoader } from '@/components/ui/WavyLoader';

interface DayGroup {
  key: string;
  date: string;
  cases: CaseListItem[];
}

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
 * A compact, date-first diary. Board links pass a date or a date range here,
 * and this screen fetches only that slice rather than loading the entire diary
 * and hiding most of it in the browser.
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

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    const source = isFiltered ? selected : [...overdue, ...selected];

    for (const record of source) {
      if (!record.nextDate) continue;
      const key = record.nextDate.slice(0, 10);
      const group = map.get(key) ?? { key, date: record.nextDate, cases: [] };
      group.cases.push(record);
      map.set(key, group);
    }

    const direction = sort === 'oldest' ? 1 : -1;
    return [...map.values()].sort((a, b) => direction * a.key.localeCompare(b.key));
  }, [isFiltered, overdue, selected, sort]);

  // This screen opts out of prior-query retention, so a new date cannot show
  // records from the old date while its focused request is resolving.
  const loading = listLoading || (!isFiltered && overdueLoading);
  const filterLabel = date
    ? formatDate(date)
    : from || to
      ? `${from ? formatDate(from) : 'Earliest'} – ${to ? formatDate(to) : 'Latest'}`
      : 'All upcoming dates';

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

  const today = toInputDate(new Date());
  const tomorrow = toInputDate(addDays(new Date(), 1));
  const weekEnd = toInputDate(addDays(new Date(), 7));

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
          <div className="grid grid-cols-1 gap-space-sm xl:grid-cols-[minmax(12rem,1fr)_auto] xl:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-label-sm uppercase tracking-wide text-on-surface-variant">Jump to date</span>
              <input
                type="date"
                value={date ?? ''}
                onChange={(event) => replaceFilter({ date: event.target.value || undefined })}
                className="field field-date h-10 min-h-10 py-1.5 text-body-sm"
              />
            </label>

            <div className="flex flex-col gap-space-sm sm:flex-row sm:items-end sm:justify-between xl:justify-end">
              <div className="flex w-full items-center gap-1 rounded bg-surface-container p-1 sm:w-auto" aria-label="Quick dates">
                <FilterButton active={date === today} onClick={() => replaceFilter({ date: today })}>
                  Today
                </FilterButton>
                <FilterButton active={date === tomorrow} onClick={() => replaceFilter({ date: tomorrow })}>
                  Tomorrow
                </FilterButton>
                <FilterButton
                  active={from === today && to === weekEnd}
                  onClick={() => replaceFilter({ from: today, to: weekEnd })}
                >
                  Week
                </FilterButton>
              </div>

              <div className="flex w-full items-center gap-1 rounded bg-surface-container p-1 sm:w-auto">
                <button
                  type="button"
                  aria-label={sort === 'oldest' ? 'Sorting oldest first' : 'Sorting newest first'}
                  title={sort === 'oldest' ? 'Oldest first' : 'Newest first'}
                  onClick={() => setSort((current) => (current === 'oldest' ? 'newest' : 'oldest'))}
                  className="press flex h-8 flex-1 items-center justify-center gap-1.5 rounded px-2 text-label-md text-on-surface-variant hover:bg-surface-container-lowest hover:text-primary sm:flex-none"
                >
                  <Icon name="sort" size={15} />
                  <span>{sort === 'oldest' ? 'Oldest' : 'Newest'}</span>
                </button>
                <span className="h-5 w-px bg-on-surface/10" />
                <ViewButton view="cards" active={view === 'cards'} onClick={() => setView('cards')} />
                <ViewButton view="list" active={view === 'list'} onClick={() => setView('list')} />
              </div>
            </div>
          </div>

          {isFiltered ? (
            <div className="flex items-center justify-between gap-space-sm border-t border-on-surface/5 pt-space-sm">
              <p className="truncate text-label-md text-on-surface-variant">
                Showing <span className="text-primary">{filterLabel}</span>
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
            title={isFiltered ? 'No matters on these dates' : 'No dates ahead'}
            body={
              isFiltered
                ? 'Choose another date or clear the filter to see your full diary.'
                : 'Once a case carries a next date, it lands here in chronological order.'
            }
            actionLabel={isFiltered ? 'Clear filter' : 'Add a case'}
            actionHref={isFiltered ? undefined : '/cases/new'}
            onAction={isFiltered ? () => replaceFilter({}) : undefined}
          />
        )}
      </main>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
}

function FilterButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'press h-8 rounded px-2.5 text-label-md transition-colors',
        active ? 'bg-surface-container-lowest text-primary shadow-e1' : 'text-on-surface-variant hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

function ViewButton({ view, active, onClick }: { view: ViewMode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Use ${view} view`}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'press flex h-8 w-8 items-center justify-center rounded transition-colors',
        active ? 'bg-surface-container-lowest text-primary shadow-e1' : 'text-on-surface-variant hover:text-primary',
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
  group: DayGroup;
  view: ViewMode;
  busy: ReturnType<typeof useDiaryPdf>['busy'];
  onShare: () => void;
}) {
  const diff = daysUntil(group.date) ?? 0;
  return (
    <section className="date-stack scroll-mt-[5rem] flex flex-col gap-space-sm">
      <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-10 -mx-screen-margin flex items-center justify-between gap-space-sm bg-surface/94 px-screen-margin py-1.5 backdrop-blur-xl lg:top-16 lg:-mx-space-2xl lg:px-space-2xl">
        <div className="flex min-w-0 items-center gap-space-sm">
          <h2 className={cn('tnum font-display text-label-lg sm:text-headline-sm', diff === 0 ? 'text-secondary' : 'text-primary')}>
            {formatDate(group.date)}
          </h2>
          <span
            className={cn(
              'pill shrink-0 px-2 py-0.5 text-label-sm uppercase tracking-wide',
              diff === 0 ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant',
            )}
          >
            {relativeDay(group.date)} · {group.cases.length}
          </span>
        </div>
        <button
          onClick={onShare}
          disabled={busy !== null}
          aria-label={`Share the cause list for ${formatDate(group.date)} as a PDF`}
          title="Share this day as a PDF"
          className="press flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary disabled:opacity-50"
        >
          {busy === 'day' ? <WavyLoader size="sm" label="Building PDF" /> : <Icon name="share" size={15} />}
        </button>
      </div>

      {view === 'cards' ? (
        <div className="grid grid-cols-1 items-stretch gap-space-sm xl:grid-cols-2">
          {group.cases.map((record) => (
            <CaseCard key={record.id} record={record} hideDateChip dense />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-on-surface/8 bg-surface-container-lowest shadow-e1">
          {group.cases.map((record) => (
            <DiaryListRow key={record.id} record={record} />
          ))}
        </div>
      )}
    </section>
  );
}

function DiaryListRow({ record }: { record: CaseListItem }) {
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
      <StageBadge stage={record.stage} className="hidden shrink-0 sm:inline-flex" />
      <Icon name="chevron" size={15} className="shrink-0 text-on-surface-variant/70" />
    </Link>
  );
}
