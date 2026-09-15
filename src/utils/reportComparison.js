/**
 * "Compare to another report" on Instagram reports.
 *
 * The editor lets the team pick another of the client's reports (last month's
 * is suggested) and freezes the numbers a comparison covers into the report on
 * save, the same way the template is snapshotted — so the public page and the
 * PDF need no second lookup.
 */

// The numbers a comparison covers, in the order the report shows them. Net
// follower change is left out on purpose: it swings through zero, so a
// percentage change of it means nothing.
export const COMPARISON_METRICS = [
  { key: 'views', label: 'Views' },
  { key: 'accountsReached', label: 'Viewers' },
  { key: 'followers', label: 'Followers' },
  { key: 'profileVisits', label: 'Profile Visits' },
  { key: 'externalLinkTaps', label: 'Link Taps' },
  { key: 'interactions', label: 'Interactions' },
  { key: 'likes', label: 'Likes' },
  { key: 'comments', label: 'Comments' },
  { key: 'shares', label: 'Shares' },
  { key: 'saves', label: 'Saves' },
  { key: 'reposts', label: 'Reposts' },
  { key: 'contentShared', label: 'Content Shared' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// 'YYYY-MM-DD' (optionally with a time part) -> UTC midnight in ms, else null.
function dayOf(value) {
  const m = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function monthOf(report) {
  const day = dayOf(report?.startDate);
  if (day == null) return null;
  const d = new Date(day);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

const updatedStamp = (r) => new Date(r.updatedAt || r.createdAt || 0).getTime() || 0;

/**
 * True when a report covers a whole month (28–31 days). Weekly reports mostly
 * have no report type set, so the period dates are what decide it.
 */
export function isFullMonthReport(report) {
  const start = dayOf(report?.startDate);
  const end = dayOf(report?.endDate);
  if (start == null || end == null) return false;
  const days = Math.round((end - start) / DAY_MS) + 1;
  return days >= 28 && days <= 31;
}

/** How a compared report is named: "July 2026" for a full month, else its date range. */
export function comparisonLabel(report) {
  const period = isFullMonthReport(report) ? monthOf(report) : null;
  if (period) {
    return new Date(Date.UTC(period.year, period.month - 1, 1))
      .toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  return report?.dateRange || report?.title || 'Previous report';
}

/**
 * The client's other reports `current` can be compared with, newest period
 * first. `current` needs clientId (plus clientIds for a client known by more
 * than one id), so the editor can pass its unsaved form. Quarterly and yearly
 * roll-ups are left out — they aren't like-for-like with a month or a week.
 */
export function listComparableReports(reports, current) {
  const ids = new Set([current?.clientId, ...(current?.clientIds || [])].filter(Boolean).map(String));
  if (!ids.size) return [];
  return (reports || [])
    .filter((r) => (
      r
      && !(current.id && r.id === current.id)
      && ids.has(String(r.clientId))
      && (!r.reportType || r.reportType === 'monthly' || r.reportType === 'weekly')
    ))
    .sort((a, b) => ((dayOf(b.startDate) ?? 0) - (dayOf(a.startDate) ?? 0)) || (updatedStamp(b) - updatedStamp(a)));
}

/**
 * The suggested comparison: the same client's full-month report for the month
 * before `current`, or null (including when `current` isn't a full month).
 * When a month has duplicates, the most recently updated report wins.
 */
export function findPreviousMonthReport(reports, current) {
  const period = isFullMonthReport(current) ? monthOf(current) : null;
  if (!period) return null;
  const prevYear = period.month === 1 ? period.year - 1 : period.year;
  const prevMonth = period.month === 1 ? 12 : period.month - 1;
  return listComparableReports(reports, current)
    .filter((r) => {
      const p = isFullMonthReport(r) ? monthOf(r) : null;
      return Boolean(p) && p.year === prevYear && p.month === prevMonth;
    })
    .sort((a, b) => updatedStamp(b) - updatedStamp(a))[0] || null;
}

/**
 * What a report stores when a comparison is on: the other report's own numbers
 * for the compared metrics, plus what to call it.
 */
export function buildComparisonSnapshot(otherReport) {
  if (!otherReport) return null;
  const source = otherReport.metrics || {};
  const metrics = {};
  COMPARISON_METRICS.forEach(({ key }) => {
    const n = toNumber(source[key]);
    if (n != null) metrics[key] = n;
  });
  return { reportId: otherReport.id || null, label: comparisonLabel(otherReport), dateRange: otherReport.dateRange || '', metrics };
}

/**
 * One row per compared metric with a number in BOTH reports — a report without
 * the number is left out, never read as zero. `pct` is null when the compared
 * report had 0, since there's no base to measure change against.
 */
export function comparisonRows(currentMetrics, previousMetrics) {
  if (!previousMetrics) return [];
  return COMPARISON_METRICS.map(({ key, label }) => {
    const curr = toNumber(currentMetrics?.[key]);
    const prev = toNumber(previousMetrics[key]);
    if (curr == null || prev == null) return null;
    const diff = curr - prev;
    return { key, label, prev, curr, diff, pct: prev === 0 ? null : (diff / Math.abs(prev)) * 100 };
  }).filter(Boolean);
}
