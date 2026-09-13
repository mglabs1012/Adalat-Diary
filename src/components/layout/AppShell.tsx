import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';

/**
 * The responsive frame every signed-in screen sits in.
 *
 *   < lg  bottom navigation with the docked FAB, content full-bleed
 *   ≥ lg  fixed 240px sidebar, content offset by the same amount
 *
 * The screens themselves are unaware of which is active; they use the `.page`
 * containers, which widen at the same breakpoint.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SideNav />
      <div className="flex min-h-[100dvh] flex-1 flex-col lg:pl-side-nav">{children}</div>
      <BottomNav />
    </>
  );
}
