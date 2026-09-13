import { Suspense } from 'react';
import { DocketScreen } from '@/components/screens/DocketScreen';
import { Hydrate } from '@/components/layout/Hydrate';
import { getDiaryStats, listCases } from '@/lib/data/cases';
import { prefetch } from '@/lib/data/prefetch';
import { casesKey, STATS_KEY } from '@/lib/api/keys';
import { requireOwnerId } from '@/lib/utils/api';
import { ListSkeleton } from '@/components/ui/Skeleton';

export const metadata = { title: 'Docket' };

/** The unfiltered first page — what the docket shows before anyone types. */
const DEFAULT_LIST = { filter: 'all', page: 1, pageSize: 20 } as const;

export default async function CasesPage() {
  const ownerId = await requireOwnerId();

  const seeded = ownerId
    ? await prefetch('docket', () =>
        Promise.all([getDiaryStats(ownerId), listCases(ownerId, DEFAULT_LIST)]),
      )
    : ({ ok: false } as const);

  const [stats, list] = seeded.ok ? seeded.data : [undefined, undefined];

  return (
    <Hydrate fallback={{ [STATS_KEY]: stats, [casesKey(DEFAULT_LIST)]: list }}>
      <Suspense
        fallback={
          <main className="px-screen-margin pb-nav pt-[calc(env(safe-area-inset-top,0px)+4.5rem)]">
            <ListSkeleton rows={4} />
          </main>
        }
      >
        <DocketScreen />
      </Suspense>
    </Hydrate>
  );
}
