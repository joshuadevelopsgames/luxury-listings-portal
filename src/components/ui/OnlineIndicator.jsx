/**
 * OnlineIndicator - Green dot when user is online, or "Last seen: X ago" when offline.
 * lastSeenAt: Firestore Timestamp (use .toMillis()) or number (ms since epoch).
 */
import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min

export function getLastSeenMs(lastSeenAt) {
  if (lastSeenAt == null) return null;
  if (typeof lastSeenAt === 'number') return lastSeenAt;
  if (lastSeenAt?.toMillis) return lastSeenAt.toMillis();
  return null;
}

export function isOnline(lastSeenAt) {
  const ms = getLastSeenMs(lastSeenAt);
  if (ms == null) return false;
  return Date.now() - ms < ONLINE_THRESHOLD_MS;
}

export function formatLastSeen(lastSeenAt) {
  const ms = getLastSeenMs(lastSeenAt);
  if (ms == null) return null;
  return formatDistanceToNow(ms, { addSuffix: true });
}

const OnlineIndicator = ({ lastSeenAt, showLabel = true, className = '' }) => {
  const ms = getLastSeenMs(lastSeenAt);
  const online = ms != null && Date.now() - ms < ONLINE_THRESHOLD_MS;
  const label = formatLastSeen(lastSeenAt);

  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] text-[#86868b] ${className}`}>
      <span
        className={`shrink-0 rounded-full ${online ? 'bg-[#34c759]' : 'bg-[#86868b]/50'} ${online ? 'w-2 h-2' : 'w-1.5 h-1.5'}`}
        title={online ? 'Online' : label ? `Last seen ${label}` : 'Never seen'}
        aria-hidden
      />
      {showLabel && (online ? <span>Online</span> : label ? <span>Last seen {label}</span> : <span>Never seen</span>)}
    </span>
  );
};

export default OnlineIndicator;
