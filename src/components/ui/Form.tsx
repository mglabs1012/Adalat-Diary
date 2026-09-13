'use client';

import {
  useId,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils/cn';
import { Icon, type IconName } from './Icon';

/**
 * The form kit. Every control shares one geometry, one focus treatment and one
 * way of showing an error, so a form reads as a single object rather than a
 * pile of inputs. Labels are always visible — a floating label that collapses
 * into the field is the wrong trade when a user is copying a CRN off a docket
 * sheet and needs to see what each box wants.
 */

/* ── Section ──────────────────────────────────────────────────────────────── */

export function FormSection({
  title,
  icon,
  description,
  aside,
  collapsible,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: IconName;
  description?: string;
  aside?: ReactNode;
  /** Turns the header into a disclosure button with a rotating chevron. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
  const bodyId = useId();

  const heading = (
    <>
      <div className="flex min-w-0 items-start gap-space-sm">
        {icon ? (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
            <Icon name={icon} size={16} />
          </span>
        ) : null}
        <div className="min-w-0 text-left">
          <h2 className="font-display text-headline-sm text-primary">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-body-sm text-on-surface-variant">{description}</p>
          ) : null}
        </div>
      </div>
      {collapsible ? (
        <Icon
          name="chevron"
          size={16}
          className={cn(
            'mt-1 shrink-0 text-on-surface-variant transition-transform',
            open && 'rotate-90',
          )}
        />
      ) : (
        aside
      )}
    </>
  );

  const headerClass =
    'flex w-full items-start justify-between gap-space-md bg-surface-container-low/60 px-space-base py-space-md';

  return (
    <section className="card overflow-hidden">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
          className={cn(headerClass, 'transition-colors hover:bg-surface-container-low', open && 'border-b border-on-surface/5')}
        >
          {heading}
        </button>
      ) : (
        <header className={cn(headerClass, 'border-b border-on-surface/5')}>{heading}</header>
      )}

      <div id={bodyId} hidden={!open} className="p-space-base lg:p-space-lg">
        {children}
      </div>
    </section>
  );
}

/** Responsive field grid: one column on a phone, two from `md` up. */
export function FormGrid({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 }) {
  return (
    <div
      className={cn(
        'grid gap-space-base',
        columns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1',
      )}
    >
      {children}
    </div>
  );
}

/** Makes a field span the full width inside a two-column grid. */
export function FormRow({ children }: { children: ReactNode }) {
  return <div className="md:col-span-2">{children}</div>;
}

/* ── Field wrapper ────────────────────────────────────────────────────────── */

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** Rendered right of the label — a counter, or an optional marker. */
  meta?: ReactNode;
  /**
   * `onDark` re-tones the label, hint, error and required marker together.
   * The auth screens sit on a fixed deep-navy panel where the theme's
   * on-surface colours do not apply.
   */
  tone?: 'default' | 'onDark';
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

export function Field({
  label,
  required,
  error,
  hint,
  meta,
  tone = 'default',
  children,
}: FieldProps) {
  const dark = tone === 'onDark';
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-space-xs">
      <div className="flex items-baseline justify-between gap-space-sm">
        <label
          htmlFor={id}
          className={cn('text-label-md', dark ? 'text-[#b3bccd]' : 'text-on-surface-variant')}
        >
          {label}
          {required ? (
            <>
              <span aria-hidden className={cn('ml-0.5', dark ? 'text-[#ffb4ab]' : 'text-error')}>
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          ) : null}
        </label>
        {meta}
      </div>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className={cn(
            'flex items-start gap-1 text-label-md',
            dark ? 'text-[#ffb4ab]' : 'text-error',
          )}
        >
          <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p
          id={hintId}
          className={cn('text-label-md', dark ? 'text-[#8e99ad]' : 'text-on-surface-variant/80')}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ── Controls ─────────────────────────────────────────────────────────────── */

type Ids = { id: string; describedBy?: string; invalid: boolean };

export function TextInput({
  ids,
  className,
  leading,
  iconClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  ids: Ids;
  leading?: IconName;
  iconClassName?: string;
}) {
  const input = (
    <input
      {...props}
      id={ids.id}
      aria-describedby={ids.describedBy}
      aria-invalid={ids.invalid || undefined}
      className={cn('field', leading && 'pl-10', ids.invalid && 'field-error', className)}
    />
  );

  if (!leading) return input;
  return (
    <div className="relative">
      <Icon
        name={leading}
        size={17}
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant',
          iconClassName,
        )}
      />
      {input}
    </div>
  );
}

/**
 * Dropdowns and dates are custom controls, not native ones — see Select.tsx
 * and DatePicker.tsx for why. Re-exported here so a form imports every control
 * it needs from one place.
 */
export { Select } from './Select';
export type { SelectOption, SelectGroup } from './Select';
export { DatePicker } from './DatePicker';

export function TextArea({
  ids,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ids: Ids }) {
  return (
    <textarea
      {...props}
      id={ids.id}
      aria-describedby={ids.describedBy}
      aria-invalid={ids.invalid || undefined}
      className={cn('field field-textarea', ids.invalid && 'field-error', className)}
    />
  );
}

/** Two-or-three-way choice, sized as a real tap target rather than a radio dot. */
export function SegmentedInput<T extends string>({
  options,
  value,
  onChange,
  ids,
}: {
  options: readonly { id: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  ids?: Ids;
}) {
  return (
    <div
      role="radiogroup"
      aria-describedby={ids?.describedBy}
      className="grid gap-space-sm"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex min-h-12 flex-col items-center justify-center rounded px-space-sm py-space-sm text-label-md transition-colors',
              active
                ? 'bg-primary text-on-primary shadow-e1'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high',
            )}
          >
            {o.label}
            {o.hint ? (
              <span className={cn('text-label-sm font-normal', active ? 'opacity-70' : 'opacity-60')}>
                {o.hint}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Checkbox with a full-row hit target — a 16px box alone is not tappable. */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  tone = 'default',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  tone?: 'default' | 'onDark';
}) {
  const dark = tone === 'onDark';
  return (
    <label
      className={cn(
        'flex cursor-pointer select-none items-start gap-space-sm rounded py-space-xs',
        dark ? 'text-[#b3bccd]' : 'text-on-surface-variant',
      )}
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-sm border transition-colors',
            checked
              ? dark
                ? 'border-primary-fixed-dim bg-primary-fixed-dim text-on-primary-fixed'
                : 'border-primary bg-primary text-on-primary'
              : dark
                ? 'border-white/30'
                : 'border-outline',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
            dark ? 'peer-focus-visible:ring-primary-fixed-dim' : 'peer-focus-visible:ring-primary',
          )}
        >
          {checked ? <Icon name="tick" size={13} /> : null}
        </span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-label-lg">{label}</span>
        {hint ? (
          <span className={cn('text-label-md', dark ? 'text-[#8e99ad]' : 'text-on-surface-variant/80')}>
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/* ── Actions ──────────────────────────────────────────────────────────────── */

/**
 * Sticky at the bottom of the viewport on a phone (thumb reach), inline at the
 * end of the form on desktop (where a floating bar just wastes a strip).
 */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-screen-margin border-t border-on-surface/5 bg-surface/92 px-screen-margin py-space-md backdrop-blur-xl lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:backdrop-blur-none">
      <div className="flex items-center gap-space-sm lg:justify-end">{children}</div>
    </div>
  );
}
