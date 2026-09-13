import { BoardScreen } from '@/components/screens/BoardScreen';
import { Hydrate } from '@/components/layout/Hydrate';
import { getDiaryStats, listCases } from '@/lib/data/cases';
import { prefetch } from '@/lib/data/prefetch';
import { casesKey, STATS_KEY } from '@/lib/api/keys';
import { requireOwnerId } from '@/lib/utils/api';

export const metadata = { title: 'Board' };

const TODAY = { filter: 'today', page: 1, pageSize: 20 } as const;
const UPCOMING = { filter: 'upcoming', page: 1, pageSize: 5 } as const;

export default async function HomePage() {
  const ownerId = await requireOwnerId();

  // Everything the board needs, fetched in parallel on the server and handed
  // to SWR pre-keyed — the first frame is real content, not skeletons.
  const seeded = ownerId
    ? await prefetch('board', () =>
        Promise.all([
          getDiaryStats(ownerId),
          listCases(ownerId, TODAY),
          listCases(ownerId, UPCOMING),
        ]),
      )
    : ({ ok: false } as const);

  const [stats, today, upcoming] = seeded.ok ? seeded.data : [undefined, undefined, undefined];

  return (
    <Hydrate
      fallback={{
        [STATS_KEY]: stats,
        [casesKey(TODAY)]: today,
        [casesKey(UPCOMING)]: upcoming,
      }}
    >
      <BoardScreen />
    </Hydrate>
  );
}
