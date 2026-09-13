'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Icon, type IconName } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';

const THEMES: { id: ThemePreference; label: string; icon: IconName }[] = [
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
  { id: 'system', label: 'System', icon: 'contrast' },
];

export function SettingsScreen() {
  const online = useOnline();
  const { canInstall, installed, install } = useInstallPrompt();
  const { preference, setTheme, ready } = useTheme();

  const [queued, setQueued] = useState<OutboxItem[]>([]);
  const [csvBusy, setCsvBusy] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [exporting, setExportOpen] = useState(false);
  const [importing, setImportOpen] = useState(false);

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

  return (
    <>
      <AppBar title="Chamber" subtitle="Account, sync & appearance" />

      <main className="page flex flex-1 flex-col gap-space-base pb-nav pt-appbar">
        <ProfileCard onSignOut={() => setConfirmSignOut(true)} />

        {/* Two columns of cards once there is room for them. */}
        <div className="grid grid-cols-1 gap-space-base lg:grid-cols-2 lg:items-start">
          <section className="card flex flex-col overflow-hidden">
            <Header text="Appearance" />
            <div className="flex flex-col gap-space-md p-space-base">
              <p className="text-body-sm text-on-surface-variant">
                Dark theme is easier on the eyes in a dim courtroom corridor.
              </p>
              <div
                role="radiogroup"
                aria-label="Theme"
                className="flex items-center gap-space-xs rounded-md bg-surface-container-high p-1"
              >
                {THEMES.map((t) => {
                  const active = ready && preference === t.id;
                  return (
                    <button
                      key={t.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        'flex min-h-11 flex-1 items-center justify-center gap-space-xs rounded text-label-md transition-all',
                        active
                          ? 'bg-surface-container-lowest text-primary shadow-e1'
                          : 'text-on-surface-variant hover:text-primary',
                      )}
                    >
                      <Icon name={t.icon} size={15} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="card flex flex-col divide-y divide-on-surface/5 overflow-hidden">
            <Header text="Sync" />
            <StatusRow
              icon={online ? 'sync' : 'offline'}
              label={online ? 'Connected' : 'Offline'}
              value={online ? 'Diary syncing live' : 'Changes queue on this device'}
              tone={online ? 'ok' : 'warn'}
            />
            <StatusRow
              icon="archive"
              label="Waiting to sync"
              value={
                queued.length
                  ? `${queued.length} pending change${queued.length === 1 ? '' : 's'}`
                  : 'Nothing pending'
              }
              tone={queued.length ? 'warn' : 'ok'}
            />
            {queued.length ? (
              <button
                onClick={async () => {
                  await clearOutbox();
                  await refresh();
                  toast('Pending changes discarded');
                }}
                className="press px-space-base py-space-md text-left text-label-lg text-error hover:bg-error/[0.06]"
              >
                Discard pending changes
              </button>
            ) : null}
          </section>

          <section className="card flex flex-col divide-y divide-on-surface/5 overflow-hidden lg:col-span-2">
            <Header text="Diary data" />
            <div className="grid grid-cols-1 divide-y divide-on-surface/5 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              <ActionRow
                icon="share"
                iconClass="text-secondary"
                title="Share as PDF"
                subtitle="A day's cause list, or the whole month"
                onClick={() => setExportOpen(true)}
              />
              <ActionRow
                icon="download"
                iconClass="text-tertiary"
                title="Import from CSV"
                subtitle="Bring an existing diary across"
                onClick={() => setImportOpen(true)}
              />
              <ActionRow
                icon="download"
                iconClass="text-on-surface-variant"
                title="Export as CSV"
                subtitle="CRN, dates, court, parties and stage"
                disabled={csvBusy}
                onClick={exportCsv}
              />
            </div>
          </section>

          <section className="card flex flex-col divide-y divide-on-surface/5 overflow-hidden lg:col-span-2">
            <Header text="App" />
            <div className="grid grid-cols-1">
              {installed ? (
                <StatusRow
                  icon="check"
                  label="Installed"
                  value="Running as an app on this device"
                  tone="ok"
                />
              ) : (
                <ActionRow
                  icon="download"
                  iconClass="text-secondary"
                  title="Install on this device"
                  subtitle={
                    canInstall
                      ? 'Adds a home-screen icon and full-screen mode'
                      : 'Use your browser menu → Add to Home screen'
                  }
                  disabled={!canInstall}
                  onClick={async () => {
                    const accepted = await install();
                    if (accepted) toast('Adalat Diary installed', 'success');
                  }}
                />
              )}

            </div>
          </section>
        </div>

        <p className="px-space-xs pb-space-md text-center text-label-md text-on-surface-variant">
          Adalat Diary · v0.6.0
          <br />
          Your case records stay in your own MongoDB.
        </p>
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
    </>
  );
}

function Header({ text }: { text: string }) {
  return (
    <h2 className="bg-surface-container-low px-space-base py-space-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
      {text}
    </h2>
  );
}

function ActionRow({
  icon,
  iconClass,
  title,
  subtitle,
  disabled,
  onClick,
}: {
  icon: IconName;
  iconClass?: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="press flex w-full items-center gap-space-md px-space-base py-space-md text-left transition-colors hover:bg-surface-container-low disabled:pointer-events-none disabled:opacity-60"
    >
      <Icon name={icon} size={19} className={cn('shrink-0', iconClass)} />
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
}: {
  icon: IconName;
  label: string;
  value: string;
  tone: 'ok' | 'warn';
}) {
  return (
    <div className="flex items-center gap-space-md px-space-base py-space-md">
      <Icon name={icon} size={19} className={tone === 'ok' ? 'text-success' : 'text-secondary'} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-label-lg text-primary">{label}</span>
        <span className="text-body-sm text-on-surface-variant">{value}</span>
      </div>
    </div>
  );
}
