'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

interface AppBarProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  actions?: ReactNode;
  /** Match the container the screen below uses, so the title lines up with it. */
  width?: 'page' | 'form';
}

/**
 * Level 2 sticky surface. Translucent and blurred so a long cause list reads
 * as scrolling *under* the chrome rather than being clipped by it.
 *
 * On desktop it starts after the sidebar and drops the brand mark — the
 * sidebar already carries it — leaving the title room to breathe.
 */
export function AppBar({ title, subtitle, back, actions, width = 'page' }: AppBarProps) {
  const router = useRouter();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-transparent bg-surface/85 pt-safe backdrop-blur-xl shadow-[0_1px_8px_rgba(11,31,51,0.04)] lg:left-side-nav lg:border-on-surface/8 lg:shadow-none">
      <div
        className={
          (width === 'form' ? 'page-form' : 'page') +
          ' flex h-14 items-center justify-between gap-space-sm lg:h-16'
        }
      >
        <div className="flex min-w-0 flex-1 items-center gap-space-xs">
          {back ? (
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="press -ml-2 flex h-11 w-11 items-center justify-center rounded text-on-surface hover:bg-surface-container"
            >
              <Icon name="back" size={22} />
            </button>
          ) : (
            <span className="mr-space-xxs flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/25 lg:hidden">
              <Icon name="scale" size={20} />
            </span>
          )}
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate font-display text-headline-sm leading-tight text-primary lg:text-headline-md">
              {title}
            </h1>
            {subtitle ? (
              <span className="truncate text-label-sm uppercase tracking-wide text-on-surface-variant">
                {subtitle}
              </span>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-shrink-0 items-center gap-space-xxs">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function AppBarButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={
        'press flex h-10 w-10 items-center justify-center rounded transition-colors ' +
        (active
          ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
          : 'text-on-surface-variant hover:bg-surface-container hover:text-primary')
      }
    >
      <Icon name={icon} size={19} />
    </button>
  );
}
