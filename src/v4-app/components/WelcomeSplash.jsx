import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  v4WelcomeAckKey,
  v4WelcomeSessionKey,
  V4_SESSION_FIRST_PATH_KEY,
  v4FirstSessionPathWasDashboard,
} from '../lib/welcomeStorage';
import { ArrowRight } from 'lucide-react';

function displayFirstName(profile, user) {
  const full = profile?.full_name?.trim();
  if (full) return full.split(/\s+/)[0];
  const meta = user?.user_metadata?.full_name?.trim();
  if (meta) return meta.split(/\s+/)[0];
  const email = user?.email;
  if (email) return email.split('@')[0];
  return null;
}

/**
 * Full-screen welcome / welcome-back overlay for V4 (Dashboard only).
 * — First visit (per account, this browser): “Welcome”
 * — Later sessions: “Welcome back”
 * — At most once per browser session, only if the session’s first V4 URL was
 *   the dashboard (or `/v4` → dashboard redirect).
 */
export default function WelcomeSplash() {
  const { user, profile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(v4WelcomeSessionKey(user.id))) return;
    let firstPath = '';
    try {
      firstPath = sessionStorage.getItem(V4_SESSION_FIRST_PATH_KEY) || '';
    } catch {
      return;
    }
    if (!v4FirstSessionPathWasDashboard(firstPath)) return;
    setVisible(true);
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, [user?.id]);

  const dismiss = useCallback(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(v4WelcomeAckKey(user.id), '1');
      sessionStorage.setItem(v4WelcomeSessionKey(user.id), '1');
    } catch {
      /* ignore quota / private mode */
    }
    setEntered(false);
    window.setTimeout(() => setVisible(false), 220);
  }, [user?.id]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, dismiss]);

  if (!visible || !user?.id) return null;

  const returning = (() => {
    try {
      return localStorage.getItem(v4WelcomeAckKey(user.id)) === '1';
    } catch {
      return false;
    }
  })();

  const firstName = displayFirstName(profile, user);
  const title = returning
    ? firstName
      ? `Welcome back, ${firstName}`
      : 'Welcome back'
    : 'Welcome';
  const subtitle = returning
    ? 'Pick up where you left off — your workspace is ready.'
    : "You're in Professional Portal V4 — clients, content, CRM, and team tools in one place.";

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center px-6 py-10 transition-opacity duration-200 ease-out ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="v4-welcome-title"
      aria-describedby="v4-welcome-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1d1d1f]/40 dark:bg-black/60 backdrop-blur-[2px] border-0 cursor-pointer"
        aria-label="Dismiss welcome"
        onClick={dismiss}
      />

      <div
        className={`relative w-full max-w-[440px] rounded-3xl bg-white dark:bg-[#1c1c1e] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)] border border-black/[0.06] dark:border-white/10 overflow-hidden transition-all duration-200 ease-out ${
          entered ? 'translate-y-0 scale-100' : 'translate-y-3 scale-[0.98]'
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-[#0071e3]/12 via-transparent to-[#5856d6]/10 pointer-events-none" />

        <div className="relative px-8 pt-10 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <img
              src="/Luxury-listings-logo-CLR.png"
              alt=""
              className="h-11 w-auto"
            />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0071e3] mb-2">
            Luxury Listings · V4
          </p>
          <h1
            id="v4-welcome-title"
            className="text-[28px] sm:text-[32px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.03em] leading-tight mb-3"
          >
            {title}
          </h1>
          <p
            id="v4-welcome-desc"
            className="text-[15px] text-[#86868b] dark:text-[#a1a1a6] leading-relaxed mb-8"
          >
            {subtitle}
          </p>

          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] px-6 py-3 rounded-2xl bg-[#0071e3] text-white text-[15px] font-semibold shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] active:scale-[0.98] transition-all"
          >
            Continue
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
