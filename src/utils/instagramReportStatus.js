/**
 * Instagram report status helpers — shared by InstagramReportsPage and the
 * dashboard's Instagram Analytics card so both always agree on
 * "which clients still need a report".
 *
 * Extracted from InstagramReportsPage.jsx (single source of truth).
 */

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/**
 * Parse the START date from a dateRange string like "Feb 24 - Mar 2, 2025",
 * "Feb 24th - March 2nd", "Dec 28, 2024 - Jan 3, 2025", "MARCH 3RD - MARCH 9TH".
 */
export function parseDateFromRange(dateRange) {
  if (!dateRange || typeof dateRange !== 'string') return null;
  // Extract start portion (before the dash separator)
  const parts = dateRange.split(/\s*[-–—]\s*/);
  const startPart = (parts[0] || '').trim();
  // Also grab the end portion to find a year if start doesn't have one
  const endPart = (parts.slice(1).join('-') || '').trim();
  // Find month name
  const monthMatch = startPart.match(/([a-zA-Z]+)/);
  if (!monthMatch) return null;
  const monthKey = monthMatch[1].toLowerCase().replace(/\.$/, '');
  const monthIdx = MONTH_MAP[monthKey] ?? MONTH_MAP[monthKey.slice(0, 3)];
  if (monthIdx == null) return null;
  // Find day number (strip ordinal suffixes)
  const dayMatch = startPart.match(/(\d+)/);
  if (!dayMatch) return null;
  const day = parseInt(dayMatch[1], 10);
  // Find year: check startPart first, then endPart, then dateRange as a whole
  let year = null;
  const yearMatch = startPart.match(/\b(20\d{2})\b/) || endPart.match(/\b(20\d{2})\b/) || dateRange.match(/\b(20\d{2})\b/);
  if (yearMatch) year = parseInt(yearMatch[1], 10);
  else year = new Date().getFullYear(); // fallback to current year
  return new Date(year, monthIdx, day);
}

/**
 * Sorting date for a report: prefer the dateRange (the period it covers),
 * then startDate, then createdAt.
 */
