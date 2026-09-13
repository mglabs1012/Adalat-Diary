'use client';

import { cn } from '@/lib/utils/cn';

interface Segment<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface SegmentedTabsProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}

/** Rounded track (12px) housing inner pill selectors - Material 3 Expressive. */
export function SegmentedTabs<T extends string>({ segments, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      className="no-scrollbar flex items-center gap-space-xs overflow-x-auto rounded-md bg-surface-container-high p-1"
    >
      {segments.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.id)}
            className={cn(
              'min-w-max flex-1 whitespace-nowrap rounded px-space-md py-2 text-label-md transition-all',
              active
                ? 'bg-surface-container-lowest text-primary shadow-e1'
                : 'text-on-surface-variant hover:text-primary',
            )}
          >
            {s.label}
            {typeof s.count === 'number' && s.count > 0 ? (
              <span className="tnum ml-1 opacity-70">{s.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
