// ============================================================
// Analytics Report Template Builder — wires state, reorder, theming,
// save/share/export. Step 2 of the analytics report flow.
// Ported from the design handoff prototype; rendered inside the
// portal layout, scoped under `.atb-root`.
// ============================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar, Library, Inspector } from './panels';
import { ReportCanvas, hexToRgba } from './reportCanvas';
import { Icon } from './Icon';
import { REPORT_DATA, BLOCK_LIBRARY, THEME_PRESETS, GOOGLE_FONTS_HREF } from './reportData';
import './builder.css';

const STORAGE_KEY = 'smm_template_v1';
const DEFAULT_OFF = ['screenshots'];

function makeInitialTemplate() {
  const blocks = BLOCK_LIBRARY.map((m) => {
    const d = JSON.parse(JSON.stringify(m.defaults || {}));
    return {
      id: 'blk_' + m.type,
      type: m.type,
      span: m.span,
      locked: !!m.locked,
      enabled: !DEFAULT_OFF.includes(m.type),
      icon: m.icon,
      ...d,
    };
  });
  return {
    name: 'January Report — Sample Client',
    client: { name: 'Sample Client', dateRange: 'January 1 – January 30, 2026', agency: 'Luxury Listings', logo: null },
    theme: { accentKey: 'instagram', surfaceKey: 'light', mode: 'light', fontKey: 'system', radiusKey: 'soft', shadowKey: 'soft', hoverKey: 'lift' },
    blocks,
  };
}

function loadTemplate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // merge in any new library blocks
      const have = new Set(saved.blocks.map((b) => b.type));
      BLOCK_LIBRARY.forEach((m) => {
        if (!have.has(m.type)) saved.blocks.push({ id: 'blk_' + m.type, type: m.type, span: m.span, locked: !!m.locked, enabled: false, icon: m.icon, ...JSON.parse(JSON.stringify(m.defaults || {})) });
      });
      // backfill icon + metric tiles on older saved blocks
      saved.blocks.forEach((b) => {
        const m = BLOCK_LIBRARY.find((x) => x.type === b.type);
        if (!b.icon) b.icon = m ? m.icon : 'square';
        if (b.type === 'metrics' && !Array.isArray(b.metrics) && m) b.metrics = JSON.parse(JSON.stringify(m.defaults.metrics));
      });
      if (!saved.theme.hoverKey) saved.theme.hoverKey = 'lift';
      return saved;
    }
  } catch (e) {}
  return makeInitialTemplate();
}

function Builder({ onBack }) {
  const [template, setTemplate] = React.useState(loadTemplate);
  const [selectedId, setSelectedId] = React.useState(null);
  const [viewport, setViewport] = React.useState('desktop');
  const [modal, setModal] = React.useState(null);
  const [savedAt, setSavedAt] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [preview, setPreview] = React.useState(false);

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(template)); } catch (e) {}
  }, [template]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  // ----- mutations -----
  const patch = (fn) => setTemplate((t) => { const n = JSON.parse(JSON.stringify(t)); fn(n); return n; });
  const setName = (v) => patch((t) => { t.name = v; });
  const setClient = (k, v) => patch((t) => { t.client[k] = v; });
  const setTheme = (k, v) => patch((t) => { t.theme[k] = v; });
  const setBlockProp = (id, k, v) => patch((t) => { const b = t.blocks.find((x) => x.id === id); if (b) b[k] = v; });
  const toggleBlock = (id) => patch((t) => { const b = t.blocks.find((x) => x.id === id); if (b && !b.locked) b.enabled = !b.enabled; });
  const hideBlock = (id) => patch((t) => { const b = t.blocks.find((x) => x.id === id); if (b && !b.locked) b.enabled = false; });

  const moveBlock = (id, dir) => patch((t) => {
    const i = t.blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= t.blocks.length) return;
    if (t.blocks[i].locked || t.blocks[j].locked) return;
    [t.blocks[i], t.blocks[j]] = [t.blocks[j], t.blocks[i]];
  });

  const reorder = (dragId, overId) => patch((t) => {
    const from = t.blocks.findIndex((b) => b.id === dragId);
    const to = t.blocks.findIndex((b) => b.id === overId);
    if (from < 0 || to < 0 || t.blocks[to].locked) return;
    const [m] = t.blocks.splice(from, 1);
    t.blocks.splice(to, 0, m);
  });

  const onSave = () => {
    setSavedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    showToast('Template saved');
  };

  // accent for builder chrome (subtle)
  const accent = THEME_PRESETS.find((p) => p.key === template.theme.accentKey) || THEME_PRESETS[0];
  const uiVars = { '--ui-accent': accent.solid, '--ui-accent-soft': hexToRgba(accent.solid, 0.12) };

  if (preview) {
    return <ClientPreview template={template} onClose={() => setPreview(false)} onExport={() => window.print()} />;
  }

  return (
    <div style={{ ...uiVars, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ececed' }}>
      <TopBar template={template} setName={setName} viewport={viewport} setViewport={setViewport}
        onSave={onSave} onShare={() => setModal('share')} onExport={() => setModal('export')} savedAt={savedAt} onBack={onBack} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Library template={template} selectedId={selectedId} onSelect={setSelectedId} onToggle={toggleBlock} onReorder={reorder} />

        {/* canvas scroll area */}
        <main className={'canvas-scroll' + (viewport === 'mobile' ? ' mobile' : '')}>
          <div className="canvas-frame" style={viewport === 'mobile' ? { width: 430 } : {}}>
            <ReportCanvas template={template} data={REPORT_DATA} selectedId={selectedId}
              onSelect={setSelectedId} onMove={moveBlock} onHide={hideBlock} interactive />
          </div>
        </main>

        <Inspector template={template} selectedId={selectedId} setBlockProp={setBlockProp} setTheme={setTheme} setClient={setClient} onToggle={toggleBlock} />
      </div>

      {modal === 'share' && <ShareModal template={template} onClose={() => setModal(null)} onOpenPreview={() => { setModal(null); setPreview(true); }} showToast={showToast} />}
      {modal === 'export' && <ExportModal onClose={() => setModal(null)} onPreview={() => { setModal(null); setPreview(true); }} />}

      {toast && (
        <div className="toast"><Icon name="check" className="ic-16" />{toast}</div>
      )}
    </div>
  );
}

/* ---------- Client preview / print view ---------- */
function ClientPreview({ template, onClose, onExport }) {
  return (
    <div className="atb-preview-overlay">
      <div className="preview-root">
        <div className="preview-bar no-print">
          <button className="tb-btn ghost" onClick={onClose}><Icon name="chevLeft" className="ic-15" />Back to builder</button>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#76767c', fontWeight: 600 }}>
            <Icon name="globe" className="ic-15" />Client preview — {template.client.name}
          </span>
          <button className="tb-btn primary" onClick={onExport}><Icon name="download" className="ic-15" />Print / Save as PDF</button>
        </div>
        <div className="print-root">
          <ReportCanvas template={template} data={REPORT_DATA} interactive={false} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Modals ---------- */
function Modal({ title, icon, children, onClose, width = 460 }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 22px 0' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--ui-accent-soft)', color: 'var(--ui-accent)' }}><Icon name={icon} className="ic-18" /></span>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1c1c20', flex: 1 }}>{title}</h3>
          <button className="eye-btn" onClick={onClose}><Icon name="x" className="ic-18" /></button>
        </div>
        <div style={{ padding: '16px 22px 22px' }}>{children}</div>
      </div>
    </div>
  );
}

