// ============================================================
// Report block components. Each renders content only; the canvas
// wraps them with selection chrome. Styling is driven by CSS vars
// set on the report root so theme changes apply live.
// Ported from the design handoff prototype (was window.* globals).
// ============================================================
import React from 'react';
import { Icon } from './Icon';
import { HERO_SHAPES } from './reportData';
import { getInstagramEmbedUrl, getInstagramPostUrl } from '../../utils/instagramEmbed';
import { comparisonRows } from '../../utils/reportComparison';

export const GRAD = 'linear-gradient(135deg, var(--accent-from), var(--accent-via), var(--accent-to))';

// Builds a single-layer alpha mask url from a normalized cut path (0..100 box).
export function heroMaskUrl(cut) {
  const svg = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path fill='#fff' fill-rule='evenodd' d='M0 0H100V100H0Z ${cut}'/></svg>`
  );
  return `url("${svg}")`;
}

function Card({ children, style, className = '' }) {
  return (
    <div
      className={'rep-card ' + className}
      style={{
        background: 'var(--card-bg)',
        borderRadius: 'var(--r-card)',
        boxShadow: 'var(--shadow-card)',
        padding: 24,
        // Fill the grid row so cards sitting side by side share a bottom edge.
        height: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Heading({ icon, children }) {
  return (
    <h3 className="rep-heading" style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 650, color: 'var(--text)', margin: '0 0 18px' }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent-solid)' }}>
        <Icon name={icon} className="ic-16" />
      </span>
      {children}
    </h3>
  );
}

// A real number, or null when the value is missing/blank/non-numeric. OCR leaves
// holes ({}, {women: 100}, {men: null}), and treating those as 0 printed
// convincing-looking zeros on client reports — use this to fall back to "—".
function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Compact number for content-type counts: 18000 -> "18K", 6300 -> "6.3K", 479 -> "479".
function fmtCompact(n) {
  const num = Number(n);
  if (n == null || n === '' || Number.isNaN(num)) return '—';
  const abs = Math.abs(num);
  if (abs >= 1000) {
    const v = num / 1000;
    return (abs >= 10000 ? Math.round(v) : Math.round(v * 10) / 10) + 'K';
  }
  return num.toLocaleString();
}

function Bar({ label, value, max = 100, suffix = '%', display = null }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontWeight: 650, color: 'var(--text)' }}>{display != null ? display : value}{suffix}</span>
      </div>
      <div style={{ width: '100%', height: 10, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 999, background: GRAD, width: Math.min(100, (value / max) * 100) + '%', transition: 'width .5s cubic-bezier(.2,.8,.2,1)' }} />
      </div>
    </div>
  );
}

// ---------- HERO ----------
function HeroBlock({ block, client, logo }) {
  const sh = HERO_SHAPES.find((s) => s.key === (block.shape || 'swoop')) || HERO_SHAPES[0];
  const padBottom = sh.cut ? 84 : 46;

  // Single-layer mask → genuine transparency, no seam. Border-radius rounds the top corners.
  // `hero-bg-fill` is a print hook: the mask has to be switched off for paged
  // output (see print.css) — the print rasteriser applies it in tiles and drops
  // some of them, tearing white columns through the gradient.
  const bgStyle = {
    position: 'absolute', inset: 0, borderRadius: 'var(--r-card)',
    background: 'radial-gradient(circle at 80% -10%, rgba(255,255,255,.25), transparent 45%), ' + GRAD,
  };
  if (sh.cut) {
    const m = heroMaskUrl(sh.cut);
    Object.assign(bgStyle, {
      WebkitMaskImage: m, maskImage: m,
      WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
    });
  }

  return (
    // `hero-block` / `hero-bg` are print hooks: paged output drops a filtered
    // layer entirely, so print.css has to switch the drop-shadow off (see
    // `.hero-bg` there) or the whole gradient disappears from the PDF.
    <div className="hero-block" style={{ position: 'relative' }}>
      {/* shadow caster follows the masked silhouette */}
      <div className="hero-bg" style={{ position: 'absolute', inset: 0, filter: 'var(--hero-shadow)' }}>
        <div className="hero-bg-fill" style={bgStyle} />
      </div>
      {/* Print-only twin of the mask. Paged output ignores `mask-image`, so the
          shaped bottom edge would print as a straight line; painting the same
          cut path in the report background colour gives the identical
          silhouette using geometry the print rasteriser does honour. */}
      {sh.cut ? (
        <svg
          className="hero-cut"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'none', pointerEvents: 'none' }}
        >
          <path d={sh.cut} style={{ fill: 'var(--report-bg)' }} />
        </svg>
      ) : null}
      <div className="hero-inner" style={{ position: 'relative', padding: `40px 36px ${padBottom}px`, textAlign: 'center', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {logo ? (
            <img src={logo} alt="logo" style={{ height: 44, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.2))' }} />
          ) : (
            <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 13, background: 'rgba(255,255,255,.2)', backdropFilter: 'blur(4px)' }}>
              <Icon name={block.icon || 'instagram'} className="ic-22" />
            </span>
          )}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 999, background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(4px)', fontSize: 13.5, fontWeight: 600 }}>
          <Icon name="calendar" className="ic-14" />{client.dateRange}
        </div>
        <h1 className="hero-title" style={{ fontSize: 38, fontWeight: 750, margin: 0, lineHeight: 1.12, letterSpacing: '-0.02em', maxWidth: '100%' }}>{block.title}</h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 17, opacity: .95 }}>
          <Icon name="user" className="ic-18" />{client.name}
        </div>
      </div>
    </div>
  );
}

// ---------- METRICS ----------
function MetricsBlock({ block, data }) {
  const tiles = (block.metrics && block.metrics.length ? block.metrics : []).map((t) => ({
    ...t, up: t.trend === 'up' ? true : t.trend === 'down' ? false : null,
  }));
  if (!tiles.length) return null;
  const cols = tiles.length <= 4 ? Math.max(1, tiles.length) : 3;
  return (
    <div>
      {block.title ? <Heading icon={block.icon || 'zap'}>{block.title}</Heading> : null}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }} className="metric-grid">
        {tiles.map((t, i) => (
          <Card key={i} style={{ padding: 20 }}>
            <div style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: GRAD, color: '#fff', marginBottom: 14 }}>
              <Icon name={t.icon} className="ic-22" />
            </div>
            <div className="metric-value" style={{ fontSize: 28, fontWeight: 750, color: 'var(--text)', letterSpacing: '-0.02em' }}>{t.value}</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>{t.label}</div>
            {t.sub ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12.5, fontWeight: 600, color: t.up === null ? 'var(--text-faint)' : t.up ? '#16a34a' : '#ef4444' }}>
                {t.up !== null && <Icon name={t.up ? 'trendUp' : 'trendDown'} className="ic-13" />}
                {t.sub}
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- HIGHLIGHTS ----------
function HighlightsBlock({ block }) {
  if (!block.body) return null;
  return (
    <Card>
      <Heading icon={block.icon || 'message'}>{block.title}</Heading>
      <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.7, color: 'var(--text-muted)', textWrap: 'pretty' }}>{block.body}</p>
    </Card>
  );
}

// ---------- VIEWS / INTERACTIONS BY CONTENT ----------
function ContentBarsBlock({ block, data, field, icon }) {
  const items = data.metrics?.[field];
  if (!Array.isArray(items) || !items.length) return null;
  // Newer Instagram layout gives raw counts (e.g. Posts 18K); older layout gives
  // percentages. Render whichever each row carries, scaling bars to the max count.
  const useCount = items.some((it) => it.count != null && it.count !== '');
  const max = useCount ? (Math.max(...items.map((it) => Number(it.count) || 0)) || 1) : 100;
  return (
    <Card>
      <Heading icon={block.icon || icon}>{block.title}</Heading>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{items.map((it, i) => (
        useCount
          ? <Bar key={i} label={it.type} value={Number(it.count) || 0} max={max} suffix="" display={fmtCompact(it.count)} />
          : <Bar key={i} label={it.type} value={Number(it.percentage) || 0} suffix="%" />
      ))}</div>
    </Card>
  );
}

// ---------- ENGAGEMENT ----------
// The editor's interaction boxes. Until this block existed, likes, comments,
// shares, saves and reposts had no section at all, so numbers the team typed in
// never reached the report.
const ENGAGEMENT_TILES = [
  { key: 'likes', label: 'Likes', icon: 'heart' },
  { key: 'comments', label: 'Comments', icon: 'message' },
  { key: 'shares', label: 'Shares', icon: 'send' },
  { key: 'saves', label: 'Saves', icon: 'bookmark' },
  { key: 'reposts', label: 'Reposts', icon: 'repeat' },
];
export const ENGAGEMENT_FIELDS = ['interactions', 'interactionsFollowerPercent', 'engagementRatePercent', ...ENGAGEMENT_TILES.map((t) => t.key)];

function EngagementBlock({ block, data }) {
  const m = data.metrics || {};
  const total = numOrNull(m.interactions);
  const fromFollowers = numOrNull(m.interactionsFollowerPercent);
  const rate = numOrNull(m.engagementRatePercent);
  const tiles = ENGAGEMENT_TILES.map((t) => ({ ...t, value: numOrNull(m[t.key]) })).filter((t) => t.value != null);
  const stats = [];
  if (total != null || fromFollowers != null) {
    stats.push({ label: 'Total Interactions', value: total == null ? '—' : total.toLocaleString(), sub: fromFollowers != null ? `${fromFollowers}% from followers` : '' });
  }
  if (rate != null) stats.push({ label: 'Engagement Rate', value: `${rate}%`, sub: '' });
  if (!stats.length && !tiles.length) return null;
  return (
    <Card>
      <Heading icon={block.icon || 'heart'}>{block.title}</Heading>
      {stats.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 44px', marginBottom: tiles.length ? 20 : 0 }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className="metric-value" style={{ fontSize: 30, fontWeight: 750, color: 'var(--text)', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              {s.sub ? <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-faint)', marginTop: 6 }}>{s.sub}</div> : null}
            </div>
          ))}
        </div>
      )}
      {tiles.length > 0 && (
        <div className="engagement-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length}, 1fr)`, gap: 12 }}>
          {tiles.map((t) => (
            <div key={t.key} style={{ minWidth: 0, textAlign: 'center', padding: '16px 8px', borderRadius: 'calc(var(--r-card) * .6)', background: 'var(--inset-bg)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--accent-solid)', marginBottom: 8 }}>
                <Icon name={t.icon} className="ic-18" />
              </div>
              <div className="engagement-num" style={{ fontSize: 24, fontWeight: 750, color: 'var(--text)' }}>{t.value.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{t.label}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------- RANKED LIST (locations / age) ----------
function RankedRows({ items, labelKey }) {
  const max = Math.max(...items.map((i) => i.percentage)) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <span style={{ fontSize: 14.5, color: 'var(--text)' }}>{it[labelKey]}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 110, height: 8, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: GRAD, width: (it.percentage / max) * 100 + '%' }} />
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text)', width: 46, textAlign: 'right' }}>{it.percentage}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedBlock({ block, data, field, labelKey, icon }) {
  const items = data.metrics?.[field];
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <Card>
      <Heading icon={block.icon || icon}>{block.title}</Heading>
      <RankedRows items={items} labelKey={labelKey} />
    </Card>
  );
}

