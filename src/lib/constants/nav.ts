export interface NavItem {
  href: string;
  label: string;
  icon: 'board' | 'docket' | 'diary' | 'settings';
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Board', icon: 'board' },
  { href: '/cases', label: 'Docket', icon: 'docket' },
  { href: '/diary', label: 'Diary', icon: 'diary' },
  { href: '/settings', label: 'Chamber', icon: 'settings' },
] as const;
