'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDate, startOfDay, toInputDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';
import { Popover } from './Popover';

interface DatePickerProps {
  ids: { id: string; describedBy?: string; invalid: boolean };
  /** yyyy-MM-dd, or '' for empty — the same shape <input type="date"> used. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date(2026, i, 1)),
);

function parse(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Monday-first grid of the 6 weeks covering `month`. */
function buildGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  // getDay() is Sunday-first; shift so Monday is column 0.
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - lead);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/**
 * The app's date field.
 *
 * The native picker is a different control in every browser — Chrome's grid,
 * Firefox's, Safari's wheel — and none of them take our type or colours. A
 * court diary is mostly *dates*, so they may as well look like the app: same
 * trigger as every other field, and a calendar that marks today in ochre and
 * the selection in navy, exactly as the docket does.
 */
export function DatePicker({
  ids,
  value,
  onChange,
  min,
  max,
  placeholder = 'Pick a date',
  disabled,
  className,
}: DatePickerProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const dialogId = `${ids.id}-calendar`;

  const selected = useMemo(() => parse(value), [value]);
  const [cursor, setCursor] = useState<Date>(() => selected ?? startOfDay());

  // Reopening should land on the selected month, not wherever we left off.
  useEffect(() => {
    if (open) setCursor(selected ?? startOfDay());
  }, [open, selected]);

  const minDate = useMemo(() => (min ? parse(min) : null), [min]);
  const maxDate = useMemo(() => (max ? parse(max) : null), [max]);

  const today = startOfDay();
  const grid = useMemo(() => buildGrid(cursor), [cursor]);

  const outOfRange = (d: Date) =>
    (minDate ? d < startOfDay(minDate) : false) || (maxDate ? d > startOfDay(maxDate) : false);

  const shiftMonth = (by: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + by, 1));

  function pick(d: Date) {
    if (outOfRange(d)) return;
    onChange(toInputDate(d));
    setOpen(false);
    trigger.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (step[e.key]) {
      e.preventDefault();
      const base = selected ?? today;
      const next = new Date(base);
      next.setDate(base.getDate() + step[e.key]);
      if (!outOfRange(next)) {
        onChange(toInputDate(next));
        setCursor(new Date(next.getFullYear(), next.getMonth(), 1));
      }
    }
  }

  const years = useMemo(() => {
    const base = cursor.getFullYear();
    return Array.from({ length: 11 }, (_, i) => base - 5 + i);
  }, [cursor]);

  return (
    <>
      {/* combobox rather than a plain button: the trigger holds a value and
          opens a popup, and only that role admits aria-invalid. */}
      <button
        ref={trigger}
        type="button"
        id={ids.id}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-describedby={ids.describedBy}
        aria-invalid={ids.invalid || undefined}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          'field flex items-center justify-between gap-space-sm text-left',
          ids.invalid && 'field-error',
          open && 'border-primary',
          className,
        )}
      >
        <span className={cn('tnum min-w-0 truncate', !selected && 'text-on-surface-variant/70')}>
          {selected ? formatDate(selected) : placeholder}
        </span>
        <Icon name="diary" size={16} className="shrink-0 text-on-surface-variant" />
      </button>

      <Popover anchor={trigger} open={open} onClose={() => setOpen(false)} minHeight={340}>
        <div id={dialogId} role="dialog" aria-label="Choose a date" className="w-[19rem] p-space-md">
          {/* Month / year, each its own control so a far-off date is two taps. */}
          <div className="flex items-center gap-space-xs">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
            >
              <Icon name="chevron" size={15} className="rotate-180" />
            </button>

            <select
              value={cursor.getMonth()}
              onChange={(e) => setCursor(new Date(cursor.getFullYear(), Number(e.target.value), 1))}
              aria-label="Month"
              className="field-select h-9 min-w-0 flex-1 cursor-pointer rounded bg-transparent px-space-sm text-label-lg text-primary outline-none hover:bg-surface-container"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={cursor.getFullYear()}
              onChange={(e) => setCursor(new Date(Number(e.target.value), cursor.getMonth(), 1))}
              aria-label="Year"
              className="field-select tnum h-9 w-[4.75rem] shrink-0 cursor-pointer rounded bg-transparent px-space-sm text-label-lg text-primary outline-none hover:bg-surface-container"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
            >
              <Icon name="chevron" size={15} />
            </button>
          </div>

          <div className="mt-space-sm grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((d, i) => (
              <span
                key={`${d}-${i}`}
                aria-hidden
                className="flex h-7 items-center justify-center text-label-sm uppercase text-on-surface-variant"
              >
                {d}
              </span>
            ))}

            {grid.map((d) => {
              const otherMonth = d.getMonth() !== cursor.getMonth();
              const isToday = d.getTime() === today.getTime();
              const isSelected = selected ? d.getTime() === startOfDay(selected).getTime() : false;
              const blocked = outOfRange(d);

              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  disabled={blocked}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSelected}
                  onClick={() => pick(d)}
                  className={cn(
                    'tnum flex h-9 items-center justify-center rounded text-body-md transition-colors',
                    blocked && 'cursor-not-allowed opacity-30',
                    !blocked && !isSelected && 'hover:bg-surface-container',
                    otherMonth ? 'text-on-surface-variant/45' : 'text-on-surface',
                    isToday && !isSelected && 'font-semibold text-secondary ring-1 ring-inset ring-secondary/50',
                    isSelected && 'bg-primary font-semibold text-on-primary hover:bg-primary',
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-space-sm flex items-center justify-between gap-space-sm border-t border-outline-variant/60 pt-space-sm">
            <button
              type="button"
              onClick={() => pick(today)}
              disabled={outOfRange(today)}
              className="press rounded-full px-space-md py-1.5 text-label-md text-primary hover:bg-surface-container disabled:opacity-40"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
                trigger.current?.focus();
              }}
              className="press rounded-full px-space-md py-1.5 text-label-md text-on-surface-variant hover:bg-surface-container"
            >
              Clear
            </button>
          </div>
        </div>
      </Popover>
    </>
  );
}
