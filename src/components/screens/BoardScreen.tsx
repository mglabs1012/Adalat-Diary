'use client';

import Link from 'next/link';
import { useCases } from '@/hooks/useCases';
import { useStats } from '@/hooks/useStats';
import { formatLongDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { CaseCard } from '@/components/cases/CaseCard';
import { useSession } from '@/components/layout/SessionProvider';
import { ButtonLink } from '@/components/ui/Button';
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
function agenda(today: number, overdue: number): string {
  if (!today && !overdue) return 'Nothing listed today. A clear board.';
  const parts: string[] = [];
  if (today) parts.push(`${today} matter${today === 1 ? '' : 's'} listed`);
  if (overdue) parts.push(`${overdue} past its date`);
  return parts.join(' · ');
}

/** The screen the advocate opens at 9:40 a.m.: what is listed, and what is late. */
export function BoardScreen() {
  const session = useSession();
  const { stats, isLoading: statsLoading } = useStats();
  const { cases: today, isLoading: todayLoading } = useCases({ filter: 'today', pageSize: 20 });
  const { cases: upcoming } = useCases({ filter: 'upcoming', pageSize: 5 });

  const nextUp = upcoming.filter((c) => !today.some((t) => t.id === c.id)).slice(0, 4);

  return (
    <main className="flex flex-1 flex-col pb-nav">
      {/* Hero: full-bleed navy on a phone, an inset card once there is a sidebar. */}
      <header className="relative overflow-hidden bg-primary pt-safe text-on-primary lg:mx-space-2xl lg:mt-space-2xl lg:rounded-xl lg:pt-0">
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
              className="press flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-display text-label-lg uppercase ring-1 ring-white/15"
            >
              {session.username.charAt(0)}
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
                {agenda(stats.today, stats.overdue)}
              </p>
            </div>

            <ButtonLink
              href="/cases/new"
              icon="add"
              size="lg"
              pill
              className="hidden bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim lg:inline-flex"
            >
              New case
            </ButtonLink>
          </div>
        </div>
      </header>

      <div className="page">
        <section className="relative z-10 -mt-space-lg grid grid-cols-2 gap-space-sm lg:mt-space-xl lg:grid-cols-4 lg:gap-space-base">
          {statsLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <StatTile label="Listed today" value={stats.today} icon="courthouse" tone="amber" href="/cases?f=today" />
              <StatTile label="Tomorrow" value={stats.tomorrow} icon="clock" tone="plain" href="/diary" />
              <StatTile label="This week" value={stats.thisWeek} icon="diary" tone="plain" href="/diary" />
              <StatTile
                label="Date passed"
                value={stats.overdue}
                icon="alert"
                tone={stats.overdue ? 'error' : 'plain'}
                href="/cases?f=overdue"
              />
            </>
          )}
        </section>

        {/* Desktop splits the board: the cause list leads, context sits beside it. */}
        <div className="mt-space-xl grid grid-cols-1 gap-space-xl lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-space-2xl">
          <section className="flex flex-col gap-space-md">
            <SectionHeader
              title="Today's cause list"
              meta={`${today.length} matter${today.length === 1 ? '' : 's'}`}
            />
            {todayLoading ? (
              <ListSkeleton rows={2} />
            ) : today.length ? (
              today.map((c) => <CaseCard key={c.id} record={c} />)
            ) : (
              <EmptyState
                icon="check"
                title="Nothing listed today"
                body="No matter in your diary carries today's date. Enjoy the quiet board."
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
}: {
  label: string;
  value: number;
  icon: IconName;
  tone: keyof typeof TILE_TONE;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'press flex flex-col justify-between gap-space-xs rounded-md p-space-md shadow-e1 transition-shadow hover:shadow-e2 lg:p-space-base',
        TILE_TONE[tone],
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
