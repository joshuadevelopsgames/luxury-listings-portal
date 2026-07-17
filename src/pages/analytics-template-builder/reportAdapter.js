// ============================================================
// Adapter: turn a stored Instagram report into the shape the
// template ReportCanvas renders. The report's `metrics` object already
// uses the same field names as the builder's REPORT_DATA.metrics, so the
// data pass-through is 1:1; we only rebuild the Key Metrics tiles and the
// Highlights body from real report content, and synthesize hero client info.
// ============================================================
import { BLOCK_LIBRARY } from './reportData';

const DEFAULT_OFF = ['screenshots'];
export const CLASSIC_THEME = { accentKey: 'instagram', surfaceKey: 'light', mode: 'light', fontKey: 'system', radiusKey: 'soft', shadowKey: 'soft', hoverKey: 'lift' };

// Fresh set of blocks from the library — used as the built-in fallback template
// when a report carries no template snapshot and no client default.
export function defaultBlocks() {
  return BLOCK_LIBRARY.map((m) => {
    const d = JSON.parse(JSON.stringify(m.defaults || {}));
    return { id: 'blk_' + m.type, type: m.type, span: m.span, locked: !!m.locked, enabled: !DEFAULT_OFF.includes(m.type), icon: m.icon, ...d };
  });
}

export function classicTemplate() {
  return { id: null, name: 'Classic', theme: { ...CLASSIC_THEME }, blocks: defaultBlocks() };
}

const fmtNum = (n) => (n == null || n === '' || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString());

// Derive an up/down/none trend from a value that may be a signed string
// ("+147.1%", "-34.3%") or a number.
function trendOf(v) {
  if (v == null || v === '') return 'none';
  if (typeof v === 'number') return v > 0 ? 'up' : v < 0 ? 'down' : 'none';
  const s = String(v).trim();
  if (s.startsWith('-')) return 'down';
  if (s.startsWith('+')) return 'up';
  return 'none';
}

// Build the canonical Key Metrics tiles from real report metrics. Missing
// values render as "—" (never example numbers). Returns [] when nothing known.
export function buildMetricTiles(m = {}) {
  const tiles = [];
  if ('views' in m || 'viewsFollowerPercent' in m) {
    tiles.push({ icon: 'eye', label: 'Total Views', value: fmtNum(m.views),
      sub: m.viewsFollowerPercent != null ? `${m.viewsFollowerPercent}% from followers` : '', trend: 'none' });
  }
  if ('followers' in m || 'followerChange' in m) {
    const fc = m.followerChange;
    const sub = fc != null ? `${fc > 0 ? '+' : ''}${fc}${m.followerChangePercent != null ? ` (${m.followerChangePercent}%)` : ''}` : '';
    tiles.push({ icon: 'users', label: 'Followers', value: fmtNum(m.followers), sub, trend: trendOf(fc) });
  }
  if ('profileVisits' in m) {
    tiles.push({ icon: 'pointer', label: 'Profile Visits', value: fmtNum(m.profileVisits),
      sub: m.profileVisitsChange != null ? String(m.profileVisitsChange) : '', trend: trendOf(m.profileVisitsChange) });
  }
  if ('accountsReached' in m) {
    tiles.push({ icon: 'globe', label: 'Accounts Reached', value: fmtNum(m.accountsReached),
      sub: m.accountsReachedChange != null ? String(m.accountsReachedChange) : '', trend: trendOf(m.accountsReachedChange) });
  }
  if ('contentShared' in m) {
    tiles.push({ icon: 'image', label: 'Content Shared', value: fmtNum(m.contentShared), sub: '', trend: 'none' });
  }
  return tiles;
}

// data payload for ReportCanvas: metrics pass through unchanged.
export function buildReportData(report) {
  return { metrics: (report && report.metrics) || {} };
}

// Build the ReportCanvas `template` object for a real report by overlaying the
// report's real content onto the chosen template's theme + block layout.
export function buildVirtualTemplate(report, source) {
  const base = source && source.blocks ? source : classicTemplate();
  const theme = { ...CLASSIC_THEME, ...(base.theme || {}) };
  const metrics = (report && report.metrics) || {};
  const tiles = buildMetricTiles(metrics);

  const blocks = (Array.isArray(base.blocks) ? base.blocks : []).map((b) => {
    const nb = JSON.parse(JSON.stringify(b));
    // Always replace the template's sample content with the report's real data,
    // so example numbers / placeholder copy never leak onto a real report.
    // Empty -> the block renders nothing (its component returns null).
    if (nb.type === 'metrics') nb.metrics = tiles;                       // real headline numbers (or none)
    if (nb.type === 'highlights') nb.body = (report && report.notes) || ''; // real AI summary (or none)
    return nb;
  });

  return {
    id: base.id || null,
    name: base.name || 'Report',
    theme,
    blocks,
    client: {
      name: (report && (report.clientName || report.client?.name)) || 'Client',
      dateRange: (report && report.dateRange) || '',
      agency: 'Luxury Listings',
      logo: (report && report.client && report.client.logo) || null,
    },
  };
}
