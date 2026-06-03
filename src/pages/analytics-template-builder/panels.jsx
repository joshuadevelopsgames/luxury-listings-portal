// ============================================================
// Builder chrome: top bar, left section library, right inspector.
// Neutral pro-tool styling so the report's color pops.
// Ported from the design handoff prototype (was window.* globals).
// ============================================================
import React from 'react';
import { Icon } from './Icon';
import { heroMaskUrl } from './reportBlocks';
import {
  BLOCK_LIBRARY, THEME_PRESETS, SURFACE_PRESETS, FONT_PRESETS, RADIUS_PRESETS, SHADOW_PRESETS, HOVER_PRESETS, HERO_SHAPES,
} from './reportData';

/* ---------- small controls ---------- */
function Field({ label, children, hint }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, fontWeight: 650, color: '#8a8a90', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11.5, color: '#a8a8ae', marginTop: 5 }}>{hint}</div> : null}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className="ti" />;
}
function TextArea(props) {
  return <textarea {...props} className="ti" rows={props.rows || 4} />;
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: '#f0f0f2', borderRadius: 10 }}>
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 6px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
            background: value === o.key ? '#fff' : 'transparent', color: value === o.key ? '#18181b' : '#76767c',
            boxShadow: value === o.key ? '0 1px 3px rgba(0,0,0,.12)' : 'none' }}>
          {o.icon ? <Icon name={o.icon} className="ic-14" /> : null}{o.label}
        </button>
      ))}
    </div>
  );
}

function Group({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #efeff1' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '15px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
        <Icon name={icon} className="ic-16" style={{ color: '#8a8a90' }} />
        <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 650, color: '#28282c' }}>{title}</span>
        <Icon name={open ? 'chevUp' : 'chevDown'} className="ic-16" style={{ color: '#b0b0b6' }} />
      </button>
      {open ? <div style={{ padding: '0 18px 18px' }}>{children}</div> : null}
    </div>
  );
}

/* ============================================================
   TOP BAR
   ============================================================ */
export function TopBar({ template, setName, viewport, setViewport, templates, onSelectTemplate, onNewTemplate, saving, onSave, onAssign, onShare, onExport, savedAt, onBack }) {
  const assignedCount = (template.assignedClientIds || []).length;
  return (
    <header style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px', background: '#fff', borderBottom: '1px solid #e8e8ea', zIndex: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack ? (
          <button className="tb-btn ghost" onClick={onBack} title="Back to reports" style={{ padding: '0 10px' }}>
            <Icon name="chevLeft" className="ic-15" />
          </button>
        ) : null}
        <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#a435f0,#e1306c,#f77737)', color: '#fff' }}>
          <Icon name="layers" className="ic-18" />
        </span>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 11, color: '#a0a0a6', fontWeight: 600 }}>Report Builder</div>
        </div>
      </div>
      <div style={{ width: 1, height: 26, background: '#e8e8ea' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }} title="Click to rename this template">
        <Icon name="type" className="ic-15" style={{ color: '#a0a0a6', flexShrink: 0 }} />
        <input
          value={template.name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="name-input"
          spellCheck={false}
          placeholder="Name this template…"
          aria-label="Template name"
        />
      </div>
      <span style={{ padding: '3px 9px', borderRadius: 6, background: template.id ? '#e8f5ec' : '#f0f0f2', color: template.id ? '#1f8a5b' : '#8a8a90', fontSize: 11, fontWeight: 650 }}>{template.id ? 'SAVED' : 'DRAFT'}</span>

      {/* Open a different saved template. Always shows "Open…" (it's an action,
          not the current name — that's the editable field on the left). Hidden
          when there's nothing saved to switch to. */}
      {(templates && templates.length > 0) ? (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select value="" onChange={(e) => { if (e.target.value) onSelectTemplate(e.target.value); }} title="Open a saved template"
            style={{ height: 32, maxWidth: 200, borderRadius: 8, border: '1px solid #e2e2e6', background: '#fff', color: '#52525b', fontSize: 12.5, fontWeight: 600, padding: '0 26px 0 10px', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            <option value="">Open template…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name || 'Untitled template'}</option>)}
          </select>
          <Icon name="chevDown" className="ic-14" style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: '#a0a0a6' }} />
        </div>
      ) : null}
      <button className="tb-btn ghost" onClick={onNewTemplate} title="Start a new blank template" style={{ padding: '0 10px' }}><Icon name="plus" className="ic-15" />New</button>

      <div style={{ flex: 1 }} />

      <div style={{ marginRight: 4 }}>
        <Segmented value={viewport} onChange={setViewport} options={[{ key: 'desktop', icon: 'monitor', label: '' }, { key: 'mobile', icon: 'phone', label: '' }]} />
      </div>

      {savedAt ? <span style={{ fontSize: 12, color: '#a0a0a6', marginRight: 4 }}>Saved {savedAt}</span> : null}
      <button className="tb-btn ghost" onClick={onAssign} title="Set as the default template for clients"><Icon name="users" className="ic-15" />Clients{assignedCount ? ` · ${assignedCount}` : ''}</button>
      <button className="tb-btn ghost" onClick={onSave} disabled={saving}><Icon name="save" className="ic-15" />{saving ? 'Saving…' : 'Save template'}</button>
      <button className="tb-btn ghost" onClick={onShare}><Icon name="share" className="ic-15" />Share link</button>
      <button className="tb-btn primary" onClick={onExport}><Icon name="download" className="ic-15" />Export PDF</button>
    </header>
  );
}

