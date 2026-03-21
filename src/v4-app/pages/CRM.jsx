import React, { useState, useEffect } from 'react';
import {
  Plus, TrendingUp, Users, Target, GitBranch, Search,
  X, Check, Loader2, MoreVertical, ChevronRight, Edit,
  Trash2, Phone, Mail, Calendar, DollarSign, Flame
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { crmService } from '../services/crmService';

// ── Constants ──────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { id: 'qualification', label: 'Qualification', color: 'bg-blue-100 text-blue-700',   probability: 20 },
  { id: 'proposal',      label: 'Proposal',      color: 'bg-purple-100 text-purple-700', probability: 40 },
  { id: 'negotiation',   label: 'Negotiation',   color: 'bg-yellow-100 text-yellow-700', probability: 70 },
  { id: 'closing',       label: 'Closing',       color: 'bg-orange-100 text-orange-700', probability: 90 },
  { id: 'closed_won',    label: 'Closed Won',    color: 'bg-green-100 text-green-700',   probability: 100 },
  { id: 'closed_lost',   label: 'Closed Lost',   color: 'bg-red-100 text-red-700',       probability: 0 },
];

const LEAD_STATUSES = ['new','contacted','qualified','proposal','negotiation','won','lost','converted'];

const TEMP_META = {
  hot:  { label: 'Hot',  icon: '🔥', color: 'bg-red-50 text-red-600' },
  warm: { label: 'Warm', icon: '☀️', color: 'bg-orange-50 text-orange-600' },
  cold: { label: 'Cold', icon: '❄️', color: 'bg-blue-50 text-blue-600' },
};

