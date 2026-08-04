import { useEffect, useState, RefObject } from 'react';

/**
 * The home page's stacked-card scroll effect relies on `position: sticky; top: 0`
 * to pin each section at the top of the viewport. That only works while a section
 * is SHORTER than the viewport — a sticky element taller than its scrollport can
 * never pin, so the "fold" turns into a jump and part of the section can end up
 * unreachable behind the next card.
 *
 * This hook decides whether the effect is safe to run right now. It returns false
 * (→ render the sections in normal document flow) when:
 *
 *   1. the user asked for reduced motion (the scroll-linked scale is a vestibular
 *      trigger, and honouring this is a WCAG 2.3.3 expectation);
 *   2. the viewport is too short for pinning to read as anything but a jump
 *      (landscape phones, split-screen tablets);
 *   3. any tracked section is actually taller than the viewport — measured, not
 *      guessed, so growing content (reviews, gallery) degrades gracefully instead
 *      of silently breaking the layout.
 *
 * All three are re-evaluated on resize, orientation change and content resize.
 */
const MIN_VIEWPORT_HEIGHT = 600;

export function useStackEffectEnabled(containerRef: RefObject<HTMLElement>): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const evaluate = () => {
      if (motionQuery.matches) {
        setEnabled(false);
        return;
      }

      const viewportHeight = window.innerHeight;
      if (viewportHeight < MIN_VIEWPORT_HEIGHT) {
        setEnabled(false);
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      // Each direct child is one sticky layer; if any is taller than the
      // viewport it can never pin, so drop the whole effect rather than ship a
      // half-broken one.
      const overflows = Array.from(container.children).some(
        (child) => child.getBoundingClientRect().height > viewportHeight
      );
      setEnabled(!overflows);
    };

    evaluate();

    const resizeObserver = new ResizeObserver(evaluate);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      for (const child of Array.from(containerRef.current.children)) {
        resizeObserver.observe(child);
      }
    }

    window.addEventListener('resize', evaluate);
    window.addEventListener('orientationchange', evaluate);
    motionQuery.addEventListener('change', evaluate);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', evaluate);
      window.removeEventListener('orientationchange', evaluate);
      motionQuery.removeEventListener('change', evaluate);
    };
  }, [containerRef]);

  return enabled;
}
