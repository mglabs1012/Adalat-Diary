import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

type LoaderSize = 'sm' | 'md' | 'lg';

const DOT_SIZE: Record<LoaderSize, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-3 w-3',
};

/**
 * A compact, four-dot loading wave. It reads as active without the visual
 * weight of a spinner, and it works equally well inside a button or as a
 * route-level wait state.
 */
export function WavyLoader({
  size = 'md',
  label = 'Loading',
  className,
  ...props
}: {
  size?: LoaderSize;
  label?: string;
} & Omit<ComponentProps<'span'>, 'children'>) {
  return (
    <span
      {...props}
      role="status"
      aria-label={label}
      className={cn('inline-flex shrink-0 items-center justify-center gap-1', className)}
    >
      {['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-success'].map((color, index) => (
        <span
          key={color}
          aria-hidden="true"
          className={cn('wavy-loader-dot rounded-full', DOT_SIZE[size], color)}
          style={{ animationDelay: `${index * 110}ms` }}
        />
      ))}
    </span>
  );
}
