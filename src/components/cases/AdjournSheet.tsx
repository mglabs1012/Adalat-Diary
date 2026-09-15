'use client';

import { useState } from 'react';
import type { CaseRecord, StageId } from '@/types/case';
import { casesApi } from '@/lib/api/client';
import { enqueue } from '@/lib/offline/outbox';
import { STAGES } from '@/lib/constants/stages';
import { PURPOSE_SUGGESTIONS } from '@/lib/constants/courts';
import { addDays, formatDate, toInputDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { revalidateDiary, updateCachedCase } from '@/hooks/useCases';
import { useOnline } from '@/hooks/useOnline';
import { toast } from '@/hooks/useToast';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { DatePicker, Field, Select, TextArea, TextInput } from '@/components/ui/Form';

interface AdjournSheetProps {
  record: CaseRecord;
  open: boolean;
  onClose: () => void;
  onDone: (record?: CaseRecord) => void;
}

const QUICK_JUMPS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '6 weeks', days: 42 },
];

/**
 * Records the outcome of today's listing. This is performed standing in a
 * corridor, so the date presets come before the picker and the whole thing
 * works with the radio off.
 */
export function AdjournSheet({ record, open, onClose, onDone }: AdjournSheetProps) {
  const online = useOnline();
  const [nextDate, setNextDate] = useState(toInputDate(addDays(new Date(), 14)));
  const [stage, setStage] = useState<StageId>(record.stage);
  const [purpose, setPurpose] = useState(record.purpose ?? '');
  const [note, setNote] = useState('');
  const [disposed, setDisposed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    if (!disposed && !nextDate) {
      toast('Pick the next date, or mark the matter disposed', 'error');
      return;
    }

    setSaving(true);
    const payload = { nextDate: disposed ? null : nextDate, stage, purpose, note, disposed };
    let saved: CaseRecord | undefined;

    try {
      if (!online) {
        await enqueue({
          url: `/api/cases/${record.id}/adjourn`,
          method: 'POST',
          body: payload,
          label: `Next date for ${record.crn || record.party1}`,
        });
        toast('Recorded on device — will sync when online', 'success');
      } else {
        saved = await casesApi.adjourn(record.id, payload);
        await updateCachedCase(saved);
        void revalidateDiary();
        toast(disposed ? 'Matter marked disposed' : 'Next date recorded', 'success');
      }
      onDone(saved);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not record the date', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      title="Record next date"
      description={`${record.party1} v. ${record.party2}`}
      onClose={onClose}
      size="lg"
    >
      <div className="flex flex-col gap-space-lg">
        <div className="flex items-center justify-between gap-space-md rounded-md bg-surface-container-low p-space-md">
          <div className="min-w-0">
            <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
              Heard on
            </p>
            <p className="tnum text-label-lg text-on-surface">{formatDate(record.nextDate)}</p>
          </div>
          <Icon name="arrowRight" size={18} className="shrink-0 text-on-surface-variant" />
          <div className="min-w-0 text-right">
            <p className="text-label-sm uppercase tracking-wide text-on-surface-variant">
              Becomes
            </p>
            <p className="tnum text-label-lg text-primary">
              {disposed ? 'Disposed' : formatDate(nextDate || null)}
            </p>
          </div>
        </div>

        {!disposed ? (
          <>
            <div className="flex flex-col gap-space-sm">
              <span className="text-label-md text-on-surface-variant">Adjourn by</span>
              <div className="grid grid-cols-2 gap-space-sm sm:grid-cols-4">
                {QUICK_JUMPS.map((j) => {
                  const value = toInputDate(addDays(new Date(), j.days));
                  const active = value === nextDate;
                  return (
                    <button
                      key={j.days}
                      type="button"
                      onClick={() => setNextDate(value)}
                      aria-pressed={active}
                      className={cn(
                        'press min-h-11 whitespace-nowrap rounded-full px-space-md text-label-md transition-colors',
                        active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
                      )}
                    >
                      {j.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-space-base sm:grid-cols-2">
              <Field label="Next date of hearing" required>
                {(ids) => (
                  <DatePicker ids={ids} value={nextDate} onChange={setNextDate} />
                )}
              </Field>

              <Field label="Next stage">
                {(ids) => (
                  <Select
                    ids={ids}
                    value={stage}
                    onChange={(v) => setStage(v as StageId)}
                    options={STAGES.map((s) => ({ value: s.id, label: s.label }))}
                  />
                )}
              </Field>
            </div>

            <Field label="Listed for">
              {(ids) => (
                <>
                  <TextInput
                    ids={ids}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    list="adjourn-purpose"
                    placeholder="Arguments"
                  />
                  <datalist id="adjourn-purpose">
                    {PURPOSE_SUGGESTIONS.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>
          </>
        ) : null}

        <Field label="What happened today" hint="Goes into the procedural history">
          {(ids) => (
            <TextArea
              ids={ids}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Passover granted, part-heard, next for cross…"
            />
          )}
        </Field>

        <button
          type="button"
          role="switch"
          aria-checked={disposed}
          onClick={() => setDisposed((d) => !d)}
          className={cn(
            'flex items-center justify-between gap-space-md rounded-md p-space-md text-left transition-colors',
            disposed
              ? 'bg-success-container text-on-success-container'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high',
          )}
        >
          <span className="flex items-center gap-space-sm">
            <Icon name="check" size={18} />
            <span className="flex flex-col">
              <span className="text-label-lg">Matter disposed of</span>
              <span className="text-label-md opacity-70">Closes the file — no next date</span>
            </span>
          </span>
          <span
            className={cn(
              'h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors',
              disposed ? 'bg-success' : 'bg-outline/40',
            )}
          >
            <span
              className={cn(
                'block h-5 w-5 rounded-full bg-white transition-transform',
                disposed && 'translate-x-4',
              )}
            />
          </span>
        </button>

        <div className="flex gap-space-sm">
          <Button variant="secondary" size="lg" onClick={onClose} className="hidden sm:inline-flex">
            Cancel
          </Button>
          <Button
            size="lg"
            block
            loading={saving}
            icon={online ? 'check' : 'offline'}
            onClick={submit}
            className="sm:flex-1"
          >
            {saving ? 'Recording…' : disposed ? 'Mark disposed' : 'Commit to diary'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