// Cities and countries are separate boxes in the editor. This used to pick one,
// silently dropping countries whenever cities were also filled in.
function LocationsBlock({ block, data }) {
  const lists = [['Cities', data.metrics?.topCities], ['Countries', data.metrics?.topCountries]]
    .filter(([, items]) => Array.isArray(items) && items.length > 0);
  if (!lists.length) return null;
  return (
    <Card>
      <Heading icon={block.icon || 'pin'}>{block.title}</Heading>
      {lists.map(([label, items], i) => (
        <div key={label} style={{ marginTop: i ? 22 : 0 }}>
          {lists.length > 1 && (
            <div style={{ fontSize: 12, fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 }}>{label}</div>
          )}
          <RankedRows items={items} labelKey="name" />
        </div>
      ))}
    </Card>
  );
}

// ---------- GENDER ----------
function GenderBlock({ block, data }) {
  const g = data.metrics?.gender;
  // A split needs BOTH halves. `if (!g)` let {} / {women: 100} / {men: null}
  // through, which rendered a bare "Men %" and a zero-width bar on live reports.
  const men = numOrNull(g && g.men);
  const women = numOrNull(g && g.women);
  if (men == null || women == null) return null;
  return (
    <Card>
      <Heading icon={block.icon || 'activity'}>{block.title}</Heading>
      <div style={{ display: 'flex', gap: 22 }}>
        {[{ k: 'Men', v: men }, { k: 'Women', v: women }].map((x) => (
          <div key={x.k} style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)' }}>{x.k}</span>
              <span style={{ fontWeight: 650, color: 'var(--text)' }}>{x.v}%</span>
            </div>
            <div style={{ width: '100%', height: 14, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 999, background: GRAD, width: x.v + '%' }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- TOP CONTENT ----------
// Real reports show the posts the team adds under "Social media post previews"
// (report.postLinks). metrics.topContent is only the builder's sample data —
// extraction never produces it — so reading it alone dropped this section from
// every real report once they all moved onto the template canvas.
function TopContentBlock({ block, data }) {
  const links = data.postLinks;
  if (Array.isArray(links) && links.length) {
    return (
      <Card className="rep-card-flow">
        <Heading icon={block.icon || 'sparkles'}>{block.title}</Heading>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 326px), 1fr))', gap: 18 }}>
          {links.map((link, i) => {
            const embedUrl = getInstagramEmbedUrl(link.url);
            // The link itself goes under the embed, so it's on the report — and on
            // the PDF, where the embed's own "View on Instagram" can't be clicked.
            const postUrl = getInstagramPostUrl(link.url);
            return (
              <div key={i} className="post-item" style={{ minWidth: 0, containerType: 'inline-size' }}>
                {embedUrl ? (
                  // Instagram's embed is roughly a 4:5 image plus header and action rows.
                  <iframe
                    className="post-embed"
                    src={embedUrl}
                    title={link.label || `Instagram post ${i + 1}`}
                    allow="encrypted-media"
                    onLoad={(e) => { e.currentTarget.dataset.loaded = '1'; }}
                    style={{ display: 'block', width: '100%', height: 'calc(125cqw + 220px)', border: 0, borderRadius: 'calc(var(--r-card) * .55)', background: 'var(--inset-bg)' }}
                  />
                ) : (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 'calc(var(--r-card) * .55)', background: 'var(--inset-bg)', color: 'var(--text)', textDecoration: 'none' }}>
                    <Icon name="link" className="ic-18" />
                    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {link.label && <span style={{ fontSize: 14, fontWeight: 650 }}>{link.label}</span>}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5, color: 'var(--text-muted)' }}>{link.url}</span>
                    </span>
                  </a>
                )}
                {link.label && embedUrl && <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--text)', marginTop: 12 }}>{link.label}</div>}
                {postUrl && (
                  <a href={postUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, marginTop: link.label ? 4 : 12, fontSize: 13, fontWeight: 600, color: 'var(--accent-solid)', textDecoration: 'none' }}>
                    <Icon name="instagram" className="ic-14" />
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{postUrl.replace(/^https:\/\/www\./, '').replace(/\/$/, '')}</span>
                  </a>
                )}
                {link.comment && <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-muted)', margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{link.comment}</p>}
              </div>
            );
          })}
        </div>
      </Card>
    );
  }
  const items = data.metrics?.topContent;
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <Card>
      <Heading icon={block.icon || 'sparkles'}>{block.title}</Heading>
      <div style={{ display: 'flex', gap: 14 }}>
        {items.map((c, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div className="ph-slot" style={{ aspectRatio: '1/1', borderRadius: 'calc(var(--r-card) * .55)', display: 'grid', placeItems: 'center', color: 'var(--text-faint)', marginBottom: 10 }}>
              <Icon name={c.icon || 'image'} className="ic-28" style={{ opacity: .55 }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 750, color: 'var(--text)' }}>{c.views}</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{c.date}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- GROWTH ----------
// Net change for the Follower Growth block. Instagram's newest layout only shows
// follows/unfollows while the "Net followers" card is selected, so extraction
// often returns that net number as followerChange alone — the same figure
// growth.overall holds (see getFollowerChange). Reading growth alone hid this
// section on reports that had the number.
export function growthOverall(metrics) {
  return numOrNull(metrics?.growth?.overall) ?? numOrNull(metrics?.followerChange);
}

function GrowthBlock({ block, data }) {
  const gr = data.metrics?.growth || {};
  // `?? 0` used to turn missing values into a confident-looking "+0 Net Change"
  // sitting next to "430 New Follows". Missing reads as "—"; all-missing hides.
  const overall = growthOverall(data.metrics);
  const follows = numOrNull(gr.follows);
  const unfollows = numOrNull(gr.unfollows);
  if (overall == null && follows == null && unfollows == null) return null;
  const up = (overall ?? 0) >= 0;
  return (
    <Card>
      <Heading icon={block.icon || 'trendUp'}>{block.title}</Heading>
      <div className="growth-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 'calc(var(--r-card) * .6)', background: 'var(--inset-bg)' }}>
          <div className="growth-num" style={{ fontSize: 30, fontWeight: 750, color: overall == null ? 'var(--text-faint)' : up ? '#16a34a' : '#ef4444' }}>{overall == null ? '—' : `${up ? '+' : ''}${overall}`}</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>Net Change</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 'calc(var(--r-card) * .6)', background: 'rgba(22,163,74,.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, minWidth: 0, color: '#16a34a' }}>
            <Icon name="userPlus" className="ic-18" /><span className="growth-num" style={{ fontSize: 28, fontWeight: 750 }}>{follows == null ? '—' : follows.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>New Follows</div>
        </div>
        <div style={{ textAlign: 'center', padding: 16, borderRadius: 'calc(var(--r-card) * .6)', background: 'rgba(239,68,68,.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, minWidth: 0, color: '#ef4444' }}>
            <Icon name="userMinus" className="ic-18" /><span className="growth-num" style={{ fontSize: 28, fontWeight: 750 }}>{unfollows == null ? '—' : unfollows.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>Unfollows</div>
        </div>
      </div>
    </Card>
  );
}

// ---------- ACTIVE TIMES ----------
function ActiveTimesBlock({ block, data }) {
  const items = data.metrics?.activeTimes;
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <Card>
      <Heading icon={block.icon || 'clock'}>{block.title}</Heading>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, height: 132 }}>
        {items.map((t, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', maxWidth: 46, height: t.activity + '%', borderRadius: '8px 8px 0 0', background: GRAD, transition: 'height .5s cubic-bezier(.2,.8,.2,1)' }} />
            <span style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 8 }}>{t.hour}</span>
          </div>
        ))}
      </div>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-faint)', margin: '16px 0 0' }}>Peak activity hours: 9am – 3pm</p>
    </Card>
  );
}

