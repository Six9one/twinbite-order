import { useRef, useCallback } from 'react';

/**
 * Hook that provides touch event handlers for swipe-down-to-dismiss behaviour.
 * Attach the returned handlers to the drag-handle element of a modal/wizard.
 * @param onDismiss - called when the user swipes down far enough to dismiss
 * @param threshold - pixels to swipe before dismissal fires (default 80)
 */
export function useSwipeToDismiss(onDismiss: () => void, threshold = 80) {
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && containerRef.current) {
      // Translate the container downward while dragging
      containerRef.current.style.transform = `translateY(${delta}px)`;
      containerRef.current.style.transition = 'none';
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.changedTouches[0].clientY - startY.current;
    startY.current = null;

    if (containerRef.current) {
      if (delta > threshold) {
        // Animate out and dismiss
        containerRef.current.style.transition = 'transform 0.25s ease';
        containerRef.current.style.transform = `translateY(100%)`;
        setTimeout(onDismiss, 240);
      } else {
        // Snap back
        containerRef.current.style.transition = 'transform 0.2s ease';
        containerRef.current.style.transform = 'translateY(0)';
      }
    }
  }, [onDismiss, threshold]);

  return { containerRef, onTouchStart, onTouchMove, onTouchEnd };
}
