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

/**
 * The track carries no surface of its own.  A filled container behind the
 * segments reads as a third colour between the page and the choices: it
 * flattens the contrast between selected and unselected and hides the shape
 * of each segment.  The segments supply their own fill, so this only spaces
 * them.
 */
export function ConnectedSegmentTrack({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn('flex items-stretch gap-1', className)}>
      {children}
    </div>
  );
}

/**
 * Colour for one segment.  Unselected segments take a soft wash of the same
 * hue as the selected one, so the group reads as one set of choices rather
 * than as a button beside some grey boxes.
 */
export function connectedSegmentTone(
  active: boolean,
  accent: 'primary' | 'secondary' = 'primary',
): string {
  if (accent === 'secondary') {
    return active
      ? 'bg-secondary text-on-secondary shadow-e1'
      : 'bg-secondary/[0.14] text-on-surface-variant hover:bg-secondary/25 hover:text-on-surface dark:bg-secondary/20 dark:hover:bg-secondary/30';
  }
  return active
    ? 'bg-primary text-on-primary shadow-e1'
    : 'bg-primary/[0.09] text-on-surface-variant hover:bg-primary/[0.18] hover:text-primary dark:bg-primary/25 dark:hover:bg-primary/40';
}
