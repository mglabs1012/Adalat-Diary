'use client';

import { useCase } from '@/hooks/useCase';
import { AppBar } from '@/components/layout/AppBar';
import { CaseForm } from '@/components/cases/CaseForm';
import { CaseFormHelp } from '@/components/cases/CaseFormHelp';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';

export function EditCaseScreen({ id }: { id: string }) {
  const { record, error, isLoading } = useCase(id);

  return (
    <>
      <AppBar title="Edit case" subtitle={record?.crn ?? 'Loading'} back width="form" actions={<CaseFormHelp />} />
      <main className="page-form flex flex-1 flex-col pb-form-actions pt-appbar">
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : error || !record ? (
          <EmptyState
            icon="alert"
            title="Case not found"
            body="This record is no longer in your diary."
            actionLabel="Back to docket"
            actionHref="/cases"
          />
        ) : (
          <CaseForm initial={record} />
        )}
      </main>
    </>
  );
}
