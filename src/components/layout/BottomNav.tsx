'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants/nav';
import { cn } from '@/lib/utils/cn';
import { Icon } from '@/components/ui/Icon';

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/**
 * Four destinations with the "New case" FAB docked in the centre - the thumb
 * never leaves the bottom third of a 6" screen.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [left, right] = [NAV_ITEMS.slice(0, 2), NAV_ITEMS.slice(2)];

  // Forms keep their sticky Save/Cancel bar at the thumb position. Showing
  // the app nav above it makes the primary action partially unreachable.
  if (pathname === '/cases/new' || /^\/cases\/[^/]+\/edit$/.test(pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-on-surface/8 bg-surface-container-lowest/95 pb-safe shadow-nav-up backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex h-[4.5rem] max-w-screen-sm items-stretch">
        {left.map((item) => (
          <NavTab key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}

        <div className="relative w-[4.75rem] flex-shrink-0">
          <Link
            href="/cases/new"
            aria-label="Add a new case"
            className="press absolute -top-6 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary-container text-secondary-fixed shadow-e4 ring-4 ring-surface-container-lowest"
          >
            <Icon name="add" size={26} />
          </Link>
          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-label-sm uppercase tracking-wide text-primary">
            New
          </span>
        </div>

        {right.map((item) => (
          <NavTab key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
      </div>
    </nav>
  );
}

function NavTab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: 'board' | 'docket' | 'diary' | 'settings';
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="group flex flex-1 flex-col items-center justify-center gap-0.5 pt-space-xs"
    >
      <span
        className={cn(
          'flex h-8 w-11 items-center justify-center rounded-full transition-colors',
          active
            ? 'bg-secondary-fixed text-on-secondary-fixed-variant shadow-e1'
            : 'text-on-surface-variant group-hover:bg-surface-container group-hover:text-primary',
        )}
      >
        <Icon name={icon} size={20} />
      </span>
      <span
        className={cn(
          'text-label-sm uppercase transition-colors',
          active ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary',
        )}
      >
        {label}
      </span>
    </Link>
  );
}
