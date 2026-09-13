'use client';

import { useCallback, useEffect, useState } from 'react';
import { flushOutbox, outboxCount } from '@/lib/offline/outbox';
import { revalidateDiary } from '@/hooks/useCases';
import { useOnline } from '@/hooks/useOnline';
import { toast } from '@/hooks/useToast';
import { Icon } from '@/components/ui/Icon';

/**
 * Watches connectivity and drains the offline outbox the moment the device is
 * back on a network. Mounted inside the (app) group only.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    setPending(await outboxCount());
  }, []);

  useEffect(() => {
    void refreshCount();
    // Cheap poll: the outbox also changes from other tabs and the SW.
    const id = setInterval(refreshCount, 15_000);
    return () => clearInterval(id);
  }, [refreshCount]);

  const drain = useCallback(async () => {
    if (await outboxCount().then((n) => n === 0)) return;

    setSyncing(true);
    const { sent, failed } = await flushOutbox();
    setSyncing(false);
    await refreshCount();

    if (sent) {
      await revalidateDiary();
      toast(`${sent} offline ${sent === 1 ? 'entry' : 'entries'} synced`, 'success');
    }
    if (failed) toast(`${failed} entry could not be synced`, 'error');
  }, [refreshCount]);

  useEffect(() => {
    if (online) void drain();
  }, [online, drain]);

  return (
    <>
      <ConnectionBanner online={online} pending={pending} syncing={syncing} onRetry={drain} />
      {children}
    </>
  );
}

function ConnectionBanner({
  online,
  pending,
  syncing,
  onRetry,
}: {
  online: boolean;
  pending: number;
  syncing: boolean;
  onRetry: () => void;
}) {
  if (online && !pending) return null;
  const offline = !online;

  return (
    <div
      role="status"
      className={
        'fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-30 flex items-center justify-center gap-space-xs px-screen-margin py-1.5 text-label-md lg:left-side-nav lg:top-16 ' +
        (offline
          ? 'bg-inverse-surface text-inverse-on-surface'
          : 'bg-secondary-fixed text-on-secondary-fixed-variant')
      }
    >
      <Icon name={offline ? 'offline' : 'sync'} size={14} className={syncing ? 'animate-spin' : undefined} />
      <span className="truncate">
        {offline
          ? pending
            ? `Offline — ${pending} change${pending === 1 ? '' : 's'} saved on device`
            : 'Offline — showing your last synced diary'
          : syncing
            ? 'Syncing your diary…'
            : `${pending} change${pending === 1 ? '' : 's'} waiting to sync`}
      </span>
      {!offline && !syncing ? (
        <button onClick={onRetry} className="shrink-0 underline underline-offset-2">
          Sync now
        </button>
      ) : null}
    </div>
  );
}
