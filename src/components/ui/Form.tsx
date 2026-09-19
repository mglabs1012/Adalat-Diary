'use client';

import {
  useId,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils/cn';
import { connectedSegmentShape } from '@/components/ui/ConnectedSegments';
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
  iconTone = 'secondary',
  collapsible,
  defaultOpen = true,
  openWhen = false,
  children,
}: {
  title: string;
  icon?: IconName;
  description?: string;
  aside?: ReactNode;
  iconTone?: 'secondary' | 'tertiary' | 'primary';
  /** Turns the header into a disclosure button with a rotating chevron. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Keeps a disclosure visible while one of its contained fields is invalid. */
  openWhen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
  const bodyId = useId();
  const visible = open || openWhen;
  const iconToneClass =
    iconTone === 'tertiary'
      ? 'bg-tertiary/10 text-tertiary ring-tertiary/20'
      : iconTone === 'primary'
        ? 'bg-primary/10 text-primary ring-primary/20'
        : 'bg-secondary/10 text-secondary ring-secondary/20';

  const heading = (
    <>
      <div className="flex min-w-0 items-start gap-space-sm">
        {icon ? (
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', iconToneClass)}>
            <Icon name={icon} size={18} />
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
        <span className="flex shrink-0 items-center gap-space-sm">
          {aside}
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
            <Icon
              name="chevron"
              size={16}
              className={cn('transition-transform', visible && 'rotate-90')}
            />
          </span>
        </span>
      ) : (
        aside
      )}
    </>
  );

  const headerClass =
    'flex w-full items-start justify-between gap-space-md px-space-lg pt-space-lg pb-space-md';

  return (
    <section className="card overflow-hidden rounded-xl">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={visible}
          aria-controls={bodyId}
          className={cn(headerClass, 'transition-colors hover:bg-surface-container-low', visible && 'border-b border-on-surface/5')}
        >
          {heading}
        </button>
      ) : (
        <header className={cn(headerClass, 'border-b border-on-surface/5')}>{heading}</header>
      )}

      <div id={bodyId} hidden={!visible} className="px-space-lg pb-space-lg lg:pb-space-xl">
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
      className="grid gap-0.5 rounded-full bg-surface-container-high p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o, index) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex min-h-12 flex-col items-center justify-center px-space-sm py-space-sm text-label-md transition-colors',
              connectedSegmentShape(active, index, options.length),
              active
                ? 'bg-primary text-on-primary shadow-e1'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-lowest hover:text-primary',
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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-on-surface/8 bg-surface/95 px-screen-margin pb-form-footer pt-space-md shadow-nav-up backdrop-blur-xl lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none lg:backdrop-blur-none">
      <div className="mx-auto flex max-w-screen-sm items-center gap-space-sm lg:max-w-form lg:justify-end">
        {children}
      </div>
    </div>
  );
}
