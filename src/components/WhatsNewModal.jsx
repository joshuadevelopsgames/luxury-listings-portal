/**
 * "What's new" popup for the September 2026 Instagram reports release.
 *
 * Shown once per user to people who can open Instagram Analytics. Whether
 * someone has seen it is saved in system_config under whatsNewSeen:<email> (the
 * same per-user key pattern as currentRole:<email>), so dismissing it on one
 * computer hides it everywhere. A per-user localStorage copy skips that lookup
 * on later visits and covers a failed save.
 *
 * It can't be closed for the first 5 seconds, and that countdown only runs
 * while the tab is visible, so the update actually gets read. Change
 * RELEASE_ID for the next release to show the popup to everyone again.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Heart, Link as LinkIcon, Users, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
import './WhatsNewModal.css';

export const RELEASE_ID = '2026-09-instagram-reports';
const LOCK_SECONDS = 5;

const seenConfigKey = (email) => `whatsNewSeen:${email.toLowerCase()}`;
const seenLocalKey = (email) => `whats_new_seen:${email.toLowerCase()}`;

function seenLocally(email) {
  try { return localStorage.getItem(seenLocalKey(email)) === RELEASE_ID; } catch { return false; }
}

function rememberLocally(email) {
  try { localStorage.setItem(seenLocalKey(email), RELEASE_ID); } catch { /* storage blocked */ }
}

const STEPS = [
  'Create or edit an Instagram report, then click Next.',
  'Turn on Compare to another report.',
  'Pick the report to compare with. Last month’s is suggested.',
  'Save. A Performance Comparison section is added to the report.',
];

const UPDATES = [
  { icon: Heart, title: 'Every number you enter is on the report', body: 'Likes, comments, shares, saves, reposts and link taps now have their own spots, and cities and countries show together.' },
  { icon: LinkIcon, title: 'Top posts show up, with links', body: 'Posts and reels you add appear on the report with a clickable Instagram link, in the PDF too.' },
  { icon: Users, title: 'Follower Growth always shows', body: 'It now appears even when only net followers came through from the screenshots.' },
  { icon: RefreshCw, title: 'No refreshing', body: 'New and edited reports appear in the list as soon as you save.' },
];

// Illustrative numbers for the animation only.
const DEMO_ROWS = [
  { label: 'Views', pct: 124 },
  { label: 'Likes', pct: 163 },
  { label: 'Saves', pct: 258 },
  { label: 'Reposts', pct: -35 },
];

function ComparisonDemo() {
  const scale = Math.max(...DEMO_ROWS.map((r) => Math.abs(r.pct)));
  return (
    <div className="wn-demo" aria-hidden="true">
      {/* Scene 1: turning the comparison on in the report editor */}
      <div className="wn-scene wn-scene-edit">
        <div className="wn-window-bar"><i /><i /><i /><span>Instagram report · Step 2</span></div>
        <div className="wn-card">
          <div className="wn-row">
            <div>
              <div className="wn-strong">Compare to another report</div>
              <div className="wn-muted">Growth or decline against a report you pick</div>
            </div>
            <span className="wn-switch"><span className="wn-knob" /></span>
          </div>
          <div className="wn-select">
            <span>July 2026 · July Analytics (last month)</span>
            <span className="wn-caret" />
          </div>
        </div>
        <div className="wn-save">Save report</div>
        <span className="wn-cursor" />
      </div>

      {/* Scene 2: the section it adds to the report */}
      <div className="wn-scene wn-scene-report">
        <div className="wn-strong wn-report-title">Performance Comparison</div>
        <div className="wn-muted">Compared with July 2026</div>
        <div className="wn-rows">
          {DEMO_ROWS.map((r, i) => (
            <div key={r.label} className="wn-cmp-row" style={{ '--i': i }}>
              <span className="wn-label">{r.label}</span>
              <span className="wn-track">
                <span className={`wn-bar ${r.pct < 0 ? 'wn-down' : 'wn-up'}`} style={{ '--w': `${(Math.abs(r.pct) / scale) * 50}%` }} />
              </span>
              <span className="wn-pct">{r.pct > 0 ? '+' : '−'}{Math.abs(r.pct)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WhatsNewModal({ enabled, reportsPath = '/instagram-reports' }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const email = currentUser?.email || '';
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(LOCK_SECONDS);
  const dialogRef = useRef(null);
  const locked = secondsLeft > 0;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  // Open only for a signed-in user who hasn't seen this release on any device.
  useEffect(() => {
    if (!enabled || !email || seenLocally(email)) return undefined;
    let alive = true;
    supabaseService.getSystemConfig(seenConfigKey(email)).then((value) => {
      if (!alive) return;
      if (value && value.releaseId === RELEASE_ID) rememberLocally(email);
      else setOpen(true);
    });
    return () => { alive = false; };
  }, [enabled, email]);

  // Count down only while the tab is visible.
  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  const dismiss = (then) => {
    if (lockedRef.current) return;
    rememberLocally(email);
    supabaseService
      .saveSystemConfig(seenConfigKey(email), { releaseId: RELEASE_ID, seenAt: new Date().toISOString() })
      .catch((err) => console.warn('[WhatsNewModal] Could not save that this was seen:', err?.message || err));
    setOpen(false);
    if (then) then();
  };

  useEffect(() => {
    if (!open) return undefined;
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface rounded-2xl border border-hairline-strong shadow-lg outline-none overflow-hidden"
      >
        <div className="overflow-y-auto">
          <div className="px-6 pt-6 pb-4 border-b border-hairline">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[12px] font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> What’s new
            </span>
            <h2 id="whats-new-title" className="mt-3 text-[22px] leading-tight font-semibold text-ink">Instagram reports got an upgrade</h2>
            <p className="mt-1 text-[14px] text-ink-muted">Here’s what changed, and how to add the new comparison to a report.</p>
          </div>

          <div className="p-6 grid gap-7 md:grid-cols-[1.15fr_1fr]">
            <section>
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">New · Compare to another report</h3>
              <div className="mt-3"><ComparisonDemo /></div>
              <ol className="mt-4 space-y-2.5">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex gap-3 text-[14px] leading-snug text-ink">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-[12px] font-semibold flex items-center justify-center">{i + 1}</span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Also new</h3>
              <ul className="mt-3 space-y-4">
                {UPDATES.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-2 text-ink-muted flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-[14px] font-medium text-ink">{title}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-hairline bg-surface">
          <p className="text-[13px] text-ink-muted">
            {locked ? `You can close this in ${secondsLeft}s` : 'You’re all caught up.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dismiss()}
              disabled={locked}
              className="px-4 py-2 rounded-xl border border-hairline-strong text-ink text-[14px] font-medium hover:bg-surface-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {locked ? `Got it (${secondsLeft})` : 'Got it'}
            </button>
            <button
              type="button"
              onClick={() => dismiss(() => navigate(reportsPath))}
              disabled={locked}
              className="px-4 py-2 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Open Instagram Analytics
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
