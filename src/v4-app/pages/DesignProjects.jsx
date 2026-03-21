import { useEffect, useState } from 'react';
import { Plus, ChevronDown, Paperclip, Clock, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';

const STATUS_CONFIG = {
  not_started:   { label: 'Not Started',   color: 'bg-gray-100 text-gray-500',   icon: <Circle size={13} /> },
  in_progress:   { label: 'In Progress',   color: 'bg-blue-100 text-blue-600',   icon: <Clock size={13} /> },
  in_review:     { label: 'In Review',     color: 'bg-yellow-100 text-yellow-700', icon: <AlertCircle size={13} /> },
  approved:      { label: 'Approved',      color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={13} /> },
  revision:      { label: 'Needs Revision', color: 'bg-red-100 text-red-600',    icon: <AlertCircle size={13} /> },
};

const STATUSES = Object.keys(STATUS_CONFIG);

const PRIORITY_COLOR = {
  low:    'text-gray-400',
  medium: 'text-yellow-500',
  high:   'text-red-500',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ProjectModal({ project, clients, onClose, onSave }) {
  const { user } = useAuth();
  const isEdit = !!project?.id;
  const [form, setForm] = useState({
    title: project?.title ?? '',
    client_id: project?.client_id ?? '',
    status: project?.status ?? 'not_started',
    priority: project?.priority ?? 'medium',
    due_date: project?.due_date ?? '',
    notes: project?.notes ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        client_id: form.client_id || null,
        due_date: form.due_date || null,
        assigned_to: user?.id,
      };
      let result;
      if (isEdit) {
        const { data, error: err } = await supabase
          .from('graphic_projects')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', project.id)
          .select('*, client:clients(id, name)')
          .single();
        if (err) throw err;
        result = data;
      } else {
        const { data, error: err } = await supabase
          .from('graphic_projects')
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select('*, client:clients(id, name)')
          .single();
        if (err) throw err;
        result = data;
      }
      onSave(result);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-[18px] font-bold text-[#1d1d1f] mb-5">{isEdit ? 'Edit Project' : 'New Design Project'}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#86868b] mb-1">Project Title *</label>
            <input
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Q2 Campaign Social Pack"
              className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">Client</label>
              <div className="relative">
                <select
                  value={form.client_id}
                  onChange={e => set('client_id', e.target.value)}
                  className="w-full appearance-none border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] bg-white pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— No client —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-3 text-[#86868b] pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">Status</label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className="w-full appearance-none border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] bg-white pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-3 text-[#86868b] pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">Priority</label>
              <div className="relative">
                <select
                  value={form.priority}
                  onChange={e => set('priority', e.target.value)}
                  className="w-full appearance-none border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] bg-white pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-3 text-[#86868b] pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#86868b] mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Brief, revisions needed, deliverables…"
              className="w-full border border-[#d2d2d7] rounded-lg px-3 py-2 text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-[#d2d2d7] text-[14px] font-medium hover:bg-[#f5f5f7]">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-lg bg-[#0071e3] text-white text-[14px] font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function KanbanColumn({ status, projects, onEdit }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="flex flex-col gap-3 min-w-[220px] w-[220px]">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>
        <span className="text-[11px] text-[#86868b]">({projects.length})</span>
      </div>
      <div className="flex flex-col gap-2">
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => onEdit(p)}
            className="text-left bg-white border border-[#e5e5ea] rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-[#d2d2d7] transition-all"
          >
            <p className="text-[13px] font-semibold text-[#1d1d1f] leading-snug">{p.title}</p>
            {p.client?.name && (
              <p className="text-[11px] text-[#86868b] mt-1">{p.client.name}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className={`text-[11px] font-medium uppercase ${PRIORITY_COLOR[p.priority] ?? PRIORITY_COLOR.medium}`}>
                {p.priority}
              </span>
              {p.due_date && (
                <span className="flex items-center gap-1 text-[11px] text-[#aeaeb2]">
                  <Clock size={10} />
                  {format(parseISO(p.due_date), 'MMM d')}
                </span>
              )}
            </div>
          </button>
        ))}
        {projects.length === 0 && (
          <div className="border-2 border-dashed border-[#e5e5ea] rounded-xl p-4 text-center text-[12px] text-[#aeaeb2]">
            No projects
          </div>
        )}
      </div>
    </div>
  );
}

export default function DesignProjects() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | project object

  const load = async () => {
    const [{ data: proj }, { data: cl }] = await Promise.all([
      supabase
        .from('graphic_projects')
        .select('*, client:clients(id, name)')
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
    ]);
    setProjects(proj ?? []);
    setClients(cl ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = (saved) => {
    setProjects(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const projectsByStatus = (status) => projects.filter(p => (p.status ?? 'not_started') === status);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1d1d1f]">Design Projects</h1>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-[#0071e3] text-white px-4 py-2 rounded-xl text-[13px] font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} /> New Project
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => {
          const count = projectsByStatus(s).length;
          if (!count) return null;
          const cfg = STATUS_CONFIG[s];
          return (
            <span key={s} className={`text-[12px] font-semibold px-3 py-1 rounded-full ${cfg.color}`}>
              {cfg.label}: {count}
            </span>
          );
        })}
      </div>

      {loading ? (
        <p className="text-[14px] text-[#86868b]">Loading…</p>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STATUSES.map(s => (
              <KanbanColumn
                key={s}
                status={s}
                projects={projectsByStatus(s)}
                onEdit={p => setModal(p)}
              />
            ))}
          </div>
        </div>
      )}

      {modal && (
        <ProjectModal
          project={modal === 'new' ? null : modal}
          clients={clients}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
