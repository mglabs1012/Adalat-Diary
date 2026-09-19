import { AppBar } from '@/components/layout/AppBar';
import { CaseForm } from '@/components/cases/CaseForm';
import { CaseFormHelp } from '@/components/cases/CaseFormHelp';

export const metadata = { title: 'New case' };

export default function NewCasePage() {
  return (
    <>
      <AppBar title="New case" subtitle="Add to diary" back width="form" actions={<CaseFormHelp />} />
      <main className="page-form flex flex-1 flex-col pb-form-actions pt-appbar">
        <CaseForm />
      </main>
    </>
  );
}