export function getReportSortDate(report) {
  if (!report || typeof report !== 'object') return new Date(0);
  const parsed = parseDateFromRange(report.dateRange);
  if (parsed && !isNaN(parsed.getTime())) return parsed;
  if (report.startDate) {
    const d = typeof report.startDate === 'string'
      ? new Date(report.startDate + (report.startDate.includes('T') ? '' : 'T12:00:00'))
      : report.startDate?.toDate?.() || new Date(report.startDate);
    if (!isNaN(d.getTime())) return d;
  }
  if (report.createdAt) {
    const d = typeof report.createdAt === 'string'
      ? new Date(report.createdAt)
      : report.createdAt?.toDate?.() || new Date(report.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

/** Year of the period a report covers. Uses stored year when present. */
export function getReportYear(report) {
  if (!report || typeof report !== 'object') return 0;
  if (report.year != null && !Number.isNaN(Number(report.year))) return Number(report.year);
  const d = getReportSortDate(report);
  return d ? d.getFullYear() : 0;
}

/** Month (1-indexed) of the period a report covers. Uses stored month when present. */
export function getReportMonth(report) {
  if (!report || typeof report !== 'object') return 0;
  if (report.month != null && report.month >= 1 && report.month <= 12) return report.month;
  const d = getReportSortDate(report);
  return d ? d.getMonth() + 1 : 0;
}

/** 'complete' | 'partial' | 'incomplete' based on the key metrics being filled in. */
export function getReportCompletionStatus(metrics) {
  if (!metrics || typeof metrics !== 'object') return 'incomplete';
  const keyFields = ['followers', 'accountsReached', 'interactions', 'followerChange'];
  const ignored = Array.isArray(metrics._ignoredFields) ? metrics._ignoredFields : [];
  const active = keyFields.filter((f) => !ignored.includes(f));
  if (active.length === 0) return 'complete';
  const filled = active.filter((f) => metrics[f] != null && metrics[f] !== '').length;
  if (filled >= active.length) return 'complete';
  if (filled >= Math.min(2, active.length)) return 'partial';
  return 'incomplete';
}

export function isClientStatusArchived(client) {
  return (client?.status || 'active') === 'archived';
}

/** Match instagram_reports.client_id / client_id_legacy (UUID + Firebase doc ids from meta). */
export function collectClientReportLinkIds(client) {
  if (!client) return [];
  const ids = new Set();
  const add = (v) => {
    if (v == null || v === '') return;
    const s = String(v).trim();
    if (s) ids.add(s);
  };
  add(client.id);
  add(client.clientId);
  add(client.firebaseId);
  add(client.firestoreId);
  const meta = client.meta;
  if (meta && typeof meta === 'object') {
    add(meta.firebaseId);
    add(meta.firestoreId);
    add(meta.clientId);
    add(meta.id);
  }
  return [...ids];
}

/**
 * Which month the team is currently being measured on.
 * Reports aren't typically due until the 4th–5th, so until the 15th we still
 * report on the PREVIOUS month. Mirrors InstagramReportsPage exactly.
 */
export function getReportStatusPeriod(now = new Date()) {
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-indexed
  if (now.getDate() <= 15) {
    month -= 1;
    if (month === 0) { month = 12; year -= 1; }
  }
  return { year, month, label: `${MONTH_NAMES[month - 1]} ${year}` };
}

/** Map every id a report could reference back to its client. */
export function buildClientReportIndex(clients) {
  const index = new Map();
  (clients || []).forEach((client) => {
    collectClientReportLinkIds(client).forEach((id) => {
      if (!index.has(id)) index.set(id, client);
    });
  });
  return index;
}

/** { clientId -> report[] } for the given clients. */
export function groupReportsByClient(clients, reports) {
  const index = buildClientReportIndex(clients);
  const byClient = new Map();
  (clients || []).forEach((c) => byClient.set(c.id, []));
  (reports || []).forEach((r) => {
    if (!r?.clientId) return;
    const client = index.get(String(r.clientId));
    if (client && byClient.has(client.id)) byClient.get(client.id).push(r);
  });
  return byClient;
}

/**
 * Per-client monthly status for the current reporting period.
 *
 * @returns {{
 *   period: {year:number, month:number, label:string},
 *   rows: Array<{client:object, report:object|null, status:'complete'|'partial'|'missing'}>,
 *   outstanding: Array<{client:object, report:object|null, status:'partial'|'missing'}>,
 *   complete:number, partial:number, missing:number, total:number, percentComplete:number
 * }}
 */
export function computeMonthlyReportStatus(clients, reports, now = new Date()) {
  const period = getReportStatusPeriod(now);
  const byClient = groupReportsByClient(clients, reports);

  const rows = (clients || []).map((client) => {
    const clientReports = byClient.get(client.id) || [];
    const report = clientReports.find((r) => (
      getReportYear(r) === period.year
      && getReportMonth(r) === period.month
      && (!r.reportType || r.reportType === 'monthly')
    )) || null;
    if (!report) return { client, report: null, status: 'missing' };
    const completion = getReportCompletionStatus(report.metrics);
    // 'incomplete' counts as missing — same as the Instagram Reports overview row
    return { client, report, status: completion === 'complete' ? 'complete' : completion === 'partial' ? 'partial' : 'missing' };
  });

  const complete = rows.filter((r) => r.status === 'complete').length;
  const partial = rows.filter((r) => r.status === 'partial').length;
  const missing = rows.filter((r) => r.status === 'missing').length;
  const total = rows.length;

  // Missing first, then partial; alphabetical within each group.
  const nameOf = (r) => (r.client.clientName || r.client.name || '').toLowerCase();
  const outstanding = rows
    .filter((r) => r.status !== 'complete')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'missing' ? -1 : 1;
      return nameOf(a).localeCompare(nameOf(b));
    });

  return {
    period,
    rows,
    outstanding,
    complete,
    partial,
    missing,
    total,
    percentComplete: total > 0 ? Math.round((complete / total) * 100) : 0,
  };
}
