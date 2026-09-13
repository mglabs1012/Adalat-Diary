import { DiaryScreen } from '@/components/screens/DiaryScreen';
import { Hydrate } from '@/components/layout/Hydrate';
import { listCases } from '@/lib/data/cases';
import { prefetch } from '@/lib/data/prefetch';
import { casesKey } from '@/lib/api/keys';
import { requireOwnerId } from '@/lib/utils/api';

export const metadata = { title: 'Diary' };

const UPCOMING = { filter: 'upcoming', page: 1, pageSize: 100 } as const;
const OVERDUE = { filter: 'overdue', page: 1, pageSize: 50 } as const;

export default async function DiaryPage() {
  const ownerId = await requireOwnerId();

  const seeded = ownerId
    ? await prefetch('diary', () =>
        Promise.all([listCases(ownerId, UPCOMING), listCases(ownerId, OVERDUE)]),
      )
    : ({ ok: false } as const);

  const [upcoming, overdue] = seeded.ok ? seeded.data : [undefined, undefined];

  return (
    <Hydrate fallback={{ [casesKey(UPCOMING)]: upcoming, [casesKey(OVERDUE)]: overdue }}>
      <DiaryScreen />
    </Hydrate>
  );
}
