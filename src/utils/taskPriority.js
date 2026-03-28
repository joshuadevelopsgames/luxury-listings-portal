/**
 * tasks.priority and task_templates.priority are INT in Postgres (1–4).
 * UI and seed data often use string labels or p1–p4.
 */

const LABEL_TO_INT = {
  low: 1,
  medium: 2,
  normal: 2,
  high: 3,
  urgent: 4,
  critical: 4,
  p1: 4,
  p2: 3,
  p3: 2,
  p4: 1,
};

/** Coerce any common priority representation to 1–4 for DB writes. */
export function normalizeTaskPriorityToInt(p, fallback = 2) {
  if (p == null || p === '') return fallback;
  if (typeof p === 'number' && Number.isFinite(p)) {
    const n = Math.round(p);
    if (n >= 1 && n <= 4) return n;
    return fallback;
  }
  const s = String(p).toLowerCase().trim();
  if (LABEL_TO_INT[s] !== undefined) return LABEL_TO_INT[s];
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= 4) return n;
  return fallback;
}

/** Map stored INT or legacy strings to canonical labels for UI (DailyTask, productivity, etc.). */
export function taskPriorityToLabel(p) {
  if (p == null || p === '') return 'medium';
  if (typeof p === 'number' && Number.isFinite(p)) {
    const n = Math.round(p);
    if (n <= 1) return 'low';
    if (n === 2) return 'medium';
    if (n === 3) return 'high';
    if (n >= 4) return 'urgent';
    return 'medium';
  }
  const s = String(p).toLowerCase().trim();
  if (['low', 'medium', 'high', 'urgent'].includes(s)) return s;
  if (s === 'normal') return 'medium';
  if (s === 'critical') return 'urgent';
  if (LABEL_TO_INT[s] !== undefined) {
    return taskPriorityToLabel(LABEL_TO_INT[s]);
  }
  const n = parseInt(s, 10);
  if (!Number.isNaN(n)) return taskPriorityToLabel(n);
  return 'medium';
}
