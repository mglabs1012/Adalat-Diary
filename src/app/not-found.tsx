import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="app-viewport flex min-h-screen flex-1 flex-col items-center justify-center gap-space-base px-screen-margin py-space-3xl text-center">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-surface-container">
        <Icon name="search" size={40} className="text-on-surface-variant" />
        <span className="tnum absolute -bottom-1 rounded-full bg-primary px-space-sm py-0.5 text-label-sm uppercase tracking-widest text-on-primary">
          404
        </span>
      </div>

      <div className="flex flex-col gap-space-xs">
        <h1 className="font-display text-headline-lg text-primary lg:text-display-mobile">
          This file is not on the record
        </h1>
        <p className="mx-auto max-w-[42ch] text-body-md text-on-surface-variant lg:text-body-lg">
          The page you asked for does not exist in this diary. It may have been deleted, or the
          link was mistyped.
        </p>
      </div>

      <div className="mt-space-sm flex w-full max-w-xs flex-col gap-space-sm sm:max-w-none sm:flex-row sm:justify-center">
        <ButtonLink href="/" icon="board" size="lg" pill>
          Back to the board
        </ButtonLink>
        <ButtonLink href="/cases" icon="docket" size="lg" pill variant="secondary">
          Open the docket
        </ButtonLink>
      </div>
    </main>
  );
}