function ShareModal({ template, onClose, onOpenPreview, showToast }) {
  const slug = template.client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'client';
  const link = `https://reports.luxurylistings.app/r/${slug}-${Math.random().toString(36).slice(2, 7)}`;
  const copy = () => { navigator.clipboard?.writeText(link).catch(() => {}); showToast('Link copied'); };
  return (
    <Modal title="Share with client" icon="share" onClose={onClose}>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#76767c', lineHeight: 1.6 }}>Anyone with this link can view the live report. It updates automatically when you make changes.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 42, borderRadius: 10, background: '#f4f4f6', border: '1px solid #e6e6e8', fontSize: 13, color: '#52525b', overflow: 'hidden' }}>
          <Icon name="link" className="ic-15" style={{ flexShrink: 0, color: '#a0a0a6' }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link}</span>
        </div>
        <button className="tb-btn primary" style={{ height: 42 }} onClick={copy}><Icon name="copy" className="ic-15" />Copy</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 0' }}>
        <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#52525b' }}>
          <Icon name="check" className="ic-15" style={{ color: '#16a34a' }} /> Password protection enabled
        </label>
        <button className="inline-btn sm" onClick={onOpenPreview}><Icon name="globe" className="ic-14" />Open preview</button>
      </div>
    </Modal>
  );
}

function ExportModal({ onClose, onPreview }) {
  return (
    <Modal title="Export PDF" icon="doc" onClose={onClose}>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#76767c', lineHeight: 1.6 }}>Opens a clean, full-width version of the report. Use your browser's print dialog to save it as a PDF — section styling, colors and logo are preserved.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="tb-btn ghost" style={{ flex: 1, justifyContent: 'center', height: 44 }} onClick={onClose}>Cancel</button>
        <button className="tb-btn primary" style={{ flex: 1, justifyContent: 'center', height: 44 }} onClick={onPreview}><Icon name="download" className="ic-15" />Open print view</button>
      </div>
    </Modal>
  );
}

export default function AnalyticsTemplateBuilderPage() {
  const navigate = useNavigate();

  // Load the Google Fonts used by the non-system typeface presets.
  React.useEffect(() => {
    if (document.getElementById('atb-google-fonts')) return;
    const link = document.createElement('link');
    link.id = 'atb-google-fonts';
    link.rel = 'stylesheet';
    link.href = GOOGLE_FONTS_HREF;
    document.head.appendChild(link);
  }, []);

  return (
    <div className="atb-root">
      <Builder onBack={() => navigate('/instagram-reports')} />
    </div>
  );
}
