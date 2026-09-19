'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { casesApi } from '@/lib/api/client';
import { clearOutbox, listOutbox, type OutboxItem } from '@/lib/offline/outbox';
import { formatDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils/cn';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useOnline } from '@/hooks/useOnline';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';
import { toast } from '@/hooks/useToast';
import { AppBar } from '@/components/layout/AppBar';
import { ProfileCard } from '@/components/settings/ProfileCard';
import { ExportDialog } from '@/components/cases/ExportDialog';
import { ImportDialog } from '@/components/cases/ImportDialog';
import { Button } from '@/components/ui/Button';
import {
  ConnectedSegmentTrack,
  connectedSegmentShape,
  connectedSegmentTone,
} from '@/components/ui/ConnectedSegments';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';

const THEMES: { id: ThemePreference; label: string; icon: IconName }[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'contrast' },
];

export function SettingsScreen() {
  const online = useOnline();
  const { canInstall, installed, isIos, install } = useInstallPrompt();
  const { preference, setTheme, ready } = useTheme();

  const [queued, setQueued] = useState<OutboxItem[]>([]);
  const [csvBusy, setCsvBusy] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [exporting, setExportOpen] = useState(false);
  const [importing, setImportOpen] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);

  const refresh = useCallback(async () => setQueued(await listOutbox()), []);
  useEffect(() => void refresh(), [refresh]);

  async function exportCsv() {
    if (csvBusy) return;
    setCsvBusy(true);
    try {
      const { items } = await casesApi.list('filter=all&pageSize=100');
      const header = ['CRN', 'Pre Date', 'Court', 'Party 1', 'Party 2', 'Stage', 'Next Date'];
      const rows = items.map((c) => [
        c.crn,
        formatDate(c.preDate),
        c.court,
        c.party1,
        c.party2,
        c.stage,
        formatDate(c.nextDate),
      ]);
      const csv = [header, ...rows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `adalat-diary-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Diary exported');
    } catch {
      toast('Export failed — check your connection', 'error');
    } finally {
      setCsvBusy(false);
    }
  }

  async function signOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      // Hard navigation so every cached server component is discarded.
      window.location.replace('/login');
    }
  }

  const appearanceName = preference === 'dark' ? 'Corridor Dark' : preference === 'light' ? 'Daylight' : 'System';

  return (
    <>
      <AppBar title="Chamber" subtitle="Account, sync & appearance" />

      <main className="page flex flex-1 flex-col pb-nav pt-appbar">
        <div className="mx-auto flex w-full max-w-screen-sm flex-col gap-space-md lg:max-w-[48rem]">
          <ProfileCard onSignOut={() => setConfirmSignOut(true)} />

          <section className="card flex flex-col rounded-xl p-space-lg shadow-e2">
            <Header icon="contrast" text="Appearance" detail={appearanceName} />
            <div className="mt-space-lg flex flex-col gap-space-md">
              <ConnectedSegmentTrack role="radiogroup" aria-label="Theme" className="w-full">
                {THEMES.map((theme, index) => {
                  const active = ready && preference === theme.id;
                  return (
                    <button
                      key={theme.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTheme(theme.id)}
                      className={cn(
                        'flex min-h-11 flex-1 items-center justify-center gap-space-xs px-space-xs text-label-md transition-all',
                        connectedSegmentShape(active, index, THEMES.length),
                        connectedSegmentTone(active, 'secondary'),
                      )}
                    >
                      <Icon name={theme.icon} size={15} />
                      {theme.label}
                    </button>
                  );
                })}
              </ConnectedSegmentTrack>
              <p className="flex items-start gap-space-xs text-body-sm text-on-surface-variant">
                <Icon name="moon" size={15} className="mt-0.5 shrink-0 text-secondary" />
                Optimized for dimly lit courtroom benches and late chamber drafting.
              </p>
            </div>
          </section>

          <section className="card flex flex-col rounded-xl p-space-lg shadow-e2">
            <Header
              icon="sync"
              text="Sync pipeline"
              detail={online ? 'Live online' : 'Offline'}
              tone={online ? 'success' : 'secondary'}
            />
            <div className="mt-space-lg flex flex-col gap-space-sm">
              <StatusRow
                icon={online ? 'sync' : 'offline'}
                label={online ? 'Connected' : 'Offline'}
                value={online ? 'Diary syncing live with e-Courts' : 'Changes queue on this device'}
                tone={online ? 'ok' : 'warn'}
                trailing={
                  online ? (
                    <Icon name="check" size={18} className="text-success" />
                  ) : (
                    <span className="pill border border-secondary/25 px-2 py-1 text-label-sm text-secondary">Offline</span>
                  )
                }
              />
              <StatusRow
                icon="archive"
                label="Waiting to sync"
                value={queued.length ? `${queued.length} pending change${queued.length === 1 ? '' : 's'}` : 'Nothing pending'}
                tone={queued.length ? 'warn' : 'ok'}
                trailing={
                  <span className="pill border border-on-surface/10 px-2 py-1 text-label-sm text-on-surface-variant">
                    {queued.length ? 'Queued' : 'Idle'}
                  </span>
                }
              />
              {queued.length ? (
                <button
                  onClick={async () => {
                    await clearOutbox();
                    await refresh();
                    toast('Pending changes discarded');
                  }}
                  className="press rounded-lg border border-error/20 px-space-base py-space-md text-left text-label-lg text-error hover:bg-error/[0.06]"
                >
                  Discard pending changes
                </button>
              ) : null}
            </div>
          </section>

          <section className="card flex flex-col rounded-xl p-space-lg shadow-e2">
            <Header icon="folder" text="Diary data" />
            <div className="mt-space-lg flex flex-col gap-space-sm">
              <ActionRow
                icon="share"
                tone="secondary"
                title="Share as PDF"
                subtitle="A day’s cause list, or the whole month"
                onClick={() => setExportOpen(true)}
              />
              <ActionRow
                icon="download"
                tone="tertiary"
                title="Import from CSV"
                subtitle="Bring an existing diary across"
                onClick={() => setImportOpen(true)}
              />
              <ActionRow
                icon="download"
                tone="neutral"
                title="Export as CSV"
                subtitle="CRN, dates, court, parties and stage"
                disabled={csvBusy}
                onClick={exportCsv}
              />
            </div>
          </section>

          <section className="card flex flex-col rounded-xl p-space-lg shadow-e2">
            <Header icon="board" text="App" />
            <div className="mt-space-lg">
              {installed ? (
                <StatusRow
                  icon="check"
                  label="Installed"
                  value="Running as an app on this device"
                  tone="ok"
                  trailing={<Icon name="check" size={18} className="text-success" />}
                />
              ) : (
                <ActionRow
                  icon="download"
                  tone="secondary"
                  title="Install on this device"
                  subtitle={
                    canInstall
                      ? 'Adds a home-screen icon and full-screen mode'
                      : isIos
                        ? 'Open Share, then Add to Home Screen'
                        : 'See the browser steps to add it to your device'
                  }
                  onClick={async () => {
                    if (canInstall) {
                      const accepted = await install();
                      if (accepted) toast('Adalat Diary installed', 'success');
                    } else {
                      setInstallHelpOpen(true);
                    }
                  }}
                />
              )}
            </div>
          </section>

          <footer className="px-space-xs pb-space-sm pt-space-xs text-center">
            <p className="flex items-center justify-center gap-1 text-label-md text-on-surface-variant">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden />
              Adalat Diary · v0.8.0
            </p>
            <p className="mt-1 text-label-md font-normal text-on-surface-variant/80">
              Your case records stay in your own MongoDB.
            </p>
          </footer>
        </div>
      </main>

      <ExportDialog open={exporting} onClose={() => setExportOpen(false)} />
      <ImportDialog open={importing} onClose={() => setImportOpen(false)} />

      <Sheet open={confirmSignOut} title="Sign out?" onClose={() => setConfirmSignOut(false)}>
        <div className="flex flex-col gap-space-lg">
          <p className="text-body-md text-on-surface-variant">
            You will need your username and password to get back in. Anything still waiting to
            sync stays on this device.
          </p>
          <div className="flex gap-space-sm">
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setConfirmSignOut(false)}
            >
              Stay signed in
            </Button>
            <Button variant="danger" size="lg" className="flex-1" icon="logout" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={installHelpOpen}
        title="Install Adalat Diary"
        description={isIos ? 'Safari adds web apps from its Share menu.' : 'Use your browser menu to add the diary as an app.'}
        onClose={() => setInstallHelpOpen(false)}
      >
        <ol className="flex list-decimal flex-col gap-space-md pl-space-lg text-body-md text-on-surface-variant">
          {isIos ? (
            <>
              <li>Open this page in Safari if you are using another browser.</li>
              <li>Tap the Share button in Safari&apos;s toolbar.</li>
              <li>Choose <span className="font-semibold text-primary">Add to Home Screen</span>, then tap Add.</li>
            </>
          ) : (
            <>
              <li>Open your browser&apos;s menu (usually the three dots).</li>
              <li>Choose <span className="font-semibold text-primary">Install app</span> or <span className="font-semibold text-primary">Add to Home screen</span>.</li>
              <li>Confirm Add. The Diary icon will open in its own window.</li>
            </>
          )}
        </ol>
      </Sheet>
    </>
  );
}

function Header({
  icon,
  text,
  detail,
  tone = 'secondary',
}: {
  icon: IconName;
  text: string;
  detail?: string;
  tone?: 'secondary' | 'success';
}) {
  return (
    <div className="flex items-center justify-between gap-space-sm">
      <h2 className="flex min-w-0 items-center gap-space-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone === 'success' ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary')}>
          <Icon name={icon} size={15} />
        </span>
        <span className="truncate">{text}</span>
      </h2>
      {detail ? (
        <span className={cn('pill shrink-0 px-2 py-1 text-label-sm', tone === 'success' ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary')}>
          ● {detail}
        </span>
      ) : null}
    </div>
  );
}

function ActionRow({
  icon,
  tone = 'neutral',
  title,
  subtitle,
  disabled,
  onClick,
}: {
  icon: IconName;
  tone?: 'secondary' | 'tertiary' | 'neutral';
  title: string;
  subtitle: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === 'secondary'
      ? 'bg-secondary/10 text-secondary ring-secondary/20'
      : tone === 'tertiary'
        ? 'bg-tertiary/10 text-tertiary ring-tertiary/20'
        : 'bg-surface-container-high text-on-surface-variant ring-on-surface/8';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="press flex min-h-[5.25rem] w-full items-center gap-space-md rounded-xl border border-on-surface/8 bg-surface-container-low/45 px-space-base py-space-md text-left transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-60"
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset', toneClass)}>
        <Icon name={icon} size={19} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-label-lg text-primary">{title}</span>
        <span className="text-body-sm text-on-surface-variant">{subtitle}</span>
      </span>
      <Icon name="chevron" size={14} className="shrink-0 text-on-surface-variant" />
    </button>
  );
}

function StatusRow({
  icon,
  label,
  value,
  tone,
  trailing,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone: 'ok' | 'warn';
  trailing?: ReactNode;
}) {
  return (
    <div className="flex min-h-[4.25rem] items-center gap-space-md rounded-xl border border-on-surface/8 bg-surface-container-low/45 px-space-base py-space-md">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-inset', tone === 'ok' ? 'bg-success/10 text-success ring-success/20' : 'bg-secondary/10 text-secondary ring-secondary/20')}>
        <Icon name={icon} size={17} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-label-lg text-primary">{label}</span>
        <span className="text-body-sm text-on-surface-variant">{value}</span>
      </div>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </div>
  );
}
