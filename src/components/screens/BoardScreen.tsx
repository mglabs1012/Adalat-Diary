'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useCases } from '@/hooks/useCases';
import { useStats } from '@/hooks/useStats';
import { useDiaryPdf } from '@/hooks/useDiaryPdf';
import { groupByDiaryDay } from '@/lib/data/diaryDays';
import { dayKeyFromToday, formatLongDate, todayKey } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { CaseCard } from '@/components/cases/CaseCard';
import { useSession } from '@/components/layout/SessionProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ListSkeleton, StatSkeleton } from '@/components/ui/Skeleton';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Adalat Diary';

/** Time-of-day greeting — the app is opened before the board rises and after it sits. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** One line telling the advocate what today actually demands. */
function agenda(today: number, overdue: number, undated: number): string {
  const parts: string[] = [];
  if (today) parts.push(`${today} matter${today === 1 ? '' : 's'} on today's page`);
  if (overdue) parts.push(`${overdue} past its date`);
  if (undated) parts.push(`${undated} awaiting a date`);
  if (!parts.length) return 'Nothing listed today. A clear board.';
  return parts.join(' · ');
}

/** The screen the advocate opens at 9:40 a.m.: what is listed, and what is late. */
export function BoardScreen() {
  const session = useSession();
  const { busy, shareDay } = useDiaryPdf();
  const { stats, isLoading: statsLoading } = useStats();
  const { cases: today, isLoading: todayLoading } = useCases({ filter: 'today', pageSize: 20 });
  const { cases: upcoming } = useCases({ filter: 'upcoming', pageSize: 5 });
  const { cases: undated } = useCases({ filter: 'undated', pageSize: 5 });

  const dayKey = todayKey();
  const tomorrowKey = dayKeyFromToday(1);
  const weekEndKey = dayKeyFromToday(7);

  // Today's page in diary order: what is still to be called first, then what
  // was heard this morning and has already been adjourned onward.
  const todayEntries = useMemo(
    () => groupByDiaryDay(today, { from: dayKey, to: dayKey })[0]?.entries ?? [],
    [today, dayKey],
  );

  const nextUp = upcoming.filter((c) => !today.some((t) => t.id === c.id)).slice(0, 4);

  return (
    <main className="flex flex-1 flex-col pb-nav">
      {/* Hero: full-bleed navy on a phone, an inset card once there is a sidebar. */}
      <header className="brand-panel relative overflow-hidden pt-safe text-white lg:mx-space-2xl lg:mt-space-2xl lg:rounded-xl lg:pt-0">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rounded-full bg-white/[0.06] blur-2xl"
        />
        <div className="page relative pb-space-xl lg:px-space-2xl lg:py-space-2xl">
          <div className="flex items-center justify-between pt-space-base lg:hidden">
            <div className="flex items-center gap-space-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded bg-white/10 text-secondary-fixed-dim">
                <Icon name="scale" size={20} />
              </span>
              <div>
                <p className="font-display text-headline-sm leading-tight">{APP_NAME}</p>
                <p className="text-label-sm uppercase text-primary-fixed-dim">Chamber board</p>
              </div>
            </div>
            <Link
              href="/settings"
              aria-label="Chamber settings"
              className="press rounded-full ring-1 ring-white/20"
            >
              <Avatar username={session.username} avatar={session.avatar} size={40} />
            </Link>
          </div>

          <div className="mt-space-xl lg:mt-0 lg:flex lg:items-end lg:justify-between lg:gap-space-2xl">
            <div className="min-w-0">
              <p className="text-label-md text-primary-fixed-dim">
                {greeting()}, <span className="text-secondary-fixed-dim">@{session.username}</span>
              </p>
              <h1 className="mt-space-xxs font-display text-display-mobile lg:text-display-lg">
                {formatLongDate()}
              </h1>
              <p className="mt-space-xs text-body-md text-primary-fixed-dim">
                {agenda(stats.today, stats.overdue, stats.undated)}
              </p>
            </div>

            <ButtonLink
              href="/cases/new"
              icon="add"
              size="lg"
              pill
              className="hidden bg-secondary-fixed-dim text-on-secondary-fixed hover:bg-secondary-fixed lg:inline-flex"
            >
              New case
            </ButtonLink>
          </div>
        </div>
      </header>

      <div className="page">
        {/* Five counters need their own column count, or the last one hangs
            off the end of a four-up grid. */}
        <section
          className={cn(
            'relative z-10 -mt-space-lg grid grid-cols-2 gap-space-sm lg:mt-space-xl lg:gap-space-base',
            stats.undated ? 'lg:grid-cols-5' : 'lg:grid-cols-4',
          )}
        >
          {statsLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <StatTile
                label="On today's page"
                value={stats.today}
                icon="courthouse"
                tone="amber"
                href={`/diary?date=${dayKey}`}
              />
              <StatTile
                label="Tomorrow"
                value={stats.tomorrow}
                icon="clock"
                tone="plain"
                href={`/diary?date=${tomorrowKey}`}
              />
              <StatTile
                label="This week"
                value={stats.thisWeek}
                icon="diary"
                tone="plain"
                href={`/diary?from=${dayKey}&to=${weekEndKey}`}
              />
              <StatTile
                label="Date passed"
                value={stats.overdue}
                icon="alert"
                tone={stats.overdue ? 'error' : 'plain'}
                href="/cases?f=overdue"
              />
              {/* Matters with no next date used to appear in no view at all. */}
              {stats.undated ? (
                <StatTile
                  label="Date awaited"
                  value={stats.undated}
                  icon="note"
                  tone="plain"
                  href="/cases?f=undated"
                  className="col-span-2 lg:col-span-1"
                />
              ) : null}
            </>
          )}
        </section>

        {/* Desktop splits the board: the cause list leads, context sits beside it. */}
        <div className="mt-space-xl grid grid-cols-1 gap-space-xl lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-space-2xl">
          <section className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between gap-space-sm">
              <h2 className="font-display text-headline-md text-primary">Today&rsquo;s cause list</h2>
              <Button
                size="sm"
                variant="tonal"
                icon="share"
                loading={busy === 'day'}
                onClick={() => void shareDay(new Date())}
              >
                Share PDF
              </Button>
            </div>
            {todayLoading ? (
              <ListSkeleton rows={2} />
            ) : todayEntries.length ? (
              <div className="grid grid-cols-1 gap-space-md 2xl:grid-cols-2">
                {todayEntries.map((entry) => (
                  <CaseCard key={entry.record.id} record={entry.record} dayRole={entry.role} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="check"
                title="Nothing on today's page"
                body="No matter was listed or heard today. Enjoy the quiet board."
                actionLabel="Add a case"
                actionHref="/cases/new"
              />
            )}
          </section>

          <div className="flex flex-col gap-space-xl">
            {nextUp.length ? (
              <section className="flex flex-col gap-space-md">
                <SectionHeader title="Coming up" meta="All dates" href="/diary" />
                {nextUp.map((c) => (
                  <CaseCard key={c.id} record={c} compact />
                ))}
              </section>
            ) : null}

            {undated.length ? (
              <section className="flex flex-col gap-space-md">
                <SectionHeader
                  title="Awaiting a date"
                  meta={`All ${stats.undated}`}
                  href="/cases?f=undated"
                />
                <p className="-mt-space-xs text-body-sm text-on-surface-variant">
                  Open matters the court has not listed again. They still sit on the day they
                  were last heard.
                </p>
                {undated.slice(0, 3).map((c) => (
                  <CaseCard key={c.id} record={c} compact />
                ))}
              </section>
            ) : null}

            <section className="card flex flex-col gap-space-md p-space-base">
              <div className="flex items-center gap-space-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                  <Icon name="docket" size={18} />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-label-lg text-primary">Active files</p>
                  <p className="tnum text-body-sm text-on-surface-variant">
                    {stats.active} pending · {stats.disposed} disposed
                  </p>
                </div>
              </div>
              <ButtonLink href="/cases" variant="tonal" trailingIcon="chevron" block>
                Open docket
              </ButtonLink>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({ title, meta, href }: { title: string; meta?: string; href?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-space-sm">
      <h2 className="font-display text-headline-md text-primary">{title}</h2>
      {href ? (
        <Link href={href} className="text-label-md text-secondary hover:underline">
          {meta}
        </Link>
      ) : meta ? (
        <span className="text-label-sm uppercase tracking-wide text-on-surface-variant">{meta}</span>
      ) : null}
    </div>
  );
}

const TILE_TONE = {
  amber: 'bg-secondary-container text-on-secondary-container',
  error: 'bg-error-container text-on-error-container',
  plain: 'bg-surface-container-lowest text-on-surface',
} as const;

function StatTile({
  label,
  value,
  icon,
  tone,
  href,
  className,
}: {
  label: string;
  value: number;
  icon: IconName;
  tone: keyof typeof TILE_TONE;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'press flex flex-col justify-between gap-space-xs rounded-md p-space-md shadow-e1 transition-shadow hover:shadow-e2 lg:p-space-base',
        TILE_TONE[tone],
        className,
      )}
    >
      <span className="flex items-center justify-between">
        <Icon name={icon} size={16} className="opacity-70" />
        <span className="tnum font-display text-headline-lg leading-none">{value}</span>
      </span>
      <span className="text-label-md uppercase tracking-wide opacity-80">{label}</span>
    </Link>
  );
}
