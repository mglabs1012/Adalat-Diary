'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { CaseFilter } from '@/types/case';
import { STAGES } from '@/lib/constants/stages';
import { cn } from '@/lib/utils/cn';
import { useCases } from '@/hooks/useCases';
import { useStats } from '@/hooks/useStats';
import { AppBar, AppBarButton } from '@/components/layout/AppBar';
import { CaseCard } from '@/components/cases/CaseCard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ImportDialog } from '@/components/cases/ImportDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { SearchBar } from '@/components/ui/SearchBar';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ListSkeleton } from '@/components/ui/Skeleton';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Passed' },
  { id: 'disposed', label: 'Disposed' },
] as const satisfies readonly { id: CaseFilter; label: string }[];

const PAGE = 20;
/** Matches the server's pageSize ceiling in `listQuerySchema`. */
const MAX_PAGE_SIZE = 100;

export function DocketScreen() {
  const params = useSearchParams();
  const initial = (params.get('f') as CaseFilter) ?? 'all';

  const [filter, setFilter] = useState<CaseFilter>(
    FILTERS.some((f) => f.id === initial) ? initial : 'all',
  );
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [showStages, setShowStages] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { stats } = useStats();

  // "Load more" grows the window rather than stepping through pages, so the
  // list accumulates in place instead of jumping to the next slice.
  const pageSize = Math.min(page * PAGE, MAX_PAGE_SIZE);
  const { cases, total, hasMore, isLoading } = useCases({
    filter,
    q: q || undefined,
    stage,
    page: 1,
    pageSize,
  });

  const counts = useMemo<Partial<Record<CaseFilter, number>>>(
    () => ({ today: stats.today, overdue: stats.overdue }),
    [stats],
  );
  const segments = FILTERS.map((f) => ({ ...f, count: counts[f.id] }));

  function change(next: CaseFilter) {
    setFilter(next);
    setPage(1);
  }

  const stageFilters = (
    <div className="flex flex-wrap gap-space-sm">
      <StageChip label="Any stage" active={!stage} onClick={() => setStage(undefined)} />
      {STAGES.map((s) => (
        <StageChip
          key={s.id}
          label={s.short}
          active={stage === s.id}
          onClick={() => setStage(stage === s.id ? undefined : s.id)}
        />
      ))}
    </div>
  );

  return (
    <>
      <AppBar
        title="Docket"
        subtitle={`${total} ${total === 1 ? 'file' : 'files'}`}
        actions={
          <>
            <AppBarButton
              icon="filter"
              label="Filter by stage"
              active={showStages || Boolean(stage)}
              onClick={() => setShowStages((s) => !s)}
            />
            <Button
              size="sm"
              variant="tonal"
              icon="download"
              className="ml-space-xs hidden sm:inline-flex"
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
            <ButtonLink
              href="/cases/new"
              icon="add"
              size="sm"
              pill
              className="ml-space-xs hidden lg:inline-flex"
            >
              New case
            </ButtonLink>
          </>
        }
      />

      <main className="page flex flex-1 flex-col gap-space-md pb-nav pt-appbar">
        <SearchBar
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />

        <SegmentedTabs segments={segments} value={filter} onChange={change} />

        {/* Stage chips: a collapsible strip on mobile, always open on desktop. */}
        {showStages ? (
          <div className="animate-rise lg:hidden">{stageFilters}</div>
        ) : null}
        <div className="hidden lg:block">{stageFilters}</div>

        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : cases.length ? (
          <>
            {/* One column on a phone; two once there is room to read both. */}
            <div className="grid grid-cols-1 gap-space-md xl:grid-cols-2">
              {cases.map((c) => (
                <CaseCard key={c.id} record={c} />
              ))}
            </div>

            {hasMore && pageSize < MAX_PAGE_SIZE ? (
              <Button
                variant="secondary"
                pill
                size="lg"
                className="mx-auto mt-space-xs"
                onClick={() => setPage((p) => p + 1)}
              >
                Load more
              </Button>
            ) : hasMore ? (
              <p className="py-space-md text-center text-label-md text-on-surface-variant">
                Showing the first {cases.length} of {total} — search or filter to narrow it down
              </p>
            ) : (
              <p className="py-space-md text-center text-label-md text-on-surface-variant">
                End of list · {total} {total === 1 ? 'file' : 'files'}
              </p>
            )}
          </>
        ) : (
          <EmptyState
            icon={q ? 'search' : 'docket'}
            title={q ? 'No matching case' : 'Your docket is empty'}
            body={
              q
                ? 'Try the CRN, a party name, or the court instead.'
                : 'Add your first case and its next date will show up on the board.'
            }
            actionLabel={q ? undefined : 'Add a case'}
            actionHref={q ? undefined : '/cases/new'}
          />
        )}
      </main>

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}

function StageChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'press whitespace-nowrap rounded-full px-space-md py-1.5 text-label-md transition-colors',
        active
          ? 'bg-primary text-on-primary'
          : 'bg-surface-container-lowest text-on-surface-variant ring-1 ring-on-surface/10 hover:bg-surface-container',
      )}
    >
      {active && label !== 'Any stage' ? (
        <span className="mr-1 inline-flex align-middle">
          <Icon name="check" size={12} />
        </span>
      ) : null}
      {label}
    </button>
  );
}
