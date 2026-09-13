import { Icon } from '@/components/ui/Icon';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Adalat Diary';

const POINTS = [
  { icon: 'gavel' as const, text: "Today's cause list the moment you open the app" },
  { icon: 'clock' as const, text: 'Every next date, in order, with the passed ones on top' },
  { icon: 'offline' as const, text: 'Works in a corridor with no signal, syncs when you leave' },
];

/**
 * Auth shell. A single centred column on a phone; from `lg` up it splits into
 * a brand panel and the form, so a 1440px screen is not one small card adrift
 * in a field of navy.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col bg-primary lg:flex-row">
      {/* Brand panel — desktop only. */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-space-3xl text-on-primary lg:flex xl:w-[55%]">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-white/[0.06] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-secondary-fixed-dim/10 blur-3xl"
        />

        <div className="relative flex items-center gap-space-md">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-secondary-fixed-dim ring-1 ring-white/15">
            <Icon name="scale" size={24} />
          </span>
          <span className="font-display text-headline-md">{APP_NAME}</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-display-lg leading-tight">
            Your court diary,
            <br />
            in your pocket.
          </h2>
          <ul className="mt-space-2xl flex flex-col gap-space-base">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-space-md">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-secondary-fixed-dim">
                  <Icon name={p.icon} size={16} />
                </span>
                <span className="text-body-lg text-primary-fixed-dim">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-label-md text-primary-fixed-dim/70">
          Case records stay in your own database.
        </p>
      </section>

      {/* Form panel. */}
      <section className="relative flex flex-1 flex-col justify-center overflow-hidden bg-primary lg:bg-surface">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-white/[0.07] blur-2xl lg:hidden"
        />
        <div className="relative mx-auto w-full max-w-md px-screen-margin pb-safe pt-safe lg:px-space-3xl">
          {children}
        </div>
      </section>
    </div>
  );
}
