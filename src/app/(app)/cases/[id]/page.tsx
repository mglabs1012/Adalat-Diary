import { notFound } from 'next/navigation';
import { CaseDetailScreen } from '@/components/screens/CaseDetailScreen';
import { Hydrate } from '@/components/layout/Hydrate';
import { getCase } from '@/lib/data/cases';
import { prefetch } from '@/lib/data/prefetch';
import { caseKey } from '@/lib/api/keys';
import { requireOwnerId } from '@/lib/utils/api';

export const metadata = { title: 'Case detail' };

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = await requireOwnerId();

  const found = ownerId ? await prefetch('case', () => getCase(ownerId, id)) : ({ ok: false } as const);

  // Only a *successful* lookup that came back empty is a 404. If the database
  // was unreachable we fall through and let the client retry, rather than
  // telling the advocate their case no longer exists.
  if (found.ok && found.data === null) notFound();

  return (
    <Hydrate fallback={{ [caseKey(id)]: found.ok ? found.data : undefined }}>
      <CaseDetailScreen id={id} />
    </Hydrate>
  );
}
