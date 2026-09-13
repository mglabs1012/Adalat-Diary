import { get, set, del, keys } from 'idb-keyval';

/**
 * Write-behind queue. Courtrooms have no signal; the advocate still records
 * the next date. Mutations land here and flush the moment the device is back.
 */
export interface OutboxItem {
  id: string;
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  createdAt: number;
  attempts: number;
  label: string;
}

const KEY = (id: string) => `outbox:${id}`;
const MAX_ATTEMPTS = 5;

export async function enqueue(item: Omit<OutboxItem, 'id' | 'createdAt' | 'attempts'>): Promise<OutboxItem> {
  const entry: OutboxItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    attempts: 0,
  };
  await set(KEY(entry.id), entry);
  return entry;
}

export async function listOutbox(): Promise<OutboxItem[]> {
  const allKeys = await keys();
  const outboxKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith('outbox:'));
  const items = await Promise.all(outboxKeys.map((k) => get<OutboxItem>(k as string)));
  return items.filter(Boolean).sort((a, b) => a!.createdAt - b!.createdAt) as OutboxItem[];
}

export async function outboxCount(): Promise<number> {
  const allKeys = await keys();
  return allKeys.filter((k) => typeof k === 'string' && k.startsWith('outbox:')).length;
}

/** Replays queued writes in order. Returns how many were accepted by the server. */
export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { sent: 0, failed: 0 };

  const items = await listOutbox();
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      // 4xx means the server will never accept it - drop it rather than loop.
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        await del(KEY(item.id));
        if (res.ok) sent += 1;
        else failed += 1;
        continue;
      }
      throw new Error(`status ${res.status}`);
    } catch {
      const attempts = item.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await del(KEY(item.id));
        failed += 1;
      } else {
        await set(KEY(item.id), { ...item, attempts });
      }
      break; // preserve ordering - stop at the first hard failure
    }
  }

  return { sent, failed };
}

export async function clearOutbox(): Promise<void> {
  const items = await listOutbox();
  await Promise.all(items.map((i) => del(KEY(i.id))));
}
