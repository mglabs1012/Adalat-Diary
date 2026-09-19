import { Icon } from '@/components/ui/Icon';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Adalat Diary';

const POINTS = [
  { icon: 'courthouse' as const, text: "Today's cause list the moment you open the app" },
  { icon: 'clock' as const, text: 'Every next date, in order, with the passed ones on top' },
  { icon: 'offline' as const, text: 'Works in a corridor with no signal, syncs when you leave' },
];

/**
 * Auth shell: a pale brand panel on the left, a deep navy form panel on the
 * right. Both halves use the *-fixed tokens and explicit values rather than
 * the theme tokens, so the screen looks identical in light and dark — an
 * inverting sign-in page was the bug that produced light-on-light text.
 *
 * Below `lg` the brand panel drops away and the navy form panel takes the
 * whole screen.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-viewport flex min-h-screen flex-1 flex-col lg:flex-row">
      {/* Brand panel — desktop only. */}
      <section className="relative hidden overflow-hidden bg-primary-fixed-dim lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:p-space-3xl xl:w-[55%]">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-white/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-secondary-fixed/30 blur-3xl"
        />

        <div className="relative flex items-center gap-space-md">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-white/55 text-secondary ring-1 ring-white/60">
            <Icon name="scale" size={26} />
          </span>
          <span className="font-display text-headline-md text-on-primary-fixed">{APP_NAME}</span>
        </div>

        <div className="relative max-w-lg">
          <h2 className="font-display text-display-lg leading-[1.1] text-on-primary-fixed">
            Your court diary,
            <br />
            in your pocket.
          </h2>
          <ul className="mt-space-2xl flex flex-col gap-space-base">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-space-md">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/55 text-on-primary-fixed-variant">
                  <Icon name={p.icon} size={16} />
                </span>
                <span className="text-body-lg text-on-primary-fixed-variant">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-label-md text-on-primary-fixed-variant/75">
          Case records stay in your own database.
        </p>
      </section>

      {/* Form panel. */}
      <section className="relative flex flex-1 flex-col justify-center overflow-hidden bg-[#0f1626]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-primary-fixed-dim/[0.08] blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-md px-screen-margin pb-safe pt-safe lg:px-space-3xl">
          {children}
        </div>
      </section>
    </div>
  );
}
