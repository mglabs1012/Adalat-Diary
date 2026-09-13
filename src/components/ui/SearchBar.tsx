'use client';

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

/** Pill omnibar, 48px tall, debounced so typing never fires a query per keystroke. */
export function SearchBar({ value, onChange, placeholder = 'Search CRN, party or court' }: SearchBarProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), 280);
    return () => clearTimeout(t);
  }, [local, value, onChange]);

  return (
    <div className="flex h-12 items-center gap-space-sm rounded-full border border-on-surface/10 bg-surface-container-lowest px-space-base shadow-e1">
      <Icon name="search" size={18} className="text-primary" />
      <input
        type="search"
        inputMode="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        aria-label="Search cases"
        className="min-w-0 flex-1 bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/70"
      />
      {local ? (
        <button
          onClick={() => {
            setLocal('');
            onChange('');
          }}
          aria-label="Clear search"
          className="press flex h-7 w-7 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
        >
          <Icon name="close" size={13} />
        </button>
      ) : null}
    </div>
  );
}
