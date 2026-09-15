import { WavyLoader } from '@/components/ui/WavyLoader';

/** Shown only while a route segment is genuinely waiting on server data. */
export default function AppLoading() {
  return (
    <main className="page flex flex-1 items-center justify-center pb-nav pt-appbar" aria-busy="true">
      <div className="flex flex-col items-center gap-space-md text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-lowest shadow-e1">
          <WavyLoader size="lg" label="Loading diary" />
        </span>
        <p className="text-label-lg text-on-surface-variant">Loading your diary…</p>
      </div>
    </main>
  );
}
