'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { casesApi } from '@/lib/api/client';
import { getStage } from '@/lib/constants/stages';
import { caseRef, causeTitle, clientOf, sideLabel } from '@/lib/utils/case';
import { formatDate, relativeDay, urgencyOf } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { removeCachedCase, revalidateDiary, updateCachedCase } from '@/hooks/useCases';
import { useCase } from '@/hooks/useCase';
import { useDiaryPdf } from '@/hooks/useDiaryPdf';
import { toast } from '@/hooks/useToast';
import { AppBar, AppBarButton } from '@/components/layout/AppBar';
import { AdjournSheet } from '@/components/cases/AdjournSheet';
import { StageBadge } from '@/components/cases/StageBadge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Sheet } from '@/components/ui/Sheet';

type Tab = 'overview' | 'history';

export function CaseDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const { record, error, isLoading, mutate } = useCase(id);
  const { busy, shareCasePdf, shareCaseText } = useDiaryPdf();
  const [tab, setTab] = useState<Tab>('overview');
  const [adjourning, setAdjourning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <>
        <AppBar title="Case detail" back />
        <main className="page pb-nav pt-appbar">
          <ListSkeleton rows={3} />
        </main>
      </>
    );
  }

  if (error || !record) {
    return (
      <>
        <AppBar title="Case detail" back />
        <main className="page pb-nav pt-appbar">
          <EmptyState
            icon="alert"
            title="Case not found"
            body="It may have been deleted, or this link points at a record outside your diary."
            actionLabel="Back to docket"
            actionHref="/cases"
          />
        </main>
      </>
    );
  }

  const stage = getStage(record.stage);
  const urgency = urgencyOf(record.nextDate);
  const disposed = record.status === 'disposed';

  async function togglePin() {
    if (!record) return;
    const next = !record.pinned;
    await mutate({ ...record, pinned: next }, { revalidate: false });
    try {
      await casesApi.update(record.id, { pinned: next });
      await updateCachedCase({ ...record, pinned: next });
      void revalidateDiary();
      toast(next ? 'Pinned to the top of your docket' : 'Unpinned');
    } catch {
      await mutate();
      toast('Could not update the pin', 'error');
    }
  }

  async function share() {
    if (record) await shareCaseText(record);
  }

  async function remove() {
    if (!record) return;
    try {
      await casesApi.remove(record.id);
      await removeCachedCase(record.id);
      void revalidateDiary();
      toast('Case removed from your diary');
      router.replace('/cases');
    } catch {
      toast('Could not delete the case', 'error');
    }
  }

  return (
    <>
      <AppBar
        title={caseRef(record)}
        subtitle={stage.label}
        back
        actions={
          <>
            <AppBarButton icon="pin" label="Pin case" active={record.pinned} onClick={togglePin} />
            <AppBarButton icon="share" label="Share cause slip" onClick={share} />
            <AppBarButton
              icon={busy === 'case' ? 'sync' : 'note'}
              label="Share as PDF"
              onClick={() => void shareCasePdf(record)}
            />
            <ButtonLink
              href={`/cases/${record.id}/edit`}
              icon="edit"
              size="sm"
              variant="tonal"
              className="ml-space-xs hidden lg:inline-flex"
            >
              Edit
            </ButtonLink>
          </>
        }
      />

      <main className="page flex flex-1 flex-col gap-space-base pb-[calc(9rem+env(safe-area-inset-bottom,0px))] pt-appbar lg:pb-space-3xl">
        {/* Desktop: dossier and next date lead the left column, detail fills the right. */}
        <div className="grid grid-cols-1 gap-space-base lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start lg:gap-space-xl">
          <div className="flex flex-col gap-space-base lg:sticky lg:top-[5.5rem]">
            {/* Master dossier card */}
            <section className="card relative overflow-hidden p-space-base lg:p-space-lg">
              <span
                className={cn(
                  'absolute inset-y-0 left-0 w-1.5',
                  disposed ? 'bg-success' : urgency === 'overdue' ? 'bg-error' : 'bg-secondary-container',
                )}
                aria-hidden
              />
              <div className="flex flex-col gap-space-sm pl-space-xs">
                <div className="flex flex-wrap items-center gap-space-xs">
                  <span
                    className={cn(
                      'tnum rounded bg-surface-container px-2 py-0.5 text-[13px] tracking-[0.05em]',
                      record.crn ? 'text-on-surface-variant' : 'text-on-surface-variant/60 italic',
                    )}
                  >
                    {caseRef(record)}
                  </span>
                  {record.caseNo ? (
                    <span className="tnum text-label-md text-on-surface-variant">{record.caseNo}</span>
                  ) : null}
                  <StageBadge stage={record.stage} full className="ml-auto" />
                </div>

                <h1 className="font-display text-headline-md text-primary lg:text-headline-lg">
                  {causeTitle(record)}
                </h1>

                <div className="flex flex-col gap-space-xs rounded-md bg-surface-container-low/70 p-space-md">
                  <Row
                    icon="courthouse"
                    text={`${record.court}${record.courtRoom ? ` · ${record.courtRoom}` : ''}`}
                    strong
                  />
                  {record.judge ? <Row icon="person" text={record.judge} /> : null}
                  <Row
                    icon="note"
                    text={`Appearing for ${sideLabel(record.appearingFor)} — ${clientOf(record)}`}
                  />
                  {record.clientPhone ? (
                    <a
                      href={`tel:${record.clientPhone}`}
                      className="flex items-center gap-space-xs text-body-sm text-tertiary hover:underline"
                    >
                      <Icon name="phone" size={15} />
                      <span className="tnum">{record.clientPhone}</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Next date — the reason this app exists. */}
            <section
              className={cn(
                'rounded-lg p-space-base shadow-e1 lg:p-space-lg',
                disposed
                  ? 'bg-success-container text-on-success-container'
                  : 'brand-panel text-white',
              )}
            >
              <div className="flex items-center justify-between gap-space-sm">
                <span className="flex items-center gap-space-xs text-label-sm uppercase tracking-wider text-secondary-fixed-dim">
                  <Icon name="bolt" size={14} />
                  {disposed ? 'Disposed' : 'Next date of hearing'}
                </span>
                {!disposed ? (
                  <span className="tnum rounded bg-white/15 px-2 py-0.5 text-label-sm uppercase">
                    {relativeDay(record.nextDate)}
                  </span>
                ) : null}
              </div>
              <p className="tnum mt-space-xs font-display text-headline-md lg:text-headline-lg">
                {disposed ? 'Matter closed' : formatDate(record.nextDate)}
              </p>
              <p className="mt-space-xxs text-body-sm opacity-80">
                {record.purpose
                  ? `Listed for ${record.purpose}`
                  : `Previous date · ${formatDate(record.preDate)}`}
              </p>

              {!disposed ? (
                <Button
                  icon="arrowRight"
                  size="lg"
                  block
                  pill
                  className="mt-space-base hidden bg-secondary-fixed-dim text-on-secondary-fixed hover:bg-secondary-fixed lg:inline-flex"
                  onClick={() => setAdjourning(true)}
                >
                  Record next date
                </Button>
              ) : null}
            </section>
          </div>

          <div className="flex flex-col gap-space-base">
            <div
              role="tablist"
              className="flex items-center gap-space-xs rounded-md bg-surface-container-high p-1"
            >
              {(
                [
                  ['overview', 'Overview'],
                  ['history', `History (${record.history.length})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex-1 rounded px-space-md py-2 text-label-md transition-all',
                    tab === key
                      ? 'bg-surface-container-lowest text-primary shadow-e1'
                      : 'text-on-surface-variant hover:text-primary',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'overview' ? (
              <section className="flex flex-col gap-space-base">
                <div className="card grid grid-cols-2 gap-space-sm p-space-base lg:p-space-lg">
                  <Meta label="Previous date" value={formatDate(record.preDate)} />
                  <Meta label="Next date" value={disposed ? '—' : formatDate(record.nextDate)} />
                  <Meta label="Stage" value={stage.label} />
                  <Meta label="Status" value={disposed ? 'Disposed' : 'Active'} />
                </div>

                {record.notes ? (
                  <div className="card flex flex-col gap-space-xs p-space-base lg:p-space-lg">
                    <h2 className="flex items-center gap-space-sm font-display text-headline-sm text-primary">
                      <Icon name="note" size={18} className="text-secondary" />
                      Chamber notes
                    </h2>
                    <p className="whitespace-pre-wrap text-body-md text-on-surface">{record.notes}</p>
                  </div>
                ) : null}

                <div className="card grid grid-cols-2 gap-space-xs p-space-sm sm:grid-cols-4">
                  <Button
                    variant="ghost"
                    icon="share"
                    onClick={() => void shareCaseText(record)}
                  >
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    icon="note"
                    loading={busy === 'case'}
                    onClick={() => void shareCasePdf(record)}
                  >
                    PDF
                  </Button>
                  <ButtonLink
                    href={`/cases/${record.id}/edit`}
                    variant="ghost"
                    icon="edit"
                  >
                    Edit
                  </ButtonLink>
                  <Button
                    variant="ghost"
                    icon="trash"
                    className="text-error hover:bg-error/[0.08] hover:text-error"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete
                  </Button>
                </div>
              </section>
            ) : (
              <section className="card flex flex-col gap-space-sm p-space-base lg:p-space-lg">
                <h2 className="flex items-center gap-space-sm font-display text-headline-sm text-primary">
                  <Icon name="clock" size={18} className="text-secondary" />
                  Procedural history
                </h2>
                {record.history.length ? (
                  <ol className="relative mt-space-xs flex flex-col pl-4">
                    <span className="absolute bottom-4 left-[7px] top-2 w-0.5 bg-surface-variant" aria-hidden />
                    {record.history.map((h, i) => (
                      <li key={`${h.date}-${i}`} className="relative flex flex-col pb-space-md last:pb-0">
                        <span
                          className={cn(
                            'absolute -left-[13px] top-1 h-3 w-3 rounded-full ring-4 ring-surface-container-lowest',
                            i === 0 ? 'bg-secondary-container' : 'bg-outline-variant',
                          )}
                          aria-hidden
                        />
                        <div className="flex items-baseline justify-between gap-space-xs">
                          <span className="tnum text-label-lg text-primary">{formatDate(h.date)}</span>
                          <StageBadge stage={h.stage} />
                        </div>
                        {h.note ? (
                          <p className="mt-0.5 text-body-sm text-on-surface-variant">{h.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="py-space-lg text-center text-body-sm text-on-surface-variant">
                    No hearings recorded yet. Every date you commit shows up here.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Mobile only: the desktop CTA lives in the next-date panel instead. */}
      {!disposed ? (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 px-screen-margin pb-space-sm lg:hidden">
          <Button
            icon="arrowRight"
            size="lg"
            block
            pill
            className="shadow-e4"
            onClick={() => setAdjourning(true)}
          >
            Record next date
          </Button>
        </div>
      ) : null}

      <AdjournSheet
        record={record}
        open={adjourning}
        onClose={() => setAdjourning(false)}
        onDone={(saved) => void mutate(saved, { revalidate: !saved })}
      />

      <Sheet
        open={confirmDelete}
        title="Delete this case?"
        description={causeTitle(record)}
        onClose={() => setConfirmDelete(false)}
      >
        <div className="flex flex-col gap-space-lg">
          <p className="text-body-md text-on-surface-variant">
            This record and its entire procedural history will be removed from your diary. It
            cannot be undone.
          </p>
          <div className="flex gap-space-sm">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setConfirmDelete(false)}
            >
              Keep it
            </Button>
            <Button variant="danger" size="lg" className="flex-1" icon="trash" onClick={remove}>
              Delete case
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

function Row({ icon, text, strong }: { icon: IconName; text: string; strong?: boolean }) {
  return (
    <div className="flex items-center gap-space-xs text-on-surface-variant">
      <Icon name={icon} size={15} className={cn('shrink-0', strong && 'text-primary')} />
      <span className={cn('truncate text-body-sm', strong && 'font-medium text-on-surface')}>{text}</span>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded bg-surface-container-low p-space-md">
      <span className="text-label-sm uppercase tracking-wide text-on-surface-variant">{label}</span>
      <span className="tnum mt-0.5 text-label-lg text-on-surface">{value}</span>
    </div>
  );
}
