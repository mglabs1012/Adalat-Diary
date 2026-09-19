'use client';

import { useRef, useState } from 'react';
import { resizeToAvatar } from '@/lib/utils/image';
import { useStats } from '@/hooks/useStats';
import { toast } from '@/hooks/useToast';
import { useSession } from '@/components/layout/SessionProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/**
 * Account card with the profile picture.
 *
 * The image is cropped and scaled to 256px in the browser before it is sent,
 * so a 4 MB camera photo becomes a ~20 KB upload and the server never needs an
 * image library.
 */
export function ProfileCard({ onSignOut }: { onSignOut: () => void }) {
  const session = useSession();
  const { stats } = useStats();
  const inputRef = useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = useState<string | null>(session.avatar);
  const [busy, setBusy] = useState(false);

  async function save(next: string | null) {
    setBusy(true);
    const previous = avatar;
    setAvatar(next); // optimistic — the crop is already on screen
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: next }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'Could not save the picture');
      toast(next ? 'Profile picture updated' : 'Profile picture removed', 'success');
    } catch (err) {
      setAvatar(previous);
      toast(err instanceof Error ? err.message : 'Could not save the picture', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function pick(file: File) {
    try {
      setBusy(true);
      const dataUrl = await resizeToAvatar(file);
      await save(dataUrl);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not read that image', 'error');
      setBusy(false);
    }
  }

  return (
    <section className="card relative flex flex-col items-center overflow-hidden rounded-xl p-space-lg text-center shadow-e2 sm:p-space-xl">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="relative shrink-0 rounded-full border-2 border-secondary/45 p-1 shadow-e2">
          <Avatar
            username={session.username}
            avatar={avatar}
            size={80}
            className="ring-4 ring-surface-container-high ring-offset-2 ring-offset-surface-container-lowest"
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Change profile picture"
            className="press absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-e2 ring-2 ring-surface-container-lowest disabled:opacity-60"
          >
            <Icon name={busy ? 'sync' : 'edit'} size={14} className={busy ? 'animate-spin' : ''} />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pick(file);
              e.target.value = '';
            }}
          />
        </div>

        <div className="mt-space-md min-w-0">
          <p className="truncate font-display text-headline-md text-primary">@{session.username}</p>
          <p className="mt-0.5 text-label-md text-secondary">Advocate · Chamber lead</p>
          <div className="mt-space-sm flex items-center justify-center gap-space-xs">
            <span className="pill flex items-center gap-1 border border-success/20 bg-success/10 px-2 py-1 text-label-sm text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              <span className="tnum">{stats.active}</span> active
            </span>
            <span className="pill flex items-center gap-1 border border-on-surface/10 bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-on-surface-variant/60" aria-hidden />
              <span className="tnum">{stats.disposed}</span> disposed
            </span>
          </div>
          {avatar ? (
            <button
              onClick={() => void save(null)}
              disabled={busy}
              className="mt-space-sm text-label-md text-error hover:underline disabled:opacity-60"
            >
              Remove picture
            </button>
          ) : (
            <p className="mt-space-sm text-label-md font-normal text-on-surface-variant/80">
              JPG, PNG or WebP · cropped to a square
            </p>
          )}
        </div>

        <Button variant="secondary" icon="logout" block className="mt-space-lg" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </section>
  );
}
