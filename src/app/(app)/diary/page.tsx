import { Suspense } from 'react';
import { DiaryScreen } from '@/components/screens/DiaryScreen';
import { Hydrate } from '@/components/layout/Hydrate';
import { listCases } from '@/lib/data/cases';
import { prefetch } from '@/lib/data/prefetch';
import { casesKey } from '@/lib/api/keys';
import { requireOwnerId } from '@/lib/utils/api';
import { ListSkeleton } from '@/components/ui/Skeleton';

export const metadata = { title: 'Diary' };

const PAGE_SIZE = 250;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dayParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && DAY_PATTERN.test(value) ? value : undefined;
}

/**
 * Board links carry their requested date range. Prefetch that exact slice on
 * the server so "Tomorrow" opens as a finished cause list, not a broad diary
 * that has to filter after the fact.
 */
export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; from?: string | string[]; to?: string | string[] }>;
}) {
  const ownerId = await requireOwnerId();
  const params = await searchParams;
  const date = dayParam(params.date);
  const from = dayParam(params.from);
  const to = dayParam(params.to);
  const range = date
    ? { filter: 'range' as const, from: date, to: date, page: 1, pageSize: PAGE_SIZE, includeTotal: false }
    : from || to
      ? { filter: 'range' as const, from, to, page: 1, pageSize: PAGE_SIZE, includeTotal: false }
      : null;

  const fallback: Record<string, unknown> = {};
  if (ownerId && range) {
    const seeded = await prefetch('filtered diary', () => listCases(ownerId, range));
    if (seeded.ok) fallback[casesKey(range)] = seeded.data;
  } else if (ownerId) {
    const upcoming = { filter: 'upcoming' as const, page: 1, pageSize: PAGE_SIZE, includeTotal: false };
    const overdue = { filter: 'overdue' as const, page: 1, pageSize: PAGE_SIZE, includeTotal: false };
    const seeded = await prefetch('diary', () =>
      Promise.all([listCases(ownerId, upcoming), listCases(ownerId, overdue)]),
    );
    if (seeded.ok) {
      fallback[casesKey(upcoming)] = seeded.data[0];
      fallback[casesKey(overdue)] = seeded.data[1];
    }
  }

  return (
    <Hydrate fallback={fallback}>
      <Suspense
        fallback={
          <main className="page flex flex-1 flex-col pb-nav pt-appbar">
            <ListSkeleton rows={4} />
          </main>
        }
      >
        <DiaryScreen />
      </Suspense>
    </Hydrate>
  );
}
