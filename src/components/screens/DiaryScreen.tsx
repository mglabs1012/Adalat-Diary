'use client';

import { useMemo, useState } from 'react';
import type { CaseListItem } from '@/types/case';
import { daysUntil, formatDate, relativeDay } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { useCases } from '@/hooks/useCases';
import { useDiaryPdf } from '@/hooks/useDiaryPdf';
import { AppBar } from '@/components/layout/AppBar';
import { CaseCard } from '@/components/cases/CaseCard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ExportDialog } from '@/components/cases/ExportDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';

interface DayGroup {
  key: string;
  date: string;
  cases: CaseListItem[];
}

/** Chronological cause list: every upcoming date, grouped, overdue on top. */
export function DiaryScreen() {
  const { busy, shareDay } = useDiaryPdf();
  const [exportOpen, setExportOpen] = useState(false);
  const { cases: upcoming, isLoading } = useCases({ filter: 'upcoming', pageSize: 100 });
  const { cases: overdue } = useCases({ filter: 'overdue', pageSize: 50 });

  const groups = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const c of upcoming) {
      if (!c.nextDate) continue;
      const key = c.nextDate.slice(0, 10);
      const group = map.get(key) ?? { key, date: c.nextDate, cases: [] };
      group.cases.push(c);
      map.set(key, group);
    }
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [upcoming]);

  return (
    <>
      <AppBar
        title="Diary"
        subtitle="Cause list by date"
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

      <main className="page flex flex-1 flex-col gap-space-xl pb-nav pt-appbar">
        {overdue.length ? (
          <section className="flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm rounded-md bg-error-container px-space-base py-space-md text-on-error-container">
              <Icon name="alert" size={18} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-label-lg">
                  {overdue.length} matter{overdue.length === 1 ? '' : 's'} past their date
                </p>
                <p className="text-body-sm opacity-80">
                  Confirm the fresh date with the ahlmad, then record it.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-space-md xl:grid-cols-2">
              {overdue.map((c) => (
                <CaseCard key={c.id} record={c} />
              ))}
            </div>
          </section>
        ) : null}

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : groups.length ? (
          groups.map((g) => {
            const diff = daysUntil(g.date) ?? 0;
            return (
              <section key={g.key} className="flex flex-col gap-space-md">
                <div className="sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-10 -mx-screen-margin flex items-center justify-between gap-space-sm bg-surface/92 px-screen-margin py-space-sm backdrop-blur-xl lg:top-16 lg:-mx-space-2xl lg:px-space-2xl">
                  <h2
                    className={cn(
                      'tnum font-display text-headline-sm lg:text-headline-md',
                      diff === 0 ? 'text-secondary' : 'text-primary',
                    )}
                  >
                    {formatDate(g.date)}
                  </h2>
                  <div className="flex items-center gap-space-xs">
                    <span
                      className={cn(
                        'pill px-2.5 py-0.5 text-label-sm uppercase tracking-wide',
                        diff === 0
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-surface-container text-on-surface-variant',
                      )}
                    >
                      {relativeDay(g.date)} · {g.cases.length}
                    </span>
                    <button
                      onClick={() => void shareDay(new Date(g.date))}
                      disabled={busy !== null}
                      aria-label={`Share the cause list for ${formatDate(g.date)} as a PDF`}
                      title="Share this day as a PDF"
                      className="press flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary disabled:opacity-50"
                    >
                      <Icon name={busy === 'day' ? 'sync' : 'share'} size={15} className={busy === 'day' ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-space-md xl:grid-cols-2">
                  {g.cases.map((c) => (
                    <CaseCard key={c.id} record={c} hideDateChip />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <EmptyState
            icon="diary"
            title="No dates ahead"
            body="Once a case carries a next date, it lands here in chronological order."
            actionLabel="Add a case"
            actionHref="/cases/new"
          />
        )}
      </main>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
}
