import { del, keys } from 'idb-keyval';

/** Keep unsynced writes; remove only snapshots from the previous session. */
export async function clearSessionCache(): Promise<void> {
  try {
    const stored = await keys();
    await Promise.all(stored.filter((key) => typeof key === 'string' && key.startsWith('snapshot:')).map((key) => del(key)));
  } catch {
    // Safari private mode can deny IndexedDB; signing out must still work.
  }
  try {
    if ('caches' in window) {
      const stored = await caches.keys();
      await Promise.all(stored.filter((name) => /^adalat-(pages|data)-/.test(name)).map((name) => caches.delete(name)));
    }
  } catch {
    // Storage is optional. The worker also clears its caches at auth changes.
  }
}
