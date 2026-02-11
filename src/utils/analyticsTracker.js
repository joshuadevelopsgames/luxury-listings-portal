/**
 * Lightweight usage analytics for admins: page views + time on page.
 * Firebase Analytics + Firestore dual-write so System Admin page can show in-app stats. Non-blocking.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAppAnalytics, logEvent, db } from '../firebase';

function logUsageEvent(eventType, pagePath, value) {
  if (!db) return;
  const data = { page_path: pagePath, event_type: eventType, timestamp: serverTimestamp() };
  if (eventType === 'time_on_page' && value != null) data.value = value;
  addDoc(collection(db, 'usage_events'), data).catch(() => {});
}

const PUBLIC_PATHS = ['/login', '/client-login', '/client-password-reset', '/client-waiting-for-approval', '/waiting-for-approval', '/__/auth/action'];
const REPORT_PATH_PREFIX = '/report/';

function isPublicPath(pathname) {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true;
  if (pathname.startsWith(REPORT_PATH_PREFIX)) return true;
  return false;
}

export function useAnalyticsTracker() {
  const location = useLocation();
  const pathname = location.pathname;
  const startedAt = useRef(null);
  const prevPath = useRef(null);

  // On route change: log previous page duration (if any), then log new page_view and start timer
  useEffect(() => {
    const analytics = getAppAnalytics();
    if (!analytics) return;

    const now = Date.now();
    if (prevPath.current != null && prevPath.current !== pathname && startedAt.current != null) {
      const durationSec = Math.round((now - startedAt.current) / 1000);
      logEvent(analytics, 'time_on_page', { page_path: prevPath.current, value: durationSec });
      logUsageEvent('time_on_page', prevPath.current, durationSec);
    }
    prevPath.current = pathname;
    startedAt.current = now;

    if (isPublicPath(pathname)) return;
    const pageTitle = pathname === '/' || pathname === '/dashboard' ? 'Dashboard' : pathname.replace(/^\//, '').replace(/-/g, ' ');
    logEvent(analytics, 'page_view', { page_path: pathname, page_title: pageTitle });
    logUsageEvent('page_view', pathname);
  }, [pathname]);

  // On tab close / navigate away: log time on current page
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      const analytics = getAppAnalytics();
      if (!analytics || !startedAt.current || !pathname) return;
      const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
      if (durationSec > 0) {
        logEvent(analytics, 'time_on_page', { page_path: pathname, value: durationSec });
        logUsageEvent('time_on_page', pathname, durationSec);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pathname]);
}
