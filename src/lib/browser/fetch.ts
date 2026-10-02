/** Explicit cookies matter on older WebViews whose fetch defaults omit them. */
export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 30_000) {
  const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init, ...(controller ? { signal: controller.signal } : {}) }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error('The connection timed out. Please check your connection and try again.'));
          controller?.abort();
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}
