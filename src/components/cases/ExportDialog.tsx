'use client';

import { useState } from 'react';
import { toInputDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { useDiaryPdf } from '@/hooks/useDiaryPdf';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { DatePicker, Field, Select } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { ConnectedSegmentTrack, connectedSegmentShape } from '@/components/ui/ConnectedSegments';

type Span = 'day' | 'month';

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date(2026, i, 1)),
);

/**
 * Picks what to put in the PDF. Deliberately two choices, not a date-range
 * picker: a cause list is a day, and a diary is a month. Anything else is a
 * report, which is not what this is for.
 */
export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { busy, shareDay, shareMonth } = useDiaryPdf();
  const today = new Date();

  const [span, setSpan] = useState<Span>('day');
  const [day, setDay] = useState(toInputDate(today));
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const years = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i);

  async function run() {
    if (span === 'day') {
      if (!day) return;
      const [y, m, d] = day.split('-').map(Number);
      await shareDay(new Date(y, m - 1, d));
    } else {
      await shareMonth(new Date(year, month, 1));
    }
    onClose();
  }

  return (
    <Sheet
      open={open}
      title="Share as PDF"
      description="A cause list for one day, or the whole month's diary"
      onClose={onClose}
    >
      <div className="flex flex-col gap-space-lg">
        <ConnectedSegmentTrack
          role="radiogroup"
          aria-label="What to include"
        >
          {(
            [
              ['day', 'A single day', 'diary'],
              ['month', 'A whole month', 'archive'],
            ] as const
          ).map(([id, label, icon], index, choices) => (
            <button
              key={id}
              role="radio"
              aria-checked={span === id}
              onClick={() => setSpan(id)}
              className={cn(
                'flex min-h-11 flex-1 items-center justify-center gap-space-xs px-space-sm text-label-md transition-all',
                connectedSegmentShape(span === id, index, choices.length),
                span === id
                  ? 'bg-primary text-on-primary shadow-e1'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-lowest hover:text-primary',
              )}
            >
              <Icon name={icon} size={15} />
              {label}
            </button>
          ))}
        </ConnectedSegmentTrack>

        {span === 'day' ? (
          <Field label="Date" hint="Every matter carrying this next date">
            {(ids) => <DatePicker ids={ids} value={day} onChange={setDay} />}
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-space-base">
            <Field label="Month">
              {(ids) => (
                <Select
                  ids={ids}
                  value={String(month)}
                  onChange={(v) => setMonth(Number(v))}
                  options={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
                />
              )}
            </Field>
            <Field label="Year">
              {(ids) => (
                <Select
                  ids={ids}
                  value={String(year)}
                  onChange={(v) => setYear(Number(v))}
                  options={years.map((y) => ({ value: String(y), label: String(y) }))}
                />
              )}
            </Field>
          </div>
        )}

        <p className="flex items-start gap-space-xs rounded bg-surface-container-low px-space-md py-space-sm text-body-sm text-on-surface-variant">
          <Icon name="note" size={15} className="mt-0.5 shrink-0 text-secondary" />
          {span === 'month'
            ? 'Each day gets its own table, in date order, with a running page count.'
            : 'One table of every matter listed on that date.'}
        </p>

        <div className="flex gap-space-sm">
          <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            size="lg"
            className="flex-1"
            icon="share"
            loading={busy !== null}
            onClick={run}
          >
            {busy ? 'Building…' : 'Share PDF'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