/* ============================================================
   LEFT LIBRARY
   ============================================================ */
export function Library({ template, selectedId, onSelect, onToggle, onReorder }) {
  const [dragId, setDragId] = React.useState(null);
  const [overId, setOverId] = React.useState(null);
  const shown = template.blocks.filter((b) => b.enabled).length;

  return (
    <aside style={{ width: 296, flexShrink: 0, background: '#fff', borderRight: '1px solid #e8e8ea', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#28282c' }}>Sections</h2>
          <span style={{ fontSize: 12, color: '#a0a0a6' }}>{shown} of {template.blocks.length} shown</span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#a0a0a6', lineHeight: 1.5 }}>Toggle to include · drag to reorder</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 18px' }}>
        {template.blocks.map((b, i) => {
          const meta = BLOCK_LIBRARY.find((m) => m.type === b.type);
          const isOver = overId === b.id && dragId !== b.id;
          return (
            <div
              key={b.id}
              draggable={!b.locked}
              onDragStart={() => setDragId(b.id)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onDragOver={(e) => { e.preventDefault(); setOverId(b.id); }}
              onDrop={(e) => { e.preventDefault(); if (dragId) onReorder(dragId, b.id); setDragId(null); setOverId(null); }}
              onClick={() => onSelect(b.id)}
              className={'lib-row' + (selectedId === b.id ? ' sel' : '') + (b.enabled ? '' : ' off')}
              style={{ borderTop: isOver ? '2px solid var(--ui-accent,#e1306c)' : '2px solid transparent', opacity: dragId === b.id ? 0.4 : 1 }}
            >
              <span className="grip" style={{ cursor: b.locked ? 'default' : 'grab', color: '#c8c8ce' }}>
                <Icon name={b.locked ? 'pin' : 'grip'} className="ic-16" />
              </span>
              <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: b.enabled ? 'var(--ui-accent-soft,#fce4ee)' : '#f2f2f4', color: b.enabled ? 'var(--ui-accent,#e1306c)' : '#b0b0b6' }}>
                <Icon name={b.icon || meta?.icon || 'square'} className="ic-16" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: b.enabled ? '#28282c' : '#a0a0a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta?.name}</div>
                <div style={{ fontSize: 11, color: '#a8a8ae', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta?.desc}</div>
              </span>
              {b.locked ? (
                <span style={{ fontSize: 10, color: '#c0c0c6', fontWeight: 600, paddingRight: 4 }}>REQ</span>
              ) : (
                <button className="eye-btn" onClick={(e) => { e.stopPropagation(); onToggle(b.id); }} title={b.enabled ? 'Hide' : 'Show'}>
                  <Icon name={b.enabled ? 'eye' : 'eyeOff'} className="ic-16" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/* ============================================================
   RIGHT INSPECTOR
   ============================================================ */
export function Inspector({ template, selectedId, setBlockProp, setTheme, setClient, onToggle }) {
  const block = template.blocks.find((b) => b.id === selectedId);
  const meta = block && BLOCK_LIBRARY.find((m) => m.type === block.type);
  const th = template.theme;

  return (
    <aside style={{ width: 312, flexShrink: 0, background: '#fff', borderLeft: '1px solid #e8e8ea', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Selected section context */}
      {block ? (
        <Group title={meta.name} icon="settings" defaultOpen>
          <Field label="Section title">
            <TextInput value={block.title || ''} onChange={(e) => setBlockProp(block.id, 'title', e.target.value)} placeholder="Section heading" />
          </Field>
          <Field label="Section icon" hint="Shown beside the section title (and in the hero badge when no logo is set).">
            <IconPicker value={block.icon} onChange={(name) => setBlockProp(block.id, 'icon', name)} />
          </Field>
          {block.type === 'hero' && (
            <Field label="Banner shape" hint="The bottom edge of the hero banner.">
              <BannerShapePicker value={block.shape || 'swoop'} accentKey={th.accentKey} onChange={(k) => setBlockProp(block.id, 'shape', k)} />
            </Field>
          )}
          {block.type === 'metrics' && (
            <Field label="Metric tiles" hint="Customize each tile's icon, label, value & trend.">
              <MetricsEditor block={block} onChange={(arr) => setBlockProp(block.id, 'metrics', arr)} />
            </Field>
          )}
          {block.type === 'highlights' && (
            <Field label="Body copy" hint="Your written takeaways for the client.">
              <TextArea value={block.body || ''} onChange={(e) => setBlockProp(block.id, 'body', e.target.value)} rows={6} />
            </Field>
          )}
          {!block.locked && (
            <button className="inline-btn" onClick={() => onToggle(block.id)}>
              <Icon name={block.enabled ? 'eyeOff' : 'eye'} className="ic-15" />{block.enabled ? 'Hide this section' : 'Show this section'}
            </button>
          )}
        </Group>
      ) : (
        <div style={{ padding: '18px', borderBottom: '1px solid #efeff1', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="pointer" className="ic-16" style={{ color: '#b0b0b6', marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: '#9a9aa0', lineHeight: 1.5 }}>Select a section in the preview to edit its title & copy. Global styling lives below.</p>
        </div>
      )}

      {/* Branding */}
      <Group title="Client & Branding" icon="user">
        <Field label="Report title (hero)">
          <TextInput value={template.blocks.find((b) => b.type === 'hero')?.title || ''} onChange={(e) => setBlockProp(template.blocks.find((b) => b.type === 'hero').id, 'title', e.target.value)} />
        </Field>
        <Field label="Client name">
          <TextInput value={template.client.name} onChange={(e) => setClient('name', e.target.value)} />
        </Field>
        <Field label="Date range">
          <TextInput value={template.client.dateRange} onChange={(e) => setClient('dateRange', e.target.value)} />
        </Field>
        <Field label="Agency (footer)">
          <TextInput value={template.client.agency} onChange={(e) => setClient('agency', e.target.value)} />
        </Field>
        <Field label="Client logo" hint="Shown in the hero. PNG/SVG with transparency works best.">
          <LogoUpload logo={template.client.logo} onSet={(v) => setClient('logo', v)} />
        </Field>
      </Group>

      {/* Accent */}
      <Group title="Accent & Theme" icon="palette">
        <Field label="Accent">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {THEME_PRESETS.map((p) => (
              <button key={p.key} onClick={() => setTheme('accentKey', p.key)}
                className={'swatch' + (th.accentKey === p.key ? ' sel' : '')}>
                <span style={{ width: 22, height: 22, borderRadius: 7, background: `linear-gradient(135deg,${p.from},${p.via},${p.to})`, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
              </button>
            ))}
          </div>
        </Field>
      </Group>

      {/* Appearance */}
      <Group title="Appearance" icon="type">
        <Field label="Background">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {SURFACE_PRESETS.map((s) => {
              const cur = th.surfaceKey || (th.mode === 'dark' ? 'dark' : 'light');
              return (
                <button key={s.key} onClick={() => setTheme('surfaceKey', s.key)} className={'swatch' + (cur === s.key ? ' sel' : '')}>
                  <span style={{ position: 'relative', width: 22, height: 22, borderRadius: 7, background: s.bg, flexShrink: 0, border: '1px solid rgba(0,0,0,.1)' }}>
                    <span style={{ position: 'absolute', right: 3, bottom: 3, width: 11, height: 11, borderRadius: 3, background: s.card, boxShadow: '0 0 0 1px rgba(0,0,0,.08)' }} />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</span>
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Typeface">
          <select className="ti" value={th.fontKey} onChange={(e) => setTheme('fontKey', e.target.value)}>
            {FONT_PRESETS.map((f) => <option key={f.key} value={f.key}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="Corner radius">
          <Segmented value={th.radiusKey} onChange={(v) => setTheme('radiusKey', v)} options={RADIUS_PRESETS.map((r) => ({ key: r.key, label: r.name }))} />
        </Field>
        <Field label="Card shadow">
          <Segmented value={th.shadowKey} onChange={(v) => setTheme('shadowKey', v)} options={SHADOW_PRESETS.map((s) => ({ key: s.key, label: s.name }))} />
        </Field>
        <Field label="Card hover" hint="Animation when a client hovers a card.">
          <Segmented value={th.hoverKey || 'lift'} onChange={(v) => setTheme('hoverKey', v)} options={HOVER_PRESETS.map((h) => ({ key: h.key, label: h.name }))} />
        </Field>
      </Group>
    </aside>
  );
}

const PICKER_ICONS = ['bar', 'heart', 'pin', 'users', 'activity', 'sparkles', 'trendUp', 'trendDown', 'clock', 'image', 'message', 'zap', 'eye', 'pointer', 'globe', 'calendar', 'instagram', 'user', 'monitor', 'layers', 'userPlus', 'userMinus', 'doc', 'link'];

function IconPicker({ value, onChange }) {
  return (
    <div className="icon-grid">
      {PICKER_ICONS.map((name) => (
        <button key={name} onClick={() => onChange(name)} title={name}
          className={'icon-cell' + (value === name ? ' sel' : '')}>
          <Icon name={name} className="ic-16" />
        </button>
      ))}
    </div>
  );
}

function BannerShapePicker({ value, accentKey, onChange }) {
  const ap = THEME_PRESETS.find((p) => p.key === accentKey) || THEME_PRESETS[0];
  const grad = `linear-gradient(135deg,${ap.from},${ap.via},${ap.to})`;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      {HERO_SHAPES.map((s) => {
        const maskStyle = s.cut ? { WebkitMaskImage: heroMaskUrl(s.cut), maskImage: heroMaskUrl(s.cut), WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' } : {};
        return (
          <button key={s.key} onClick={() => onChange(s.key)} className={'shape-cell' + (value === s.key ? ' sel' : '')}>
            <div style={{ width: '100%', height: 34, borderRadius: 7, background: grad, ...maskStyle }} />
            <span style={{ fontSize: 11, fontWeight: 600, marginTop: 5, display: 'block' }}>{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function MetricTileEditor({ tile, index, onUpdate, onRemove, canRemove }) {
  const [showIcons, setShowIcons] = React.useState(false);
  return (
    <div className="tile-edit">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="icon-cell" style={{ width: 34, height: 34, flexShrink: 0 }} onClick={() => setShowIcons((s) => !s)} title="Change icon">
          <Icon name={tile.icon} className="ic-16" />
        </button>
        <input className="ti" style={{ flex: 1 }} value={tile.label} onChange={(e) => onUpdate(index, 'label', e.target.value)} placeholder="Label" />
        <button className="eye-btn" onClick={() => onRemove(index)} disabled={!canRemove} style={{ opacity: canRemove ? 1 : .35 }} title="Remove tile">
          <Icon name="trash" className="ic-15" />
        </button>
      </div>
      {showIcons && <div style={{ marginTop: 8 }}><IconPicker value={tile.icon} onChange={(n) => { onUpdate(index, 'icon', n); setShowIcons(false); }} /></div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input className="ti" style={{ flex: 1 }} value={tile.value} onChange={(e) => onUpdate(index, 'value', e.target.value)} placeholder="Value" />
        <input className="ti" style={{ flex: 1.4 }} value={tile.sub || ''} onChange={(e) => onUpdate(index, 'sub', e.target.value)} placeholder="Sub text (optional)" />
      </div>
      <div style={{ marginTop: 8 }}>
        <Segmented value={tile.trend || 'none'} onChange={(v) => onUpdate(index, 'trend', v)}
          options={[{ key: 'up', icon: 'trendUp', label: 'Up' }, { key: 'none', label: 'Neutral' }, { key: 'down', icon: 'trendDown', label: 'Down' }]} />
      </div>
    </div>
  );
}

function MetricsEditor({ block, onChange }) {
  const tiles = block.metrics || [];
  const update = (i, k, v) => onChange(tiles.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));
  const remove = (i) => onChange(tiles.filter((_, idx) => idx !== i));
  const add = () => onChange([...tiles, { icon: 'zap', label: 'New metric', value: '0', sub: '', trend: 'none' }]);
  return (
    <div>
      {tiles.map((t, i) => (
        <MetricTileEditor key={i} tile={t} index={i} onUpdate={update} onRemove={remove} canRemove={tiles.length > 1} />
      ))}
      <button className="inline-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={add} disabled={tiles.length >= 8}>
        <Icon name="plus" className="ic-15" />Add metric tile
      </button>
    </div>
  );
}

function LogoUpload({ logo, onSet }) {
  const ref = React.useRef();
  const onFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onSet(r.result);
    r.readAsDataURL(f);
  };
  return (
    <div>
      <input ref={ref} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
      {logo ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 56, height: 40, borderRadius: 8, background: '#2a2a2e', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
            <img src={logo} alt="logo" style={{ maxWidth: '88%', maxHeight: '80%', objectFit: 'contain' }} />
          </div>
          <button className="inline-btn sm" onClick={() => ref.current.click()}>Replace</button>
          <button className="inline-btn sm danger" onClick={() => onSet(null)}><Icon name="trash" className="ic-14" /></button>
        </div>
      ) : (
        <button className="upload-zone" onClick={() => ref.current.click()}>
          <Icon name="upload" className="ic-18" /><span>Upload logo</span>
        </button>
      )}
    </div>
  );
}
