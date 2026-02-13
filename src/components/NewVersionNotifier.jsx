/**
 * Polls version.json and shows a persistent toast when a new deploy is live,
 * so users with a stale session can refresh to get the latest version.
 */
import React, { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { RefreshCw, X } from 'lucide-react';

const VERSION_CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const TOAST_DELAY_MS = 90 * 1000; // Wait 90s after detecting new version before showing toast (give build time to be ready)
const VERSION_URL = '/version.json';

export default function NewVersionNotifier() {
  const versionAtLoad = useRef(null);
  const toastIdRef = useRef(null);
  const toastDelayTimeoutRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const check = async () => {
      try {
        const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const current = data?.version ?? null;
        if (current == null) return;

        if (versionAtLoad.current === null) {
          versionAtLoad.current = current;
          return;
        }
        if (versionAtLoad.current === current) return;

        // New version deployed; delay before showing toast so build has time to be ready
        if (toastIdRef.current != null) return;
        if (toastDelayTimeoutRef.current) return;
        toastDelayTimeoutRef.current = setTimeout(() => {
          toastDelayTimeoutRef.current = null;
          if (cancelled || toastIdRef.current != null) return;
          const id = toast.custom(
            (t) => (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1d1d1f] dark:bg-[#2c2c2e] text-white shadow-lg border border-white/10 min-w-[280px]"
                role="alert"
              >
                <RefreshCw className="w-5 h-5 text-[#34c759] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium">New version available</p>
                  <p className="text-[12px] text-white/70 mt-0.5">Refresh to get the latest updates.</p>
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.reload();
                  }}
                  className="shrink-0 text-[13px] font-medium text-[#34c759] hover:text-[#30d158] underline"
                >
                  See new version
                </a>
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ),
            { duration: Infinity }
          );
          toastIdRef.current = id;
        }, TOAST_DELAY_MS);
      } catch (_) {
        // Ignore network errors; version check is best-effort
      }
    };

    check();
    intervalId = setInterval(check, VERSION_CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      if (toastDelayTimeoutRef.current) {
        clearTimeout(toastDelayTimeoutRef.current);
        toastDelayTimeoutRef.current = null;
      }
    };
  }, []);

  return null;
}
