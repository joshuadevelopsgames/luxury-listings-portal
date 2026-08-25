import { useLayoutEffect, useRef } from 'react';

const GAP = 4;   // px between trigger and panel
const EDGE = 8;  // keep this much clear of the viewport edge

/**
 * Keeps an absolutely-positioned dropdown on screen.
 *
 * A panel pinned with `top-full` always opens downward, so near the bottom of
 * a short viewport it runs off the screen. This measures the panel once it is
 * open and flips it above the trigger when it fits there. If it fits neither
 * side it takes the roomier one and caps max-height, so the panel is always
 * fully reachable instead of being cut off by the viewport.
 *
 * Attach the returned ref to the panel and leave `top-full`/`mt-*` off its
 * className — position is set inline so it can change without a re-render.
 *
 *   const flip = useDropdownFlip(isOpen);
 *   {isOpen && <div ref={flip} className="absolute left-0 …">…</div>}
 *
 * The panel's offset parent must be the trigger's wrapper (the usual
 * `relative` container), which is already how these dropdowns are built.
 */
export function useDropdownFlip(isOpen) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!isOpen || !el) return undefined;

    const place = () => {
      // Reset to the default (downward) placement before measuring.
      el.style.top = '100%';
      el.style.bottom = 'auto';
      el.style.marginTop = `${GAP}px`;
      el.style.marginBottom = '0px';
      el.style.maxHeight = '';
      el.style.overflowY = '';

      const trigger = el.offsetParent?.getBoundingClientRect();
      if (!trigger) return;

      const height = el.getBoundingClientRect().height;
      const roomBelow = window.innerHeight - trigger.bottom - GAP - EDGE;
      const roomAbove = trigger.top - GAP - EDGE;

      if (height <= roomBelow) return;           // fits below: nothing to do

      if (height <= roomAbove) {                 // fits above: flip
        el.style.top = 'auto';
        el.style.bottom = '100%';
        el.style.marginTop = '0px';
        el.style.marginBottom = `${GAP}px`;
        return;
      }

      // Fits neither side. Use the roomier one and cap the height so the whole
      // panel stays reachable rather than running off the screen.
      if (roomAbove > roomBelow) {
        el.style.top = 'auto';
        el.style.bottom = '100%';
        el.style.marginTop = '0px';
        el.style.marginBottom = `${GAP}px`;
      }
      el.style.maxHeight = `${Math.max(140, Math.max(roomAbove, roomBelow))}px`;
      el.style.overflowY = 'auto';
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [isOpen]);

  return ref;
}

export default useDropdownFlip;
