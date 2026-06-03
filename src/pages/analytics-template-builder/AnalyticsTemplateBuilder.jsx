// ============================================================
// Analytics Report Template Builder — wires state, reorder, theming,
// save/share/export. Step 2 of the analytics report flow.
// Templates are persisted to Supabase (report_templates) and can be
// assigned as per-client defaults. Rendered inside the portal layout,
// scoped under `.atb-root`.
// ============================================================
import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TopBar, Library, Inspector } from './panels';
import { ReportCanvas, hexToRgba } from './reportCanvas';
import { Icon } from './Icon';
import { REPORT_DATA, BLOCK_LIBRARY, THEME_PRESETS, GOOGLE_FONTS_HREF } from './reportData';
import { supabaseService } from '../../services/supabaseService';
import './builder.css';

// Local crash-recovery cache for the in-progress (possibly unsaved) template.
const DRAFT_KEY = 'smm_template_draft_v2';
const DEFAULT_OFF = ['screenshots'];

const SAMPLE_CLIENT = () => ({ name: 'Sample Client', dateRange: 'January 1 – January 30, 2026', agency: 'Luxury Listings', logo: null });
const DEFAULT_THEME = { accentKey: 'instagram', surfaceKey: 'light', mode: 'light', fontKey: 'system', radiusKey: 'soft', shadowKey: 'soft', hoverKey: 'lift' };

function freshBlocks() {
  return BLOCK_LIBRARY.map((m) => {
    const d = JSON.parse(JSON.stringify(m.defaults || {}));
    return { id: 'blk_' + m.type, type: m.type, span: m.span, locked: !!m.locked, enabled: !DEFAULT_OFF.includes(m.type), icon: m.icon, ...d };
  });
}

// A brand-new, unsaved working template.
function makeInitialTemplate() {
  return { id: null, name: 'Untitled template', client: SAMPLE_CLIENT(), theme: { ...DEFAULT_THEME }, blocks: freshBlocks(), assignedClientIds: [] };
}

// Merge saved blocks with the library (backfill new sections, icons, metric tiles)
// and ensure theme defaults — keeps older saves forward-compatible.
function normalizeBlocks(savedBlocks) {
  const blocks = Array.isArray(savedBlocks) ? JSON.parse(JSON.stringify(savedBlocks)) : [];
  const have = new Set(blocks.map((b) => b.type));
  BLOCK_LIBRARY.forEach((m) => {
    if (!have.has(m.type)) blocks.push({ id: 'blk_' + m.type, type: m.type, span: m.span, locked: !!m.locked, enabled: false, icon: m.icon, ...JSON.parse(JSON.stringify(m.defaults || {})) });
  });
  blocks.forEach((b) => {
    const m = BLOCK_LIBRARY.find((x) => x.type === b.type);
    if (!b.icon) b.icon = m ? m.icon : 'square';
    if (b.type === 'metrics' && !Array.isArray(b.metrics) && m) b.metrics = JSON.parse(JSON.stringify(m.defaults.metrics));
  });
  return blocks;
}

// Supabase template row -> editable working copy (client is preview-only sample data).
function toWorking(row) {
  if (!row) return makeInitialTemplate();
  return {
    id: row.id,
    name: row.name || 'Untitled template',
    client: SAMPLE_CLIENT(),
    theme: { ...DEFAULT_THEME, ...(row.theme || {}) },
    blocks: normalizeBlocks(row.blocks),
    assignedClientIds: Array.isArray(row.assignedClientIds) ? row.assignedClientIds.map(String) : [],
  };
}

