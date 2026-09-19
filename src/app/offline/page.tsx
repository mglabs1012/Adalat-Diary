'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useOnline } from '@/hooks/useOnline';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/**
 * Served by the service worker when a navigation misses the cache with no
 * network. Cached routes still open normally — this is the true dead end.
 */
export default function OfflinePage() {
  const online = useOnline();
  const router = useRouter();

  // The moment the radio comes back, take them where they were going.
  useEffect(() => {
    if (online) router.replace('/');
  }, [online, router]);

  return (
    <main className="app-viewport flex min-h-screen flex-1 flex-col items-center justify-center gap-space-base px-screen-margin py-space-3xl text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name="offline" size={34} />
      </span>

      <div className="flex flex-col gap-space-xs">
        <h1 className="font-display text-headline-lg text-primary lg:text-display-mobile">
          You are offline
        </h1>
        <p className="mx-auto max-w-[44ch] text-body-md text-on-surface-variant lg:text-body-lg">
          This screen has not been saved to your device yet. Your diary, today&rsquo;s cause list
          and any case you have already opened still work — and anything you record now will sync
          the moment you are back on a network.
        </p>
      </div>

      <div className="mt-space-sm flex w-full max-w-xs flex-col gap-space-sm sm:max-w-none sm:flex-row sm:justify-center">
        <ButtonLink href="/" icon="board" size="lg" pill>
          Open my board
        </ButtonLink>
        <Button onClick={() => router.refresh()} icon="refresh" size="lg" pill variant="secondary">
          Try again
        </Button>
      </div>

      <p className="mt-space-md flex items-center gap-space-xs text-label-md text-on-surface-variant">
        <span className={'h-2 w-2 rounded-full ' + (online ? 'bg-success' : 'bg-outline')} />
        {online ? 'Connection restored — taking you back' : 'Waiting for a connection'}
      </p>
    </main>
  );
}
