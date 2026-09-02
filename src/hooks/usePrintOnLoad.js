import { useCallback, useEffect, useRef } from 'react';

/**
 * Wait until the page is actually paintable: web fonts resolved and every
 * <img> either loaded or failed. The old export just guessed with a 600ms
 * timer, which fired before the report had laid out on slower connections.
 */
export async function waitForPagePaint({ root = document, timeout = 8000 } = {}) {
  const deadline = new Promise((resolve) => setTimeout(resolve, timeout));

  const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();

  const images = Promise.all(
    Array.from(root.querySelectorAll('img')).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    })
  );

  await Promise.race([Promise.all([fonts, images]), deadline]);

  // One more frame so layout settles after the last image swaps in — but
  // rAF never fires in a backgrounded tab, and the export link opens in a
  // new tab, so always race it against a timer.
  await Promise.race([
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    new Promise((resolve) => setTimeout(resolve, 150)),
  ]);
}

/**
 * Returns a `print()` callback that waits for the page to actually paint before
 * opening the dialog, and never fires twice concurrently. Safe whether the user
 * saves or cancels.
 */
export function usePrintPage() {
  const printingRef = useRef(false);

  const cleanup = useCallback(() => { printingRef.current = false; }, []);

  useEffect(() => {
    const after = () => cleanup();
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('afterprint', after);
      cleanup();
    };
  }, [cleanup]);

  return useCallback(async () => {
    if (printingRef.current) return;
    printingRef.current = true;
    try {
      await waitForPagePaint();
      window.print();
    } catch (e) {
      // Printing is best-effort; never leave the page in the printing state.
    }
    // Safari doesn't always fire `afterprint`; release the guard on the next
    // tick (window.print blocks until the dialog closes in every target browser).
    setTimeout(cleanup, 0);
  }, [cleanup]);
}
