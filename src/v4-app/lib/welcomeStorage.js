/** Keys for V4 welcome splash (see components/WelcomeSplash.jsx). */

/** First authenticated V4 pathname this browser session (set from Layout). */
export const V4_SESSION_FIRST_PATH_KEY = 'v4_session_first_path';

/** True if that first URL was the dashboard entry (including bare `/v4`). */
export function v4FirstSessionPathWasDashboard(storedPath) {
  if (!storedPath) return false;
  const p = storedPath.replace(/\/$/, '') || '/';
  return p === '/v4' || p === '/v4/dashboard';
}

export function v4WelcomeAckKey(userId) {
  return `v4_welcome_ack_${userId}`;
}

export function v4WelcomeSessionKey(userId) {
  return `v4_welcome_sess_${userId}`;
}