function Builder({ onBack }) {
  const [templates, setTemplates] = React.useState([]);
  const [clients, setClients] = React.useState([]);
  const [template, setTemplate] = React.useState(makeInitialTemplate);
  const [selectedId, setSelectedId] = React.useState(null);
  const [viewport, setViewport] = React.useState('desktop');
  const [modal, setModal] = React.useState(null);
  const [savedAt, setSavedAt] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [preview, setPreview] = React.useState(false);

  // Initial load: templates list + clients (for assignment). Falls back to a draft
  // or a fresh template when no saved templates exist yet.
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const [tpls, cls] = await Promise.all([
        supabaseService.getReportTemplates().catch(() => []),
        supabaseService.getClients().catch(() => []),
      ]);
      if (!alive) return;
      setTemplates(tpls || []);
      setClients(cls || []);
      if (tpls && tpls.length) {
        setTemplate(toWorking(tpls[0]));
      } else {
        try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) setTemplate(JSON.parse(raw)); } catch (e) {}
      }
    })();
    return () => { alive = false; };
  }, []);

  // Cache the working copy for crash recovery (not the source of truth).
  React.useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(template)); } catch (e) {}
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

  const setAssignedClients = (ids) => patch((t) => { t.assignedClientIds = Array.from(new Set((ids || []).map(String))); });

  // ----- persistence -----
  const refreshTemplates = async () => {
    const tpls = await supabaseService.getReportTemplates().catch(() => []);
    setTemplates(tpls || []);
    return tpls || [];
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = { name: (template.name || '').trim() || 'Untitled template', theme: template.theme, blocks: template.blocks, assignedClientIds: template.assignedClientIds || [] };
      if (template.id) {
        await supabaseService.updateReportTemplate(template.id, payload);
      } else {
        const created = await supabaseService.createReportTemplate(payload);
        if (created && created.id) setTemplate((t) => ({ ...t, id: created.id }));
      }
      await refreshTemplates();
      setSavedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      showToast('Template saved');
    } catch (e) {
      console.error('Template save failed:', e);
      showToast(e?.message ? `Save failed: ${e.message}` : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onSelectTemplate = (id) => {
    if (!id) { setTemplate(makeInitialTemplate()); setSelectedId(null); setSavedAt(null); return; }
    const row = templates.find((t) => String(t.id) === String(id));
    if (row) { setTemplate(toWorking(row)); setSelectedId(null); setSavedAt(null); }
  };

  const onNewTemplate = () => { setTemplate(makeInitialTemplate()); setSelectedId(null); setSavedAt(null); showToast('New template — Save to keep it'); };

  // accent for builder chrome (subtle)
  const accent = THEME_PRESETS.find((p) => p.key === template.theme.accentKey) || THEME_PRESETS[0];
  const uiVars = { '--ui-accent': accent.solid, '--ui-accent-soft': hexToRgba(accent.solid, 0.12) };

  return (
    <div style={{ ...uiVars, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ececed' }}>
      <TopBar template={template} setName={setName} viewport={viewport} setViewport={setViewport}
        templates={templates} onSelectTemplate={onSelectTemplate} onNewTemplate={onNewTemplate}
        saving={saving} onSave={onSave} onAssign={() => setModal('assign')}
        onExport={() => setPreview(true)} savedAt={savedAt} onBack={onBack} />
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

      {modal === 'assign' && <AssignModal template={template} clients={clients} setAssignedClients={setAssignedClients} saving={saving} onSave={onSave} onClose={() => setModal(null)} showToast={showToast} />}

      {/* Export → opens a clean print view of the report and immediately fires the PDF dialog */}
      {preview && <ClientPreview template={template} onClose={() => setPreview(false)} />}

      {toast && (
        <div className="toast"><Icon name="check" className="ic-16" />{toast}</div>
      )}
    </div>
  );
}

/* ---------- Print / export view ----------
   Portaled to <body> and isolated with the `atb-printing` body class so the
   browser print dialog captures ONLY the report (the @media print rules in
   builder.css hide the rest of the app and let the full report flow across
   pages — the on-screen overlay is position:fixed, which would otherwise clip
   to a single page). Auto-fires the PDF dialog as soon as it renders. */
function ClientPreview({ template, onClose }) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  const doPrint = () => { document.body.classList.add('atb-printing'); window.print(); };

  React.useEffect(() => {
    const after = () => { document.body.classList.remove('atb-printing'); onCloseRef.current && onCloseRef.current(); };
    window.addEventListener('afterprint', after);
    const t = setTimeout(doPrint, 400); // let fonts/layout settle, then export
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', after);
      document.body.classList.remove('atb-printing');
    };
  }, []);

  return createPortal(
    <div className="atb-root atb-print-portal">
      <div className="atb-preview-overlay">
        <div className="preview-root">
          <div className="preview-bar no-print">
            <button className="tb-btn ghost" onClick={onClose}><Icon name="chevLeft" className="ic-15" />Back to builder</button>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#76767c', fontWeight: 600 }}>
              <Icon name="globe" className="ic-15" />Print preview — {template.client.name}
            </span>
            <button className="tb-btn primary" onClick={doPrint}><Icon name="download" className="ic-15" />Print / Save as PDF</button>
          </div>
          <div className="print-root">
            <ReportCanvas template={template} data={REPORT_DATA} interactive={false} />
          </div>
        </div>
      </div>
    </div>,
    document.body
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

/* ---------- Assign template as client default ---------- */
function AssignModal({ template, clients, setAssignedClients, saving, onSave, onClose, showToast }) {
  const [query, setQuery] = React.useState('');
  const assigned = new Set((template.assignedClientIds || []).map(String));
  const clientName = (c) => c.clientName || c.name || c.client_name || 'Unnamed client';
  const list = (clients || [])
    .filter((c) => clientName(c).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => clientName(a).localeCompare(clientName(b)));

  const toggle = (id) => {
    const key = String(id);
    const next = new Set(assigned);
    if (next.has(key)) next.delete(key); else next.add(key);
    setAssignedClients(Array.from(next));
  };

  const saveAndClose = async () => {
    await onSave();
    showToast('Client defaults saved');
    onClose();
  };

  return (
    <Modal title="Default template for clients" icon="users" onClose={onClose} width={480}>
      <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#76767c', lineHeight: 1.6 }}>
        Pick the clients this template should be the <strong>default</strong> for. When you create a report for one of
        them, this template is pre-selected. Saving here also saves the template.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 40, borderRadius: 10, background: '#f4f4f6', border: '1px solid #e6e6e8', marginBottom: 10 }}>
        <Icon name="users" className="ic-15" style={{ color: '#a0a0a6', flexShrink: 0 }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients…" spellCheck={false}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, color: '#1c1c20' }} />
        {assigned.size > 0 ? <span style={{ fontSize: 12, color: '#76767c', fontWeight: 600 }}>{assigned.size} selected</span> : null}
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #ececef', borderRadius: 10 }}>
        {list.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', fontSize: 13, color: '#a0a0a6' }}>No clients found.</div>
        ) : list.map((c) => {
          const id = String(c.id);
          const on = assigned.has(id);
          return (
            <button key={id} type="button" onClick={() => toggle(id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 'none', borderBottom: '1px solid #f2f2f4', background: on ? 'var(--ui-accent-soft)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: 5, border: on ? 'none' : '1.5px solid #cfcfd4', background: on ? 'var(--ui-accent)' : 'transparent', color: '#fff', flexShrink: 0 }}>
                {on ? <Icon name="check" className="ic-14" /> : null}
              </span>
              <span style={{ fontSize: 13.5, color: '#1c1c20', fontWeight: on ? 650 : 500 }}>{clientName(c)}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="tb-btn ghost" style={{ flex: 1, justifyContent: 'center', height: 42 }} onClick={onClose}>Cancel</button>
        <button className="tb-btn primary" style={{ flex: 1, justifyContent: 'center', height: 42 }} disabled={saving} onClick={saveAndClose}>
          {saving ? 'Saving…' : 'Save defaults'}
        </button>
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
