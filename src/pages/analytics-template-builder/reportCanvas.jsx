// ============================================================
// Report canvas: themes + lays out enabled blocks in a 2-col grid,
// wraps each with selection/reorder chrome (toggleable for export).
// Ported from the design handoff prototype (was window.* globals).
// ============================================================
import React from 'react';
import { Icon } from './Icon';
import { RenderBlock, blockHasContent } from './reportBlocks';
import {
  THEME_PRESETS, FONT_PRESETS, RADIUS_PRESETS, SHADOW_PRESETS, SURFACE_PRESETS, BLOCK_LIBRARY,
} from './reportData';

export function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function buildThemeVars(theme) {
  const t = THEME_PRESETS.find((p) => p.key === theme.accentKey) || THEME_PRESETS[0];
  const font = (FONT_PRESETS.find((f) => f.key === theme.fontKey) || FONT_PRESETS[0]).stack;
  const radius = (RADIUS_PRESETS.find((r) => r.key === theme.radiusKey) || RADIUS_PRESETS[1]).value;
  const shadow = (SHADOW_PRESETS.find((s) => s.key === theme.shadowKey) || SHADOW_PRESETS[1]).card;
  const dark = theme.mode === 'dark';
  const surfaces = SURFACE_PRESETS;
  let s = surfaces.find((x) => x.key === theme.surfaceKey);
  if (!s) s = surfaces.find((x) => x.key === (dark ? 'dark' : 'light')) || surfaces[0];
  const isDark = s.dark;
  const heroShadow = { none: 'drop-shadow(0 1px 1px rgba(0,0,0,.10))', soft: 'drop-shadow(0 16px 26px rgba(0,0,0,.20))', strong: 'drop-shadow(0 26px 44px rgba(0,0,0,.32))' }[theme.shadowKey] || 'drop-shadow(0 16px 26px rgba(0,0,0,.20))';
  return {
    '--accent-from': t.from, '--accent-via': t.via, '--accent-to': t.to, '--accent-solid': t.solid,
    '--accent-soft': hexToRgba(t.solid, isDark ? 0.22 : 0.12),
    '--hero-shadow': heroShadow,
    '--report-bg': s.bg,
    '--card-bg': s.card,
    '--inset-bg': s.inset,
    '--text': s.text,
    '--text-muted': s.muted,
    '--text-faint': s.faint,
    '--track': s.track,
    '--r-card': radius,
    '--shadow-card': isDark ? shadow.replace(/0\.(\d+)\)/g, (m, d) => '0.' + Math.min(99, +d + 25) + ')') : shadow,
    '--font': font,
    fontFamily: font,
  };
}

function BlockChrome({ block, index, total, selected, onSelect, onMove, onHide, children }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}
      style={{
        position: 'relative',
        gridColumn: block.span === 'full' ? '1 / -1' : 'auto',
        cursor: 'pointer',
        outline: selected ? '2.5px solid var(--accent-solid)' : hover ? '2px solid var(--accent-soft)' : '2px solid transparent',
        outlineOffset: 5,
        borderRadius: 'calc(var(--r-card) + 4px)',
        transition: 'outline-color .15s',
      }}
    >
      {children}
      {(hover || selected) && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', top: -14, right: 10, display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: '#fff', boxShadow: '0 6px 20px -6px rgba(0,0,0,.3)', border: '1px solid #ececed', zIndex: 5 }}
        >
          <ChromeBtn icon="arrowUp" disabled={index === 0 || block.locked} onClick={() => onMove(block.id, -1)} title="Move up" />
          <ChromeBtn icon="arrowDown" disabled={index === total - 1 || block.locked} onClick={() => onMove(block.id, 1)} title="Move down" />
          <ChromeBtn icon="eyeOff" disabled={block.locked} onClick={() => onHide(block.id)} title="Hide section" />
        </div>
      )}
      {selected && (
        <div style={{ position: 'absolute', top: -14, left: 10, padding: '3px 10px', borderRadius: 8, background: 'var(--accent-solid)', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', zIndex: 5 }}>
          {BLOCK_LIBRARY.find((b) => b.type === block.type)?.name}
        </div>
      )}
    </div>
  );
}

function ChromeBtn({ icon, onClick, disabled, title }) {
  return (
    <button
      className="chrome-btn" title={title} disabled={disabled} onClick={onClick}
      style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: disabled ? '#cfcfd4' : '#52525b', cursor: disabled ? 'default' : 'pointer' }}
    >
      <Icon name={icon} className="ic-15" />
    </button>
  );
}

export function ReportCanvas({ template, data, selectedId, onSelect, onMove, onHide, interactive = true }) {
  const vars = buildThemeVars(template.theme);
  // In the builder every enabled block stays put so it can still be selected
  // and configured. On a real report, a block with no data renders nothing —
  // drop it entirely rather than leaving an empty grid item, which would eat a
  // column and strand its neighbour alone on a row.
  const blocks = template.blocks.filter((b) => b.enabled && (interactive || blockHasContent(b, data)));
  const surf = SURFACE_PRESETS.find((s) => s.key === (template.theme.surfaceKey || (template.theme.mode === 'dark' ? 'dark' : 'light')));
  const isDark = surf ? surf.dark : false;
  return (
    <div
      className={'report-root hov-' + (template.theme.hoverKey || 'lift')}
      style={{ ...vars, background: 'var(--report-bg)', minHeight: '100%', paddingBottom: 48 }}
      onClick={() => interactive && onSelect(null)}
    >
      <div className="report-inner" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 40px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26 }} className="report-grid">
          {blocks.map((b, i) =>
            interactive ? (
              <BlockChrome key={b.id} block={b} index={i} total={blocks.length} selected={selectedId === b.id} onSelect={onSelect} onMove={onMove} onHide={onHide}>
                <RenderBlock block={b} data={data} client={template.client} logo={template.client.logo} />
              </BlockChrome>
            ) : (
              <div key={b.id} style={{ gridColumn: b.span === 'full' ? '1 / -1' : 'auto' }}>
                <RenderBlock block={b} data={data} client={template.client} logo={template.client.logo} />
              </div>
            )
          )}
        </div>
        {/* footer */}
        <div className="report-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px 4px 24px', marginTop: 18, borderTop: '1px solid var(--track)', color: 'var(--text-faint)', fontSize: 12.5 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <img src={isDark ? '/Luxury-listings-logo-WHT.png' : '/Luxury-listings-logo-CLR.png'} alt="Luxury Listings" style={{ height: 34, width: 'auto', display: 'block' }} />
            {template.client.agency || 'Luxury Listings'} · Social Media Management
          </span>
          <span>Generated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
}
