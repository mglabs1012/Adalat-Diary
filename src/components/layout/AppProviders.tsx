'use client';

import { useEffect } from 'react';
import { SWRConfig } from 'swr';

/**
 * Root-level concerns that every screen needs, signed in or not: shared SWR
 * defaults and service-worker registration. The outbox drain and connection
 * banner live in the (app) group instead — they only mean something once
 * there is a diary to sync.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return (
    <SWRConfig
      value={{
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
        errorRetryCount: 2,
        focusThrottleInterval: 8000,
        // A 401 means "signed out" — retrying just burns requests.
        onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
          if ((error as { status?: number })?.status === 401) return;
          if (retryCount >= 2) return;
          setTimeout(() => revalidate({ retryCount }), 2000 * (retryCount + 1));
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
