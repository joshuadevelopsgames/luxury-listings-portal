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

function libraryBlock(m) {
  const d = JSON.parse(JSON.stringify(m.defaults || {}));
  return { id: 'blk_' + m.type, type: m.type, span: m.span, locked: !!m.locked, enabled: !DEFAULT_OFF.includes(m.type), icon: m.icon, ...d };
}

// Fresh set of blocks from the library — used as the built-in fallback template
// when a report carries no template snapshot and no client default.
export function defaultBlocks() {
  return BLOCK_LIBRARY.map(libraryBlock);
}

// Template snapshots freeze the block list when a template or report is saved,
// so a section added to the library later (e.g. Engagement) would never appear
// on anything saved before it. Insert each missing library block, switched on,
// right after the nearest block that precedes it in library order.
export function withLibraryBlocks(blocks) {
  const out = Array.isArray(blocks) ? blocks.slice() : [];
  BLOCK_LIBRARY.forEach((m, li) => {
    if (out.some((b) => b.type === m.type)) return;
    let at = 0;
    for (let i = li - 1; i >= 0; i--) {
      const idx = out.findIndex((b) => b.type === BLOCK_LIBRARY[i].type);
      if (idx !== -1) { at = idx + 1; break; }
    }
    out.splice(at, 0, libraryBlock(m));
  });
  return out;
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
// A change box filled in without its base number still gets its tile.
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
  if ('profileVisits' in m || 'profileVisitsChange' in m) {
    tiles.push({ icon: 'pointer', label: 'Profile Visits', value: fmtNum(m.profileVisits),
      sub: m.profileVisitsChange != null ? String(m.profileVisitsChange) : '', trend: trendOf(m.profileVisitsChange) });
  }
  if ('accountsReached' in m || 'accountsReachedChange' in m) {
    tiles.push({ icon: 'globe', label: 'Viewers', value: fmtNum(m.accountsReached),
      sub: m.accountsReachedChange != null ? String(m.accountsReachedChange) : '', trend: trendOf(m.accountsReachedChange) });
  }
  if ('externalLinkTaps' in m) {
    tiles.push({ icon: 'link', label: 'Link Taps', value: fmtNum(m.externalLinkTaps), sub: '', trend: 'none' });
  }
  if ('contentShared' in m) {
    tiles.push({ icon: 'image', label: 'Content Shared', value: fmtNum(m.contentShared), sub: '', trend: 'none' });
  }
  return tiles;
}

// The post/reel links the team added under "Social media post previews",
// minus the blank rows the editor leaves behind.
export function getPostLinks(report) {
  const links = report && Array.isArray(report.postLinks) ? report.postLinks : [];
  return links.filter((l) => l && typeof l.url === 'string' && l.url.trim());
}

// The report picked under "Compare to another report" (see utils/reportComparison).
// The editor passes it on the in-progress report; a saved report carries it in
// its template snapshot. null when the comparison is off.
export function getComparison(report) {
  return (report && (report.comparison || (report.template && report.template.comparison))) || null;
}

// data payload for ReportCanvas: metrics pass through unchanged; post links
// feed the Top Content block; the comparison feeds the Comparison block.
export function buildReportData(report) {
  return { metrics: (report && report.metrics) || {}, postLinks: getPostLinks(report), comparison: getComparison(report) };
}

// Build the ReportCanvas `template` object for a real report by overlaying the
// report's real content onto the chosen template's theme + block layout.
export function buildVirtualTemplate(report, source) {
  const base = source && source.blocks ? source : classicTemplate();
  const theme = { ...CLASSIC_THEME, ...(base.theme || {}) };
  const metrics = (report && report.metrics) || {};
  const tiles = buildMetricTiles(metrics);
  const hasPosts = getPostLinks(report).length > 0;
  const hasComparison = Boolean(getComparison(report));

  const blocks = withLibraryBlocks(base.blocks).map((b) => {
    const nb = JSON.parse(JSON.stringify(b));
    // Always replace the template's sample content with the report's real data,
    // so example numbers / placeholder copy never leak onto a real report.
    // Empty -> the block renders nothing (its component returns null).
    if (nb.type === 'metrics') nb.metrics = tiles;                       // real headline numbers (or none)
    if (nb.type === 'highlights') nb.body = (report && report.notes) || ''; // real AI summary (or none)
    // Embedded posts need the full width — the block's 'half' default was sized
    // for the builder's three small sample tiles.
    if (nb.type === 'topContent' && hasPosts) nb.span = 'full';
    // Turning on a comparison is a per-report choice, so it shows even when the
    // template hides the section.
    if (nb.type === 'comparison' && hasComparison) nb.enabled = true;
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
