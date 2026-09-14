'use client';

import { useCallback, useRef, useState } from 'react';
import { CSV_COLUMNS, CSV_TEMPLATE } from '@/lib/csv/columns';
import { parseImportFile, type ParsedCsv } from '@/lib/csv/import';
import { download } from '@/lib/utils/share';
import { cn } from '@/lib/utils/cn';
import { revalidateDiary } from '@/hooks/useCases';
import { toast } from '@/hooks/useToast';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Result {
  imported: number;
  updated: number;
  skipped: { line: number; reason: string }[];
}

type Stage = 'pick' | 'review' | 'done';

/**
 * CSV import. Three steps, never more: drop the file, look at what was read,
 * confirm. The format is stated on the first screen rather than hidden behind
 * a help link, because the commonest import failure is a wrong header row.
 */
export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('pick');
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const reset = useCallback(() => {
    setStage('pick');
    setDragging(false);
    setFilename('');
    setParsed(null);
    setOverwrite(false);
    setBusy(false);
    setResult(null);
  }, []);

  const close = useCallback(() => {
    onClose();
    // Let the exit finish before wiping the contents.
    setTimeout(reset, 200);
  }, [onClose, reset]);

  const readFile = useCallback(async (file: File) => {
    if (!/\.(csv|txt)$/i.test(file.name) && file.type !== 'text/csv') {
      toast('Choose a .csv file', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast('That file is over 2 MB — split it into smaller batches', 'error');
      return;
    }

    const text = await file.text();
    const data = parseImportFile(text);

    if (data.missingRequired.length) {
      toast(`Missing column${data.missingRequired.length === 1 ? '' : 's'}: ${data.missingRequired.join(', ')}`, 'error');
      return;
    }
    if (!data.rows.length) {
      toast('That file has a header but no rows', 'error');
      return;
    }

    setFilename(file.name);
    setParsed(data);
    setStage('review');
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void readFile(file);
    },
    [readFile],
  );

  async function submit() {
    if (!parsed || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/cases/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: parsed.valid.map((r) => ({ line: r.line, data: r.data })),
          overwrite,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'Import failed');

      setResult(body as Result);
      setStage('done');
      await revalidateDiary();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Import failed', 'error');
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      title="Import from a spreadsheet"
      description={
        stage === 'pick'
          ? 'Bring an existing diary in as a CSV file'
          : stage === 'review'
            ? filename
            : 'Import complete'
      }
      onClose={close}
      size="lg"
    >
      {stage === 'pick' ? (
        <div className="flex flex-col gap-space-lg">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center gap-space-sm rounded-lg border-2 border-dashed px-space-base py-space-2xl text-center transition-colors',
              dragging
                ? 'border-primary bg-primary/[0.06]'
                : 'border-outline-variant bg-surface-container-low/60',
            )}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-primary">
              <Icon name="download" size={26} className="rotate-180" />
            </span>
            <p className="font-display text-headline-sm text-primary">
              {dragging ? 'Drop it here' : 'Drag your CSV here'}
            </p>
            <p className="max-w-[38ch] text-body-sm text-on-surface-variant">
              Or choose a file from your device. Up to 500 rows at a time.
            </p>
            <Button
              variant="secondary"
              className="mt-space-xs"
              onClick={() => inputRef.current?.click()}
            >
              Choose file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
                e.target.value = '';
              }}
            />
          </div>

          <section className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between gap-space-sm">
              <h3 className="font-display text-label-lg text-primary">Accepted format</h3>
              <Button
                size="sm"
                variant="ghost"
                icon="download"
                onClick={() => {
                  download(new Blob([CSV_TEMPLATE], { type: 'text/csv' }), 'adalat-diary-template.csv');
                  toast('Template downloaded');
                }}
              >
                Template
              </Button>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              The first row must be the header. Columns can be in any order, and extra columns
              are ignored. Dates accept <span className="tnum">25/09/2026</span>,{' '}
              <span className="tnum">25-09-2026</span> or <span className="tnum">2026-09-25</span>.
            </p>

            <div className="overflow-x-auto rounded-md border border-outline-variant/60">
              <table className="w-full min-w-[34rem] border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-space-md py-space-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
                      Column
                    </th>
                    <th className="px-space-md py-space-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
                      Required
                    </th>
                    <th className="px-space-md py-space-sm text-label-sm uppercase tracking-wide text-on-surface-variant">
                      Example
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CSV_COLUMNS.map((c) => (
                    <tr key={c.key} className="border-t border-outline-variant/50">
                      <td className="px-space-md py-space-sm text-label-lg text-on-surface">
                        {c.header}
                        {c.note ? (
                          <span className="block text-label-md font-normal text-on-surface-variant">
                            {c.note}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-space-md py-space-sm">
                        {c.required ? (
                          <span className="pill bg-error-container px-2 py-0.5 text-label-sm uppercase text-on-error-container">
                            Required
                          </span>
                        ) : (
                          <span className="text-label-md text-on-surface-variant">Optional</span>
                        )}
                      </td>
                      <td className="tnum px-space-md py-space-sm text-body-sm text-on-surface-variant">
                        {c.example}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : stage === 'review' && parsed ? (
        <div className="flex flex-col gap-space-lg">
          <div className="grid grid-cols-2 gap-space-sm">
            <Tally label="Ready to import" value={parsed.valid.length} tone="ok" />
            <Tally label="With problems" value={parsed.invalid.length} tone={parsed.invalid.length ? 'warn' : 'ok'} />
          </div>

          {parsed.unknownColumns.length ? (
            <p className="flex items-start gap-space-xs rounded bg-surface-container-low px-space-md py-space-sm text-body-sm text-on-surface-variant">
              <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-secondary" />
              Ignoring {parsed.unknownColumns.length} unrecognised column
              {parsed.unknownColumns.length === 1 ? '' : 's'}: {parsed.unknownColumns.join(', ')}
            </p>
          ) : null}

          {parsed.invalid.length ? (
            <section className="flex flex-col gap-space-xs">
              <h3 className="text-label-lg text-primary">
                These rows will be skipped
              </h3>
              <ul className="max-h-48 overflow-y-auto rounded-md border border-outline-variant/60 divide-y divide-outline-variant/50">
                {parsed.invalid.slice(0, 50).map((r) => (
                  <li key={r.line} className="flex gap-space-sm px-space-md py-space-sm">
                    <span className="tnum shrink-0 text-label-md text-on-surface-variant">
                      Line {r.line}
                    </span>
                    <span className="text-body-sm text-error">{r.errors.join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {parsed.valid.length ? (
            <section className="flex flex-col gap-space-xs">
              <h3 className="text-label-lg text-primary">Preview</h3>
              <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                <table className="w-full min-w-[32rem] border-collapse text-left">
                  <thead>
                    <tr className="bg-surface-container-low">
                      {['CRN', 'Parties', 'Court', 'Next date'].map((h) => (
                        <th
                          key={h}
                          className="px-space-md py-space-sm text-label-sm uppercase tracking-wide text-on-surface-variant"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.valid.slice(0, 6).map((r) => (
                      <tr key={r.line} className="border-t border-outline-variant/50">
                        <td className="tnum px-space-md py-space-sm text-body-sm text-on-surface">
                          {r.data.crn}
                        </td>
                        <td className="px-space-md py-space-sm text-body-sm text-on-surface">
                          {r.data.party1} v. {r.data.party2}
                        </td>
                        <td className="px-space-md py-space-sm text-body-sm text-on-surface-variant">
                          {r.data.court}
                        </td>
                        <td className="tnum px-space-md py-space-sm text-body-sm text-on-surface-variant">
                          {r.data.nextDate ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.valid.length > 6 ? (
                <p className="text-label-md text-on-surface-variant">
                  …and {parsed.valid.length - 6} more
                </p>
              ) : null}
            </section>
          ) : null}

          <Checkbox
            checked={overwrite}
            onChange={setOverwrite}
            label="Update matters that already exist"
            hint="Matched on CRN. Leave off to skip anything already in your diary."
          />

          <div className="flex gap-space-sm">
            <Button variant="secondary" size="lg" onClick={reset} className="flex-1">
              Choose another file
            </Button>
            <Button
              size="lg"
              className="flex-1"
              icon="check"
              loading={busy}
              disabled={!parsed.valid.length}
              onClick={submit}
            >
              Import {parsed.valid.length}
            </Button>
          </div>
        </div>
      ) : result ? (
        <div className="flex flex-col gap-space-lg">
          <div className="flex flex-col items-center gap-space-sm py-space-base text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-container text-on-success-container">
              <Icon name="check" size={28} />
            </span>
            <p className="font-display text-headline-sm text-primary">
              {result.imported} matter{result.imported === 1 ? '' : 's'} imported
            </p>
            <p className="text-body-sm text-on-surface-variant">
              {result.updated ? `${result.updated} updated · ` : ''}
              {result.skipped.length
                ? `${result.skipped.length} skipped`
                : 'Nothing was skipped'}
            </p>
          </div>

          {result.skipped.length ? (
            <ul className="max-h-40 overflow-y-auto rounded-md border border-outline-variant/60 divide-y divide-outline-variant/50">
              {result.skipped.map((s) => (
                <li key={s.line} className="flex gap-space-sm px-space-md py-space-sm">
                  <span className="tnum shrink-0 text-label-md text-on-surface-variant">
                    Line {s.line}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">{s.reason}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <Button size="lg" block onClick={close}>
            Done
          </Button>
        </div>
      ) : null}
    </Sheet>
  );
}

function Tally({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'warn' }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-md p-space-md',
        tone === 'ok'
          ? 'bg-success-container text-on-success-container'
          : 'bg-error-container text-on-error-container',
      )}
    >
      <span className="tnum font-display text-headline-lg leading-none">{value}</span>
      <span className="mt-space-xs text-label-md uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}