// ── Lead Modal ─────────────────────────────────────────────────────────────────
function LeadModal({ lead, onSave, onClose }) {
  const [form, setForm] = useState({
    name:             lead?.name             || '',
    company:          lead?.company          || '',
    email:            lead?.email            || '',
    phone:            lead?.phone            || '',
    source:           lead?.source           || 'website',
    status:           lead?.status           || 'new',
    temperature:      lead?.temperature      || 'warm',
    score:            lead?.score            ?? 50,
    notes:            lead?.notes            || '',
    next_follow_up_at: lead?.next_follow_up_at || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await onSave(lead?.id ? { id: lead.id, ...form } : form);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">{lead?.id ? 'Edit Lead' : 'Add Lead'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-[#86868b]" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {[['Name *', 'name', 'text'], ['Company', 'company', 'text'], ['Email', 'email', 'email'], ['Phone', 'phone', 'tel']].map(([label, key, type]) => (
            <div key={key}>
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">{label}</label>
              <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Source</label>
              <select value={form.source} onChange={(e) => set('source', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]">
                {['website','referral','social','event','cold_outreach'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Temperature</label>
              <select value={form.temperature} onChange={(e) => set('temperature', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]">
                {Object.entries(TEMP_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]">
                {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Score (0-100)</label>
              <input type="number" min={0} max={100} value={form.score} onChange={(e) => set('score', Number(e.target.value))}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]" />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Follow Up Date</label>
            <input type="date" value={form.next_follow_up_at} onChange={(e) => set('next_follow_up_at', e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3] resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-gray-200 text-[13px] font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {lead?.id ? 'Save Changes' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lead Row ───────────────────────────────────────────────────────────────────
function LeadRow({ lead, onEdit, onDelete }) {
  const temp = TEMP_META[lead.temperature] || TEMP_META.warm;
  return (
    <div className="flex items-center gap-4 px-5 py-3 bg-white rounded-2xl border border-gray-200 hover:border-[#0071e3]/30 hover:shadow-sm transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{lead.name}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${temp.color}`}>{temp.icon} {temp.label}</span>
        </div>
        {lead.company && <p className="text-[12px] text-[#86868b] truncate mt-0.5">{lead.company}</p>}
      </div>
      <div className="hidden sm:flex items-center gap-4 text-[12px] text-[#86868b]">
        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
        {lead.next_follow_up_at && (
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
            {format(new Date(lead.next_follow_up_at + 'T12:00:00'), 'MMM d')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <div className="w-8 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-[#0071e3]" style={{ width: `${lead.score ?? 0}%` }} />
        </div>
        <span className="text-[11px] text-[#86868b] w-6">{lead.score}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(lead)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
          <Edit className="w-3.5 h-3.5 text-[#86868b]" />
        </button>
        <button onClick={() => onDelete(lead.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center">
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}

// ── Pipeline Card ──────────────────────────────────────────────────────────────
function PipelineColumn({ stage, deals }) {
  const total = deals.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <div className="flex-1 min-w-[180px]">
      <div className="mb-2">
        <div className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${stage.color}`}>
          {stage.label}
        </div>
        <p className="text-[12px] text-[#86868b] mt-1">{deals.length} deals · ${(total/1000).toFixed(0)}K</p>
      </div>
      <div className="space-y-2">
        {deals.map((deal) => (
          <div key={deal.id} className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{deal.name}</p>
            {deal.value && <p className="text-[12px] text-[#86868b] mt-1">${deal.value.toLocaleString()}</p>}
            {deal.close_date && (
              <p className="text-[11px] text-[#86868b] mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />{format(new Date(deal.close_date + 'T12:00:00'), 'MMM d')}
              </p>
            )}
          </div>
        ))}
        {deals.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center">
            <p className="text-[11px] text-[#86868b]">No deals</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CRM() {
  const { user } = useAuth();
  const [tab, setTab] = useState('leads'); // leads | pipeline
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [l, d] = await Promise.all([crmService.getLeads(), crmService.getDeals()]);
        setLeads(l);
        setDeals(d);
      } catch { toast.error('Failed to load CRM data'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSaveLead = async (data) => {
    if (data.id) {
      const { id, ...updates } = data;
      const updated = await crmService.updateLead(id, updates);
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      toast.success('Lead updated');
    } else {
      const created = await crmService.createLead({ ...data, owner_id: user?.id });
      setLeads((prev) => [created, ...prev]);
      toast.success('Lead added');
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    await crmService.updateLead(id, { status: 'lost' });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success('Lead removed');
  };

  const filteredLeads = leads.filter((l) =>
    l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.company?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Pipeline summary
  const pipelineTotal = deals.filter((d) => !['closed_won','closed_lost'].includes(d.stage))
    .reduce((s, d) => s + (d.value || 0), 0);
  const weightedTotal = deals.reduce((s, d) => {
    const stage = PIPELINE_STAGES.find((st) => st.id === d.stage);
    return s + (d.value || 0) * ((stage?.probability || 0) / 100);
  }, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[22px] font-bold text-[#1d1d1f]">CRM</h1>
        <button onClick={() => { setEditingLead(null); setShowLeadModal(true); }}
          className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-colors">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
          <p className="text-[11px] text-[#86868b] font-medium uppercase tracking-wide">Total Leads</p>
          <p className="text-[22px] font-bold text-[#1d1d1f]">{leads.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
          <p className="text-[11px] text-[#86868b] font-medium uppercase tracking-wide">Hot Leads</p>
          <p className="text-[22px] font-bold text-red-500">{leads.filter((l) => l.temperature === 'hot').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
          <p className="text-[11px] text-[#86868b] font-medium uppercase tracking-wide">Pipeline Value</p>
          <p className="text-[22px] font-bold text-[#1d1d1f]">${(pipelineTotal/1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
          <p className="text-[11px] text-[#86868b] font-medium uppercase tracking-wide">Weighted Value</p>
          <p className="text-[22px] font-bold text-green-600">${(weightedTotal/1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['leads', 'Leads'], ['pipeline', 'Pipeline']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 h-8 rounded-lg text-[13px] font-medium transition-colors ${tab === id ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#0071e3]" />
        </div>
      ) : tab === 'leads' ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-200 bg-white text-[13px] focus:outline-none focus:border-[#0071e3]" />
          </div>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-8 h-8 text-[#86868b] mx-auto mb-2" />
              <p className="text-[14px] font-medium text-[#1d1d1f]">No leads found</p>
            </div>
          ) : filteredLeads.map((lead) => (
            <LeadRow key={lead.id} lead={lead}
              onEdit={(l) => { setEditingLead(l); setShowLeadModal(true); }}
              onDelete={handleDeleteLead} />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn key={stage.id} stage={stage}
              deals={deals.filter((d) => d.stage === stage.id)} />
          ))}
        </div>
      )}

      {showLeadModal && (
        <LeadModal lead={editingLead} onSave={handleSaveLead}
          onClose={() => { setShowLeadModal(false); setEditingLead(null); }} />
      )}
    </div>
  );
}
