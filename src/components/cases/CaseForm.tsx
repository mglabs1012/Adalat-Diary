'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import type { CaseRecord, PartySide, StageId } from '@/types/case';
import { ApiError, casesApi } from '@/lib/api/client';
import { enqueue } from '@/lib/offline/outbox';
import { COURT_GROUPS, PURPOSE_SUGGESTIONS, isKnownCourt } from '@/lib/constants/courts';
import { DEFAULT_STAGE, STAGES } from '@/lib/constants/stages';
import { toInputDate } from '@/lib/utils/date';
import { revalidateDiary, updateCachedCase } from '@/hooks/useCases';
import { useOnline } from '@/hooks/useOnline';
import { toast } from '@/hooks/useToast';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  DatePicker,
  Field,
  FormActions,
  FormGrid,
  FormRow,
  FormSection,
  SegmentedInput,
  Select,
  TextArea,
  TextInput,
  type SelectGroup,
} from '@/components/ui/Form';

interface CaseFormProps {
  initial?: CaseRecord;
}

type Errors = Partial<Record<string, string>>;

const SIDES = [
  { id: 'party1' as PartySide, label: 'Party 1', hint: 'Petitioner' },
  { id: 'party2' as PartySide, label: 'Party 2', hint: 'Respondent' },
];

const NOTES_MAX = 5000;

const STAGE_OPTIONS = STAGES.map((s) => ({ value: s.id, label: s.label }));

/**
 * One form for create and edit. The seven diary fields come first and are
 * always visible; chamber context sits in a second card below rather than
 * behind a toggle — on a phone it is a scroll away, on desktop it is simply
 * the right-hand column.
 */
