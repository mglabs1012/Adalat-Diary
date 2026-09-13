'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const KEY = 'adalat-theme';

function apply(pref: ThemePreference) {
  const dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';

  // Keep the Android status bar in step with the surface behind it.
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', dark ? '#101623' : '#f8f9ff');
}

/**
 * Theme preference, mirrored to localStorage. The pre-paint script in
 * ThemeScript applies the same value before React boots, so there is no flash.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: ThemePreference = 'system';
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === 'light' || raw === 'dark') stored = raw;
    } catch {
      /* private mode */
    }
    setPreference(stored);
    setReady(true);

    if (stored !== 'system') return;
    // Follow the OS while the user has not made an explicit choice.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setPreference(next);
    apply(next);
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* private mode */
    }
  }, []);

  return { preference, setTheme, ready };
}
