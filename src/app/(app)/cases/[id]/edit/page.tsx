import { notFound } from 'next/navigation';
import { EditCaseScreen } from '@/components/screens/EditCaseScreen';
import { Hydrate } from '@/components/layout/Hydrate';
import { getCase } from '@/lib/data/cases';
import { prefetch } from '@/lib/data/prefetch';
import { caseKey } from '@/lib/api/keys';
import { requireOwnerId } from '@/lib/utils/api';

export const metadata = { title: 'Edit case' };

export default async function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = await requireOwnerId();

  const found = ownerId ? await prefetch('case', () => getCase(ownerId, id)) : ({ ok: false } as const);

  if (found.ok && found.data === null) notFound();

  return (
    <Hydrate fallback={{ [caseKey(id)]: found.ok ? found.data : undefined }}>
      <EditCaseScreen id={id} />
    </Hydrate>
  );
}
