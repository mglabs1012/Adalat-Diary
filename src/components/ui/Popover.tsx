'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';

interface PopoverProps {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  /** Match the trigger's width — what a dropdown wants. */
  matchWidth?: boolean;
  /** Minimum room below the trigger before the panel flips above it. */
  minHeight?: number;
  /** Upper bound, so a dropdown never grows into a full-height panel. */
  maxHeight?: number;
  className?: string;
  children: React.ReactNode;
}

const GUTTER = 8;
const VIEWPORT_PAD = 12;

/**
 * An anchored popover, portalled to <body>.
 *
 * Portalling matters: dropdowns open inside bottom sheets and scrolling
 * cards, and an absolutely-positioned panel would be clipped by the first
 * ancestor with `overflow: auto`. Fixed positioning against a measured
 * trigger rect avoids that entirely, at the cost of having to track scroll —
 * which is what the rAF listener below does.
 */
export function Popover({
  anchor,
  open,
  onClose,
  matchWidth,
  minHeight = 180,
  maxHeight,
  className,
  children,
}: PopoverProps) {
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  /**
   * Starts fixed at the origin and hidden rather than merely transparent: a
   * panel left in normal flow measures as wide as <body>, and the horizontal
   * clamp below would then shove every dropdown to the left edge.
   */
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    top: 0,
    left: 0,
    visibility: 'hidden',
  });

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const trigger = anchor.current;
    const node = panel.current;
    if (!trigger || !node) return;

    const rect = trigger.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GUTTER - VIEWPORT_PAD;
    const above = rect.top - GUTTER - VIEWPORT_PAD;
    const flip = below < minHeight && above > below;

    const room = Math.max(140, Math.floor(flip ? above : below));
    const height = maxHeight ? Math.min(room, maxHeight) : room;

    const width = matchWidth ? rect.width : undefined;
    const panelWidth = width ?? node.offsetWidth;

    // Keep the panel on screen when the trigger sits near an edge.
    const left = Math.min(
      Math.max(VIEWPORT_PAD, rect.left),
      Math.max(VIEWPORT_PAD, window.innerWidth - panelWidth - VIEWPORT_PAD),
    );

    setStyle({
      position: 'fixed',
      left,
      top: flip ? undefined : rect.bottom + GUTTER,
      bottom: flip ? window.innerHeight - rect.top + GUTTER : undefined,
      width,
      maxHeight: height,
      visibility: 'visible',
    });
  }, [anchor, matchWidth, minHeight, maxHeight]);

  useLayoutEffect(() => {
    if (!open) {
      setStyle({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });
      return;
    }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };

    // `true` so this fires for scrolls inside dialogs, not just the page.
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panel.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open, place, onClose, anchor]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={panel}
      style={style}
      className={cn(
        'z-[80] flex flex-col overflow-hidden rounded-md border border-outline-variant/70 bg-surface-container-lowest shadow-e3 animate-rise',
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
