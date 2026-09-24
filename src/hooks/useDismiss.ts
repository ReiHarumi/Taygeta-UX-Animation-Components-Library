import { useEffect } from 'react';

/**
 * Closes an open dropdown/popover on an outside pointerdown or on Escape.
 *
 * `containerRef` must wrap both the trigger button and the popup itself, so a
 * click on the trigger is never mistaken for an "outside" click (which would
 * close the popup on the same event that opened it). Pass an array of refs
 * when several independent triggers share one `open` boolean (for example a
 * single "which menu is open" state covering more than one dropdown). On
 * Escape, focus returns to `triggerRef` if supplied, so keyboard users don't
 * lose their place.
 *
 * No-ops while `open` is false, so it's safe to call unconditionally on every
 * render of a component that owns a popover's open state.
 */
export function useDismiss(
  containerRef: React.RefObject<HTMLElement | null> | Array<React.RefObject<HTMLElement | null>>,
  open: boolean,
  onClose: () => void,
  triggerRef?: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return;

    const refs = Array.isArray(containerRef) ? containerRef : [containerRef];

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!refs.some((r) => r.current?.contains(target))) onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
