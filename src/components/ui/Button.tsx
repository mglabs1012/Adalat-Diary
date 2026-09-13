import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary shadow-e1 hover:shadow-e2',
  // Outlined: the border carries the weight, a tint appears on hover.
  secondary: 'text-primary ring-1 ring-inset ring-primary/25 hover:bg-primary/[0.06]',
  tonal: 'bg-surface-container text-primary hover:bg-surface-container-high',
  ghost: 'text-on-surface-variant hover:bg-surface-container hover:text-primary',
  danger: 'bg-error text-on-error shadow-e1 hover:shadow-e2',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-space-md text-label-md gap-1.5',
  md: 'h-11 px-space-base text-label-lg gap-space-xs',
  lg: 'h-12 px-space-lg text-label-lg gap-space-sm',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  /** Places the glyph after the label — for "next"-shaped actions. */
  trailingIcon?: IconName;
  pill?: boolean;
  block?: boolean;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

function classes({ variant = 'primary', size = 'md', pill, block, className }: CommonProps) {
  return cn(
    'press inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55',
    pill ? 'rounded-full' : 'rounded',
    block && 'w-full',
    SIZE[size],
    VARIANT[variant],
    className,
  );
}

function Inner({ icon, trailingIcon, loading, children, size = 'md' }: CommonProps) {
  const glyph = size === 'sm' ? 15 : 18;
  return (
    <>
      {loading ? (
        <Icon name="sync" size={glyph} className="animate-spin" />
      ) : icon ? (
        <Icon name={icon} size={glyph} />
      ) : null}
      {children}
      {trailingIcon && !loading ? <Icon name={trailingIcon} size={glyph} /> : null}
    </>
  );
}

export function Button({
  variant,
  size,
  icon,
  trailingIcon,
  pill,
  block,
  loading,
  className,
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={classes({ variant, size, pill, block, className })}
    >
      <Inner icon={icon} trailingIcon={trailingIcon} loading={loading} size={size}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  icon,
  trailingIcon,
  pill,
  block,
  className,
  children,
  ...props
}: CommonProps & { href: string } & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link {...props} href={href} className={classes({ variant, size, pill, block, className })}>
      <Inner icon={icon} trailingIcon={trailingIcon} size={size}>
        {children}
      </Inner>
    </Link>
  );
}