// ---------- SCREENSHOTS ----------
function ScreenshotsBlock({ block }) {
  return (
    <Card>
      <Heading icon={block.icon || 'image'}>{block.title}</Heading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="ph-slot" style={{ aspectRatio: '4/5', borderRadius: 'calc(var(--r-card) * .5)', display: 'grid', placeItems: 'center', color: 'var(--text-faint)' }}>
            <div style={{ textAlign: 'center' }}>
              <Icon name="image" className="ic-28" style={{ opacity: .5 }} />
              <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, marginTop: 8, letterSpacing: '.02em' }}>insights {i + 1}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- COMPARISON ----------
// Growth or decline against the report picked under "Compare to another report".
// Views and reposts differ by orders of magnitude, so each metric is indexed to
// the other report as a % change on one shared diverging axis: growth runs right
// in --cmp-up, decline left in --cmp-down. The arrow and signed % say the same
// thing without colour, and every row prints both numbers (the table view).
const CMP_COLS = 'minmax(0, 1.1fr) minmax(0, 1.3fr) minmax(0, 2fr) 84px';

function fmtSignedPct(p) {
  const v = Math.abs(p) >= 100 ? String(Math.round(p)) : p.toFixed(1);
  return `${p > 0 ? '+' : ''}${v}%`;
}

