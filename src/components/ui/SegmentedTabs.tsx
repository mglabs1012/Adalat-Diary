'use client';

import { cn } from '@/lib/utils/cn';
import { ConnectedSegmentTrack, connectedSegmentShape } from '@/components/ui/ConnectedSegments';

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
    <ConnectedSegmentTrack
      role="tablist"
      className="no-scrollbar overflow-x-auto"
    >
      {segments.map((s, index) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s.id)}
            className={cn(
              'min-w-max flex-1 whitespace-nowrap px-space-md py-2 text-label-md transition-all',
              connectedSegmentShape(active, index, segments.length),
              active
                ? 'bg-primary text-on-primary shadow-e1'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-lowest hover:text-primary',
            )}
          >
            {s.label}
            {typeof s.count === 'number' && s.count > 0 ? (
              <span className="tnum ml-1 opacity-70">{s.count}</span>
            ) : null}
          </button>
        );
      })}
    </ConnectedSegmentTrack>
  );
}
