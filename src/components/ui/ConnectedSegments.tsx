import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Geometry shared by the app's connected controls.  An active choice becomes
 * a pill, the middle inactive choices remain rounded rectangles, and only the
 * outer ends carry the full track radius.  Keeping this separate from colour
 * lets a primary filter and an amber theme selector share the same behaviour.
 */
export function connectedSegmentShape(active: boolean, index: number, count: number): string {
  if (active || count <= 1) return 'rounded-full';
  if (index === 0) return 'rounded-l-full rounded-r-md';
  if (index === count - 1) return 'rounded-l-md rounded-r-full';
  return 'rounded-md';
}

export function ConnectedSegmentTrack({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('flex items-stretch gap-0.5 rounded-full bg-surface-container-high p-1', className)}
    >
      {children}
    </div>
  );
}
