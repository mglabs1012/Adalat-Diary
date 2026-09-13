'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';
import { Popover } from './Popover';

export interface SelectOption {
  value: string;
  label: string;
  /** Secondary line, shown dimmed under the label. */
  hint?: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps {
  ids: { id: string; describedBy?: string; invalid: boolean };
  value: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  /** Forces the filter box on or off; otherwise it appears past 12 options. */
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

const SEARCHABLE_FROM = 12;

/**
 * The app's dropdown.
 *
 * A native <select> cannot be styled inside — its option list is drawn by the
 * OS, so a 93-item grouped list gets no headings worth reading, no search and
 * no room for a second line. This keeps the trigger identical to every other
 * field and renders the list ourselves, following the ARIA combobox pattern:
 * the trigger owns focus throughout and points at the active option with
 * `aria-activedescendant`, so nothing needs to be re-implemented for
 * screen readers.
 */
export function Select({
  ids,
  value,
  onChange,
  options,
  groups,
  placeholder = 'Select…',
  searchable,
  disabled,
  className,
}: SelectProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeahead = useRef({ buffer: '', at: 0 });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const allGroups = useMemo<SelectGroup[]>(
    () => groups ?? [{ label: '', options: options ?? [] }],
    [groups, options],
  );

  const flat = useMemo(() => allGroups.flatMap((g) => g.options), [allGroups]);
  const selected = useMemo(() => flat.find((o) => o.value === value), [flat, value]);

  const showSearch = searchable ?? flat.length > SEARCHABLE_FROM;

  const filtered = useMemo<SelectGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups
      .map((g) => ({
        ...g,
        options: g.options.filter(
          (o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.options.length);
  }, [allGroups, query]);

  const visible = useMemo(() => filtered.flatMap((g) => g.options), [filtered]);

  const optionId = (index: number) => `${ids.id}-opt-${index}`;

  const openList = useCallback(() => {
    if (disabled) return;
    setQuery('');
    const at = Math.max(0, flat.findIndex((o) => o.value === value));
    setActiveIndex(at);
    setOpen(true);
  }, [disabled, flat, value]);

  const commit = useCallback(
    (option?: SelectOption) => {
      if (option) onChange(option.value);
      setOpen(false);
      trigger.current?.focus();
    },
    [onChange],
  );

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)?.scrollIntoView({
      block: 'nearest',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, query]);

  useEffect(() => {
    if (open && showSearch) searchRef.current?.focus();
  }, [open, showSearch]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(visible.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(visible.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        commit(visible[activeIndex]);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        // Typeahead, for the lists without a search box.
        if (!showSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          const now = Date.now();
          const buffer = now - typeahead.current.at > 700 ? e.key : typeahead.current.buffer + e.key;
          typeahead.current = { buffer, at: now };
          const hit = visible.findIndex((o) => o.label.toLowerCase().startsWith(buffer.toLowerCase()));
          if (hit >= 0) setActiveIndex(hit);
        }
    }
  }

  let cursor = -1;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        id={ids.id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${ids.id}-list` : undefined}
        aria-activedescendant={open && visible.length ? optionId(activeIndex) : undefined}
        aria-describedby={ids.describedBy}
        aria-invalid={ids.invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          'field flex items-center justify-between gap-space-sm text-left',
          ids.invalid && 'field-error',
          open && 'border-primary',
          className,
        )}
      >
        <span className={cn('min-w-0 truncate', !selected && 'text-on-surface-variant/70')}>
          {selected?.label ?? placeholder}
        </span>
        <Icon
          name="chevron"
          size={16}
          className={cn(
            'shrink-0 text-on-surface-variant transition-transform',
            open ? '-rotate-90' : 'rotate-90',
          )}
        />
      </button>

      {/* Capped so a long list reads as a dropdown, not a full-height panel. */}
      <Popover anchor={trigger} open={open} onClose={() => setOpen(false)} matchWidth maxHeight={340}>
        {showSearch ? (
          <div className="shrink-0 border-b border-outline-variant/60 p-space-sm">
            <div className="flex h-10 items-center gap-space-xs rounded bg-surface-container-low px-space-sm">
              <Icon name="search" size={15} className="shrink-0 text-on-surface-variant" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Filter…"
                aria-label="Filter options"
                className="min-w-0 flex-1 bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60"
              />
            </div>
          </div>
        ) : null}

        <div
          ref={listRef}
          id={`${ids.id}-list`}
          role="listbox"
          aria-label="Options"
          className="min-h-0 flex-1 overflow-y-auto py-space-xs"
        >
          {visible.length === 0 ? (
            <p className="px-space-md py-space-lg text-center text-body-sm text-on-surface-variant">
              Nothing matches “{query}”
            </p>
          ) : (
            filtered.map((group) => (
              <div key={group.label || 'ungrouped'} role="group" aria-label={group.label || undefined}>
                {group.label ? (
                  <p className="sticky top-0 bg-surface-container-lowest px-space-md pb-1 pt-space-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                    {group.label}
                  </p>
                ) : null}
                {group.options.map((option) => {
                  cursor += 1;
                  const index = cursor;
                  const isActive = index === activeIndex;
                  const isSelected = option.value === value;
                  return (
                    <div
                      key={option.value}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isSelected}
                      onPointerEnter={() => setActiveIndex(index)}
                      onClick={() => commit(option)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-space-sm px-space-md py-2.5 text-body-md',
                        isActive && 'bg-surface-container',
                        isSelected ? 'font-semibold text-primary' : 'text-on-surface',
                      )}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{option.label}</span>
                        {option.hint ? (
                          <span className="truncate text-label-md font-normal text-on-surface-variant">
                            {option.hint}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? <Icon name="tick" size={15} className="shrink-0 text-primary" /> : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </Popover>
    </>
  );
}