function ComparisonBlock({ block, data }) {
  const [active, setActive] = React.useState(null);
  const cmp = data.comparison;
  const rows = comparisonRows(data.metrics, cmp && cmp.metrics);
  if (!rows.length) return null;
  // Longest bar = largest change, never less than ±10% so small moves stay small.
  const scale = Math.max(10, ...rows.map((r) => Math.abs(r.pct ?? 0)));
  return (
    <Card>
      <Heading icon={block.icon || 'trendUp'}>{block.title}</Heading>
      <p style={{ margin: '-8px 0 16px', fontSize: 13.5, color: 'var(--text-muted)' }}>Compared with {cmp.label}</p>
      <div className="cmp-head" style={{ display: 'grid', gridTemplateColumns: CMP_COLS, gap: 14, paddingBottom: 8, borderBottom: '1px solid var(--track)', fontSize: 11.5, fontWeight: 650, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
        <span>Metric</span>
        <span>{cmp.label} → This report</span>
        <span />
        <span style={{ textAlign: 'right' }}>Change</span>
      </div>
      {rows.map((r) => {
        const dir = r.diff > 0 ? 'up' : r.diff < 0 ? 'down' : 'flat';
        const width = r.pct == null ? 0 : Math.min(50, (Math.abs(r.pct) / scale) * 50);
        const diffText = `${r.diff > 0 ? '+' : ''}${r.diff.toLocaleString()}`;
        return (
          <div
            key={r.key}
            className="cmp-row"
            tabIndex={0}
            onMouseEnter={() => setActive(r.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(r.key)}
            onBlur={() => setActive(null)}
            style={{ position: 'relative', display: 'grid', gridTemplateColumns: CMP_COLS, gridTemplateAreas: '"label values bar change"', alignItems: 'center', gap: 14, padding: '8px 6px', margin: '0 -6px', borderBottom: '1px solid var(--track)', borderRadius: 8, outline: 'none', background: active === r.key ? 'var(--inset-bg)' : 'transparent' }}
          >
            <span style={{ gridArea: 'label', fontSize: 14, color: 'var(--text)' }}>{r.label}</span>
            <span style={{ gridArea: 'values', fontSize: 13.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {r.prev.toLocaleString()} → <span style={{ fontWeight: 650, color: 'var(--text)' }}>{r.curr.toLocaleString()}</span>
            </span>
            <span aria-hidden="true" style={{ gridArea: 'bar', position: 'relative', height: 24 }}>
              <span style={{ position: 'absolute', left: '50%', top: 2, bottom: 2, width: 1, background: 'var(--text-faint)', opacity: 0.45 }} />
              {width > 0 && (
                <span style={{ position: 'absolute', top: 7, height: 10, width: `${width}%`, [dir === 'up' ? 'left' : 'right']: '50%', background: dir === 'up' ? 'var(--cmp-up)' : 'var(--cmp-down)', borderRadius: dir === 'up' ? '0 4px 4px 0' : '4px 0 0 4px' }} />
              )}
            </span>
            <span style={{ gridArea: 'change', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, fontSize: 13.5, fontWeight: 650, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {dir !== 'flat' && <Icon name={dir === 'up' ? 'trendUp' : 'trendDown'} className="ic-14" />}
              {dir === 'flat' ? 'No change' : r.pct == null ? diffText : fmtSignedPct(r.pct)}
            </span>
            {active === r.key && (
              <div className="no-print" role="tooltip" style={{ position: 'absolute', right: 0, bottom: 'calc(100% + 4px)', zIndex: 3, padding: '8px 11px', borderRadius: 10, background: 'var(--card-bg)', boxShadow: '0 10px 28px -10px rgba(0,0,0,.35)', border: '1px solid var(--track)', fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                <strong style={{ fontSize: 14, color: 'var(--text)' }}>{diffText}</strong>
                {r.pct != null && dir !== 'flat' ? ` (${fmtSignedPct(r.pct)})` : ''}
                <div style={{ marginTop: 2 }}>{r.label}: {cmp.label} {r.prev.toLocaleString()} → this report {r.curr.toLocaleString()}</div>
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

// ---------- emptiness ----------
/**
 * Does this block have anything to draw for this report?
 *
 * Every block component already bails to `null` when its data is missing, but
 * the canvas still wrapped each one in a grid item — so an empty block ate a
 * column and pushed its neighbour onto its own row (Top Locations and Audience
 * Gender stacked instead of pairing up). The canvas filters on this instead.
 *
 * Keep these conditions in step with the components' own `return null` guards.
 */
export function blockHasContent(block, data) {
  const list = (field) => {
    const items = data?.metrics?.[field];
    return Array.isArray(items) && items.length > 0;
  };
  switch (block.type) {
    case 'hero': return true;
    case 'screenshots': return true;
    case 'metrics': return Boolean(block.metrics && block.metrics.length);
    case 'highlights': return Boolean(block.body);
    case 'viewsByContent': return list('contentBreakdown');
    case 'interactionsByContent': return list('interactionsByContent');
    case 'locations': return list('topCities') || list('topCountries');
    case 'age': return list('ageRanges');
    case 'gender': {
      const g = data?.metrics?.gender;
      return numOrNull(g && g.men) != null && numOrNull(g && g.women) != null;
    }
    case 'topContent': return list('topContent') || (Array.isArray(data?.postLinks) && data.postLinks.length > 0);
    case 'growth': {
      const gr = data?.metrics?.growth || {};
      return growthOverall(data?.metrics) != null || numOrNull(gr.follows) != null || numOrNull(gr.unfollows) != null;
    }
    case 'activeTimes': return list('activeTimes');
    case 'engagement': return ENGAGEMENT_FIELDS.some((k) => numOrNull(data?.metrics?.[k]) != null);
    case 'comparison': return comparisonRows(data?.metrics, data?.comparison?.metrics).length > 0;
    default: return false;
  }
}

// ---------- dispatcher ----------
export function RenderBlock({ block, data, client, logo }) {
  switch (block.type) {
    case 'hero': return <HeroBlock block={block} client={client} logo={logo} />;
    case 'metrics': return <MetricsBlock block={block} data={data} />;
    case 'engagement': return <EngagementBlock block={block} data={data} />;
    case 'comparison': return <ComparisonBlock block={block} data={data} />;
    case 'highlights': return <HighlightsBlock block={block} />;
    case 'viewsByContent': return <ContentBarsBlock block={block} data={data} field="contentBreakdown" icon="bar" />;
    case 'interactionsByContent': return <ContentBarsBlock block={block} data={data} field="interactionsByContent" icon="heart" />;
    case 'locations': return <LocationsBlock block={block} data={data} />;
    case 'age': return <RankedBlock block={block} data={data} field="ageRanges" labelKey="range" icon="users" />;
    case 'gender': return <GenderBlock block={block} data={data} />;
    case 'topContent': return <TopContentBlock block={block} data={data} />;
    case 'growth': return <GrowthBlock block={block} data={data} />;
    case 'activeTimes': return <ActiveTimesBlock block={block} data={data} />;
    case 'screenshots': return <ScreenshotsBlock block={block} />;
    default: return null;
  }
}
