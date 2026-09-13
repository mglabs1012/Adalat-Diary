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
    <section className="card flex flex-col gap-space-base p-space-base sm:flex-row sm:items-center lg:p-space-lg">
      <div className="relative shrink-0 self-start sm:self-auto">
        <Avatar username={session.username} avatar={avatar} size={64} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Change profile picture"
          className="press absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary shadow-e2 ring-2 ring-surface-container-lowest disabled:opacity-60"
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

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-headline-sm text-primary">@{session.username}</p>
        <p className="tnum text-body-sm text-on-surface-variant">
          {stats.active} active · {stats.disposed} disposed
        </p>
        {avatar ? (
          <button
            onClick={() => void save(null)}
            disabled={busy}
            className="mt-space-xs text-label-md text-error hover:underline disabled:opacity-60"
          >
            Remove picture
          </button>
        ) : (
          <p className="mt-space-xs text-label-md text-on-surface-variant/80">
            JPG, PNG or WebP · cropped to a square
          </p>
        )}
      </div>

      <Button
        variant="secondary"
        icon="logout"
        className="text-error ring-error/25 hover:bg-error/[0.06]"
        onClick={onSignOut}
      >
        Sign out
      </Button>
    </section>
  );
}
