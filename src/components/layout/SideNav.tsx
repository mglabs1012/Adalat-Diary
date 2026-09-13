'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants/nav';
import { cn } from '@/lib/utils/cn';
import { useStats } from '@/hooks/useStats';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useSession } from './SessionProvider';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Adalat Diary';

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/**
 * Desktop navigation. From `lg` up the bottom bar is replaced by a fixed rail:
 * a phone's four-tab bar wastes a 1440px viewport, and a persistent sidebar
 * lets the docket and the board keep their full height.
 */
export function SideNav() {
  const pathname = usePathname();
  const session = useSession();
  const { stats } = useStats();

  const badge: Record<string, number | undefined> = {
    '/': stats.today || undefined,
    '/cases': stats.active || undefined,
    '/diary': stats.thisWeek || undefined,
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-side-nav flex-col border-r border-on-surface/8 bg-surface-container-lowest lg:flex">
      <Link href="/" className="flex items-center gap-space-sm px-space-lg py-space-lg">
        <span className="flex h-9 w-9 items-center justify-center rounded bg-primary text-secondary-fixed-dim">
          <Icon name="scale" size={20} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-headline-sm text-primary">{APP_NAME}</span>
          <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
            Court diary
          </span>
        </span>
      </Link>

      <div className="px-space-md pb-space-md">
        <ButtonLink href="/cases/new" icon="add" block pill size="md">
          New case
        </ButtonLink>
      </div>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-space-xxs px-space-md">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-space-sm rounded-full px-space-md py-2.5 text-label-lg transition-colors',
                active
                  ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-primary',
              )}
            >
              <Icon name={item.icon as IconName} size={19} />
              <span className="flex-1 truncate">{item.label}</span>
              {badge[item.href] ? (
                <span
                  className={cn(
                    'tnum rounded-full px-1.5 py-0.5 text-label-sm',
                    active ? 'bg-on-secondary-fixed-variant/15' : 'bg-surface-container-high',
                  )}
                >
                  {badge[item.href]}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/settings"
        className="m-space-md flex items-center gap-space-sm rounded-md bg-surface-container-low px-space-md py-space-md transition-colors hover:bg-surface-container"
      >
        <Avatar username={session.username} avatar={session.avatar} size={36} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-label-lg text-primary">@{session.username}</span>
          <span className="text-label-md text-on-surface-variant">Chamber settings</span>
        </span>
      </Link>
    </aside>
  );
}
