'use client';

import { useToasts } from '@/hooks/useToast';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

const TONE = {
  default: 'bg-inverse-surface text-inverse-on-surface',
  success: 'bg-primary text-on-primary',
  error: 'bg-error text-on-error',
} as const;

export function Toaster() {
  const toasts = useToasts();
  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-[70] flex flex-col items-center gap-space-sm px-screen-margin lg:left-side-nav"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pill max-w-[86vw] animate-rise px-space-base py-space-sm text-label-md shadow-e3',
            TONE[t.tone],
          )}
        >
          <Icon name={t.tone === 'error' ? 'alert' : 'check'} size={16} />
          <span className="truncate">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
