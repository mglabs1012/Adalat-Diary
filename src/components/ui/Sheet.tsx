'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

interface SheetProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  /** Caps the dialog width on desktop. */
  size?: 'md' | 'lg';
  children: ReactNode;
}

/**
 * Level 3 surface. A bottom sheet on a phone — it rises into the thumb — and a
 * centred dialog from `lg` up, where a full-width sheet pinned to the bottom
 * of a 1440px screen would be absurd.
 */
export function Sheet({ open, title, description, onClose, size = 'md', children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog so the keyboard lands somewhere sensible.
    const focusable = panel.current?.querySelector<HTMLElement>(
      'input, select, textarea, button, [href], [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:items-center lg:justify-center lg:p-space-2xl">
      <button
        className="scrim absolute inset-0 animate-fade-in"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[88vh] w-full animate-sheet-up flex-col overflow-hidden rounded-t-xl bg-surface-container-lowest pb-safe shadow-e3',
          'lg:max-h-[84vh] lg:animate-rise lg:rounded-xl lg:pb-0',
          size === 'lg' ? 'lg:max-w-2xl' : 'lg:max-w-lg',
        )}
      >
        <header className="shrink-0 border-b border-on-surface/5 px-space-lg pt-space-md lg:pt-space-lg">
          <div className="mx-auto mb-space-md h-1 w-9 rounded-full bg-on-surface/20 lg:hidden" />
          <div className="flex items-start justify-between gap-space-md pb-space-md">
            <div className="min-w-0">
              <h2 className="font-display text-headline-sm text-primary">{title}</h2>
              {description ? (
                <p className="mt-0.5 text-body-sm text-on-surface-variant">{description}</p>
              ) : null}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-space-lg py-space-lg">{children}</div>
      </div>
    </div>
  );
}
