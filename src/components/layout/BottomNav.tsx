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

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-on-surface/8 bg-surface-container-lowest pb-safe shadow-nav-up lg:hidden"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-screen-sm items-stretch">
        {left.map((item) => (
          <NavTab key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}

        <div className="relative w-[4.5rem] flex-shrink-0">
          <Link
            href="/cases/new"
            aria-label="Add a new case"
            className="press absolute -top-5 left-1/2 flex h-[3.25rem] w-[3.25rem] -translate-x-1/2 items-center justify-center rounded-full bg-primary text-on-primary shadow-e4"
          >
            <Icon name="add" size={26} />
          </Link>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-label-sm uppercase text-on-surface-variant">
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
      className="group flex flex-1 flex-col items-center justify-center gap-space-xxs pt-space-xs"
    >
      <span
        className={cn(
          'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
          active ? 'bg-secondary-fixed text-on-secondary-fixed-variant' : 'text-on-surface-variant',
        )}
      >
        <Icon name={icon} size={20} />
      </span>
      <span
        className={cn(
          'text-label-sm uppercase transition-colors',
          active ? 'text-primary' : 'text-on-surface-variant',
        )}
      >
        {label}
      </span>
    </Link>
  );
}
