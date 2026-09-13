'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[adalat-diary] render error', error);
  }, [error]);

  return (
    <main className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center gap-space-base px-screen-margin py-space-3xl text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-error-container text-on-error-container">
        <Icon name="alert" size={34} />
      </span>

      <div className="flex flex-col gap-space-xs">
        <h1 className="font-display text-headline-lg text-primary lg:text-display-mobile">
          Something went wrong
        </h1>
        <p className="mx-auto max-w-[42ch] text-body-md text-on-surface-variant lg:text-body-lg">
          Your case records are safe. This screen failed to load — try again, and if it keeps
          happening, open <span className="tnum">/api/health</span> to check the database
          connection.
        </p>
        {error.digest ? (
          <p className="tnum mt-space-xs text-label-sm uppercase tracking-widest text-on-surface-variant/70">
            Ref {error.digest}
          </p>
        ) : null}
      </div>

      <div className="mt-space-sm flex w-full max-w-xs flex-col gap-space-sm sm:max-w-none sm:flex-row sm:justify-center">
        <Button onClick={reset} icon="refresh" size="lg" pill>
          Try again
        </Button>
        <ButtonLink href="/" size="lg" pill variant="secondary">
          Back to the board
        </ButtonLink>
      </div>
    </main>
  );
}