export function CaseForm({ initial }: CaseFormProps) {
  const router = useRouter();
  const online = useOnline();
  const isEdit = Boolean(initial);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [form, setForm] = useState({
    crn: initial?.crn ?? '',
    court: initial?.court ?? '',
    party1: initial?.party1 ?? '',
    party2: initial?.party2 ?? '',
    stage: (initial?.stage ?? DEFAULT_STAGE) as StageId,
    preDate: toInputDate(initial?.preDate),
    nextDate: toInputDate(initial?.nextDate),
    caseNo: initial?.caseNo ?? '',
    courtRoom: initial?.courtRoom ?? '',
    judge: initial?.judge ?? '',
    purpose: initial?.purpose ?? '',
    appearingFor: (initial?.appearingFor ?? 'party1') as PartySide,
    clientName: initial?.clientName ?? '',
    clientPhone: initial?.clientPhone ?? '',
    notes: initial?.notes ?? '',
  });

  const courtGroups = useMemo<SelectGroup[]>(() => {
    const groups: SelectGroup[] = COURT_GROUPS.map((g) => ({
      label: g.label,
      options: g.courts.map((c) => ({ value: c, label: c })),
    }));
    // An older record may carry a court no longer on the list; keep it
    // selectable so opening the form cannot silently move the matter.
    if (form.court && !isKnownCourt(form.court)) {
      groups.unshift({
        label: 'On this record',
        options: [{ value: form.court, label: form.court, hint: 'Not on the current list' }],
      });
    }
    return groups;
  }, [form.court]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: undefined } : e));
  };

  function validate(): boolean {
    const next: Errors = {};
    if (!form.court.trim()) next.court = 'Court is required';
    if (!form.party1.trim()) next.party1 = 'First party is required';
    if (!form.party2.trim()) next.party2 = 'Second party is required';
    if (form.preDate && form.nextDate && form.nextDate < form.preDate) {
      next.nextDate = 'The next date cannot fall before the previous date';
    }
    if (form.clientPhone && !/^[\d+\-\s()]{6,20}$/.test(form.clientPhone)) {
      next.clientPhone = 'Enter a usable phone number';
    }
    setErrors(next);

    if (Object.keys(next).length) {
      // Put the user on the first problem instead of making them hunt.
      document
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus({ preventScroll: true });
      return false;
    }
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving || !validate()) return;

    setSaving(true);
    const payload = { ...form, crn: form.crn.trim().toUpperCase() };

    try {
      if (!online) {
        // Queue it, say plainly what happened, and get out of the way.
        await enqueue({
          url: isEdit ? `/api/cases/${initial!.id}` : '/api/cases',
          method: isEdit ? 'PATCH' : 'POST',
          body: payload,
          label: `${payload.party1} v. ${payload.party2}`,
        });
        toast('Saved on device — will sync when you are online', 'success');
        router.push(isEdit ? `/cases/${initial!.id}` : '/cases');
        return;
      }

      const saved = isEdit
        ? await casesApi.update(initial!.id, payload)
        : await casesApi.create(payload);

      // Seed the destination and any visible cards before navigation. A full
      // refresh then happens in the background instead of blocking the UI.
      await updateCachedCase(saved);
      void revalidateDiary();
      toast(isEdit ? 'Case updated' : 'Case added to your diary', 'success');
      router.push(`/cases/${saved.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.issues?.length) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
        toast(err.message, 'error');
      } else {
        toast(err instanceof Error ? err.message : 'Could not save the case', 'error');
      }
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-space-base pb-space-2xl" noValidate>
      <FormSection
        title="Case record"
        icon="note"
        description="The seven fields that drive your diary."
      >
        <FormGrid>
          <FormRow>
            <Field
              label="CRN / case reference"
              error={errors.crn}
              hint="Optional — the number the registry knows this file by"
            >
              {(ids) => (
                <TextInput
                  ids={ids}
                  value={form.crn}
                  onChange={(e) => set('crn', e.target.value)}
                  placeholder="DLCT01-004521-2026"
                  className="tnum uppercase"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                />
              )}
            </Field>
          </FormRow>

          <FormRow>
            <Field label="Court" required error={errors.court} hint="The establishment this matter is listed in">
              {(ids) => (
                <Select
                  ids={ids}
                  value={form.court}
                  onChange={(v) => set('court', v)}
                  placeholder="Select a court…"
                  groups={courtGroups}
                  searchable
                />
              )}
            </Field>
          </FormRow>

          <FormRow>
            {/* The cause title, laid out the way it reads on a cause list. */}
            <div className="rounded-md bg-surface-container-low/60 p-space-md">
              <div className="grid grid-cols-1 items-end gap-space-sm md:grid-cols-[1fr_auto_1fr]">
                <Field label="Party 1 — petitioner / plaintiff" required error={errors.party1}>
                  {(ids) => (
                    <TextInput
                      ids={ids}
                      value={form.party1}
                      onChange={(e) => set('party1', e.target.value)}
                      placeholder="John Doe"
                      enterKeyHint="next"
                    />
                  )}
                </Field>

                <span
                  aria-hidden
                  className="hidden h-12 items-center px-space-xs font-display text-label-lg italic text-on-surface-variant md:flex"
                >
                  v.
                </span>

                <Field label="Party 2 — respondent / defendant" required error={errors.party2}>
                  {(ids) => (
                    <TextInput
                      ids={ids}
                      value={form.party2}
                      onChange={(e) => set('party2', e.target.value)}
                      placeholder="Jane Smith & Ors."
                      enterKeyHint="next"
                    />
                  )}
                </Field>
              </div>
            </div>
          </FormRow>

          <Field label="Stage" hint="Where the matter has reached">
            {(ids) => (
              <Select
                ids={ids}
                value={form.stage}
                onChange={(v) => set('stage', v as StageId)}
                options={STAGE_OPTIONS}
              />
            )}
          </Field>

          <Field label="Appearing for">
            {(ids) => (
              <SegmentedInput
                ids={ids}
                options={SIDES}
                value={form.appearingFor}
                onChange={(v) => set('appearingFor', v)}
              />
            )}
          </Field>

          <Field label="Previous date" error={errors.preDate} hint="The last hearing">
            {(ids) => (
              <DatePicker
                ids={ids}
                value={form.preDate}
                max={form.nextDate || undefined}
                onChange={(v) => set('preDate', v)}
              />
            )}
          </Field>

          <Field
            label="Next date"
            error={errors.nextDate}
            hint="What the board is counting down to"
          >
            {(ids) => (
              <DatePicker
                ids={ids}
                value={form.nextDate}
                min={form.preDate || undefined}
                onChange={(v) => set('nextDate', v)}
              />
            )}
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection
        title="Case details"
        icon="folder"
        description="Case number, judge, client and notes"
        collapsible
        defaultOpen={false}
      >
        <FormGrid>
          <Field label="Case number" error={errors.caseNo}>
            {(ids) => (
              <TextInput
                ids={ids}
                value={form.caseNo}
                onChange={(e) => set('caseNo', e.target.value)}
                placeholder="CS/412/2026"
                className="tnum"
              />
            )}
          </Field>

          <Field label="Court room" error={errors.courtRoom}>
            {(ids) => (
              <TextInput
                ids={ids}
                value={form.courtRoom}
                onChange={(e) => set('courtRoom', e.target.value)}
                placeholder="Court Room 5"
              />
            )}
          </Field>

          <Field label="Presiding judge" error={errors.judge}>
            {(ids) => (
              <TextInput
                ids={ids}
                leading="person"
                value={form.judge}
                onChange={(e) => set('judge', e.target.value)}
                placeholder="Sh. R. K. Verma, ADJ"
              />
            )}
          </Field>

          <Field label="Listed for" error={errors.purpose}>
            {(ids) => (
              <>
                <TextInput
                  ids={ids}
                  value={form.purpose}
                  onChange={(e) => set('purpose', e.target.value)}
                  placeholder="Cross examination"
                  list="purpose-suggestions"
                />
                <datalist id="purpose-suggestions">
                  {PURPOSE_SUGGESTIONS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </>
            )}
          </Field>

          <Field label="Client name" error={errors.clientName}>
            {(ids) => (
              <TextInput
                ids={ids}
                value={form.clientName}
                onChange={(e) => set('clientName', e.target.value)}
                placeholder="Defaults to the party you appear for"
              />
            )}
          </Field>

          <Field label="Client phone" error={errors.clientPhone}>
            {(ids) => (
              <TextInput
                ids={ids}
                leading="phone"
                type="tel"
                inputMode="tel"
                value={form.clientPhone}
                onChange={(e) => set('clientPhone', e.target.value)}
                placeholder="9876543210"
                className="tnum"
              />
            )}
          </Field>

          <FormRow>
            <Field
              label="Notes"
              error={errors.notes}
              meta={
                <span className="tnum text-label-md text-on-surface-variant/70">
                  {form.notes.length}/{NOTES_MAX}
                </span>
              }
            >
              {(ids) => (
                <TextArea
                  ids={ids}
                  rows={4}
                  maxLength={NOTES_MAX}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Brief facts, filings pending, instructions from the client…"
                />
              )}
            </Field>
          </FormRow>
        </FormGrid>
      </FormSection>

      {!online ? (
        <p className="flex items-start gap-space-sm rounded-md bg-inverse-surface px-space-base py-space-md text-body-sm text-inverse-on-surface">
          <Icon name="offline" size={16} className="mt-0.5 shrink-0" />
          You are offline. This will be saved on the device and synced the moment you are back
          on a network.
        </p>
      ) : null}

      <FormActions>
        <Button type="button" variant="secondary" size="lg" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          loading={saving}
          icon={online ? 'check' : 'offline'}
          className="flex-1 lg:flex-none lg:min-w-48"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add to diary'}
        </Button>
      </FormActions>
    </form>
  );
}
