'use client';

import { cn } from '@/lib/utils/cn';

interface AvatarProps {
  username: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}

/**
 * The advocate's picture, or the first letter of their username as a fallback.
 * Plain <img>, not next/image: the source is a data: URL already sized to
 * 256px on the client, so there is nothing for the optimiser to do.
 */
export function Avatar({ username, avatar, size = 40, className }: AvatarProps) {
  const style = { width: size, height: size };

  if (avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        style={style}
        className={cn('shrink-0 rounded-full object-cover', className)}
      />
    );
  }

  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary font-display font-semibold uppercase text-on-primary',
        className,
      )}
    >
      {username.charAt(0)}
    </span>
  );
}
