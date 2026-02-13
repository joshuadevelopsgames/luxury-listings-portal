import React, { useState, useEffect, useCallback } from 'react';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';

// ── localStorage helpers for dismissed announcements ──────────────────────────
const DISMISSED_KEY = 'dismissed_announcements';

function getDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setDismissed(map) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(map));
  } catch { /* silent */ }
}

// ── Type → style mapping ─────────────────────────────────────────────────────
const TYPE_STYLES = {
  info: {
    bg: 'bg-[#0071e3]/10 dark:bg-[#0071e3]/20',
    border: 'border-[#0071e3]/20 dark:border-[#0071e3]/30',
    text: 'text-[#0071e3]',
    icon: Info,
  },
  warning: {
    bg: 'bg-[#ff9500]/10 dark:bg-[#ff9500]/20',
    border: 'border-[#ff9500]/20 dark:border-[#ff9500]/30',
    text: 'text-[#ff9500]',
    icon: AlertTriangle,
  },
  success: {
    bg: 'bg-[#34c759]/10 dark:bg-[#34c759]/20',
    border: 'border-[#34c759]/20 dark:border-[#34c759]/30',
    text: 'text-[#34c759]',
    icon: CheckCircle,
  },
  urgent: {
    bg: 'bg-[#ff3b30]/10 dark:bg-[#ff3b30]/20',
    border: 'border-[#ff3b30]/20 dark:border-[#ff3b30]/30',
    text: 'text-[#ff3b30]',
    icon: AlertCircle,
  },
};

/**
 * AnnouncementBanner — renders active site-wide announcements.
 *
 * Position: placed between the View-As banner and the sticky header in Layout.
 * Uses a real-time Firestore listener so new announcements appear instantly.
 *
 * @param {function} onHeightChange - callback with total banner height in px
 *   so the Layout can offset the sticky header.
 */
const AnnouncementBanner = ({ onHeightChange }) => {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissedState] = useState(getDismissed);
  const [exiting, setExiting] = useState({}); // track dismiss animations

  // Real-time listener
  useEffect(() => {
    if (!currentUser?.email) return;
    const unsubscribe = firestoreService.onActiveAnnouncementsChange((items) => {
      setAnnouncements(items);
    });
    return () => unsubscribe();
  }, [currentUser?.email]);

  // Filter out dismissed announcements (reset if updatedAt changed)
  const visible = announcements.filter((a) => {
    const entry = dismissed[a.id];
    if (!entry) return true; // never dismissed
    // If the announcement was edited after dismissal, show it again
    const updatedMs = a.updatedAt?.toDate?.()?.getTime?.() || a.updatedAt?.seconds * 1000 || 0;
    return updatedMs > entry;
  });

  // Report height changes to parent Layout
  useEffect(() => {
    if (onHeightChange) {
      // Each banner is ~44px; 0 when none visible
      onHeightChange(visible.length > 0 ? visible.length * 44 : 0);
    }
  }, [visible.length, onHeightChange]);

  const handleDismiss = useCallback((id) => {
    // Animate out
    setExiting((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      const next = { ...getDismissed(), [id]: Date.now() };
      setDismissed(next);
      setDismissedState(next);
      setExiting((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }, 250);
  }, []);

  if (visible.length === 0) return null;

  return (
    <div className="relative z-[35]">
      {visible.map((a) => {
        const style = TYPE_STYLES[a.type] || TYPE_STYLES.info;
        const Icon = style.icon;
        const isExiting = exiting[a.id];

        return (
          <div
            key={a.id}
            className={`
              ${style.bg} ${style.border} border-b
              transition-all duration-250 ease-out
              ${isExiting ? 'opacity-0 max-h-0 py-0 overflow-hidden' : 'opacity-100 max-h-20 py-2.5'}
            `}
          >
            <div className="flex items-center justify-between px-4 lg:px-6 max-w-[1600px] mx-auto gap-3">
              {/* Icon + content */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Icon className={`w-4 h-4 flex-shrink-0 ${style.text}`} />
                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                  {a.title && (
                    <span className={`text-[13px] font-semibold ${style.text} whitespace-nowrap`}>
                      {a.title}
                    </span>
                  )}
                  <span className="text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                    {a.message}
                  </span>
                </div>
              </div>

              {/* CTA link + dismiss */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {a.linkUrl && (
                  <a
                    href={a.linkUrl}
                    target={a.linkUrl.startsWith('http') ? '_blank' : '_self'}
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 text-[12px] font-medium ${style.text} hover:underline whitespace-nowrap`}
                  >
                    {a.linkText || 'Learn more'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {a.dismissible !== false && (
                  <button
                    onClick={() => handleDismiss(a.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    aria-label="Dismiss announcement"
                  >
                    <X className="w-3.5 h-3.5 text-[#86868b]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;
