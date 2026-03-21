import React, { useState, useEffect } from 'react';
import {
  Instagram, Plus, Upload, Link as LinkIcon, Copy, Check, Trash2,
  Eye, Edit, X, BarChart3, AlertCircle, Loader2, ChevronDown,
  ChevronUp, Archive, ExternalLink, TrendingUp, Heart, Users,
  MousePointer, MessageCircle, UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { instagramService } from '../services/instagramService';
import { clientsService } from '../services/clientsService';

// ── Metric Card ────────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, Icon, color = 'text-[#0071e3]' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
        <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-[24px] font-bold text-[#1d1d1f]">{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-[#86868b] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Report Row ─────────────────────────────────────────────────────────────────
function ReportRow({ report, onEdit, onDelete, onArchive, onCopyLink, onTogglePublic }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const followerChange = (report.followers_end ?? 0) - (report.followers_start ?? 0);

  const handleCopyLink = async () => {
    const link = await instagramService.getPublicLink(report);
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{report.client?.name}</p>
          <p className="text-[12px] text-[#86868b] mt-0.5">
            {report.period_start && format(new Date(report.period_start + 'T12:00:00'), 'MMM d')}
            {' – '}
            {report.period_end && format(new Date(report.period_end + 'T12:00:00'), 'MMM d, yyyy')}
          </p>
        </div>

        {/* Quick metrics */}
        <div className="hidden sm:flex items-center gap-6">
          <div className="text-center">
            <p className={`text-[14px] font-bold ${followerChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {followerChange >= 0 ? '+' : ''}{followerChange?.toLocaleString() ?? '—'}
            </p>
            <p className="text-[10px] text-[#86868b]">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-[14px] font-bold text-[#1d1d1f]">{report.total_reach?.toLocaleString() ?? '—'}</p>
            <p className="text-[10px] text-[#86868b]">Reach</p>
          </div>
          <div className="text-center">
            <p className="text-[14px] font-bold text-[#1d1d1f]">{report.engagement_rate ? `${report.engagement_rate}%` : '—'}</p>
            <p className="text-[10px] text-[#86868b]">Engagement</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button onClick={handleCopyLink}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            title="Copy public link">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <LinkIcon className="w-4 h-4 text-[#86868b]" />}
          </button>
          <button onClick={() => onEdit(report)}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" title="Edit">
            <Edit className="w-4 h-4 text-[#86868b]" />
          </button>
          <button onClick={() => onDelete(report.id)}
            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors" title="Delete">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
          <button onClick={() => setExpanded((e) => !e)}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4 text-[#86868b]" /> : <ChevronDown className="w-4 h-4 text-[#86868b]" />}
          </button>
        </div>
      </div>

      {/* Expanded metrics */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <MetricCard label="Reach" value={report.total_reach?.toLocaleString()} Icon={Eye} />
            <MetricCard label="Profile Views" value={report.profile_views?.toLocaleString()} Icon={MousePointer} />
            <MetricCard label="Likes" value={report.likes?.toLocaleString()} Icon={Heart} color="text-red-400" />
            <MetricCard label="Comments" value={report.comments?.toLocaleString()} Icon={MessageCircle} color="text-blue-400" />
            <MetricCard label="Saves" value={report.saves?.toLocaleString()} Icon={BarChart3} color="text-purple-400" />
            <MetricCard label="Followers ±" value={(followerChange >= 0 ? '+' : '') + (followerChange?.toLocaleString() ?? '—')}
              Icon={UserPlus} color={followerChange >= 0 ? 'text-green-500' : 'text-red-500'} />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] text-[#86868b] cursor-pointer">
              <input type="checkbox" checked={report.is_public} onChange={(e) => onTogglePublic(report.id, e.target.checked)}
                className="rounded" />
              Public link active
            </label>
            <a href={`/report/${report.public_link_id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[12px] text-[#0071e3] hover:underline">
              <ExternalLink className="w-3 h-3" /> View public report
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Report Modal ───────────────────────────────────────────────────────────────
function ReportModal({ report, clients, currentUser, onSave, onClose }) {
  const isEdit = !!report?.id;
  const [form, setForm] = useState({
    client_id:       report?.client_id       || (clients[0]?.id ?? ''),
    period_start:    report?.period_start    || '',
    period_end:      report?.period_end      || '',
    followers_start: report?.followers_start ?? '',
    followers_end:   report?.followers_end   ?? '',
    total_reach:     report?.total_reach     ?? '',
    profile_views:   report?.profile_views   ?? '',
    impressions:     report?.impressions     ?? '',
    likes:           report?.likes           ?? '',
    comments:        report?.comments        ?? '',
    shares:          report?.shares          ?? '',
    saves:           report?.saves           ?? '',
    engagement_rate: report?.engagement_rate ?? '',
    notes:           report?.notes           || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const num = (v) => (v === '' ? null : Number(v));

  const handleSave = async () => {
    if (!form.client_id || !form.period_start || !form.period_end) {
      toast.error('Client and period dates are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        followers_start: num(form.followers_start),
        followers_end:   num(form.followers_end),
        total_reach:     num(form.total_reach),
        profile_views:   num(form.profile_views),
        impressions:     num(form.impressions),
        likes:           num(form.likes),
        comments:        num(form.comments),
        shares:          num(form.shares),
        saves:           num(form.saves),
        engagement_rate: num(form.engagement_rate),
        created_by_id:   currentUser?.id,
      };
      await onSave(isEdit ? { id: report.id, ...payload } : payload);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const numField = (label, key, placeholder = '') => (
    <div>
      <label className="text-[12px] font-medium text-[#86868b] mb-1 block">{label}</label>
      <input type="number" value={form[key]} onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">
            {isEdit ? 'Edit Report' : 'Add Instagram Report'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-[#86868b]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Client *</label>
            <select value={form.client_id} onChange={(e) => set('client_id', e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]">
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Period Start *</label>
              <input type="date" value={form.period_start} onChange={(e) => set('period_start', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Period End *</label>
              <input type="date" value={form.period_end} onChange={(e) => set('period_end', e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]" />
            </div>
          </div>

          <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wide pt-1">Follower Metrics</p>
          <div className="grid grid-cols-2 gap-3">
            {numField('Followers (Start)', 'followers_start')}
            {numField('Followers (End)', 'followers_end')}
          </div>

          <p className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wide pt-1">Engagement Metrics</p>
          <div className="grid grid-cols-2 gap-3">
            {numField('Total Reach', 'total_reach')}
            {numField('Profile Views', 'profile_views')}
            {numField('Impressions', 'impressions')}
            {numField('Engagement Rate %', 'engagement_rate', '4.5')}
            {numField('Likes', 'likes')}
            {numField('Comments', 'comments')}
            {numField('Shares', 'shares')}
            {numField('Saves', 'saves')}
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3] resize-none" />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-[13px] font-medium text-[#1d1d1f] hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Add Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function InstagramReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([
        instagramService.getReports({ clientId: filterClient !== 'all' ? filterClient : null }),
        clientsService.getAll(),
      ]);
      setReports(r);
      setClients(c);
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterClient]);

  const handleSave = async (data) => {
    if (data.id) {
      const { id, ...updates } = data;
      const updated = await instagramService.updateReport(id, updates);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success('Report updated');
    } else {
      const created = await instagramService.createReport(data);
      setReports((prev) => [created, ...prev]);
      toast.success('Report added');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    await instagramService.deleteReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
    toast.success('Report deleted');
  };

  const handleTogglePublic = async (id, isPublic) => {
    await instagramService.togglePublic(id, isPublic);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, is_public: isPublic } : r)));
    toast.success(isPublic ? 'Public link enabled' : 'Public link disabled');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[22px] font-bold text-[#1d1d1f]">Instagram Reports</h1>
        <button onClick={() => { setEditingReport(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-colors">
          <Plus className="w-4 h-4" /> Add Report
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#0071e3]">
          <option value="all">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#0071e3]" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Instagram className="w-10 h-10 text-[#86868b] mb-3" />
          <p className="text-[15px] font-semibold text-[#1d1d1f]">No reports yet</p>
          <p className="text-[13px] text-[#86868b] mt-1">Add your first Instagram report to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              onEdit={(r) => { setEditingReport(r); setShowModal(true); }}
              onDelete={handleDelete}
              onTogglePublic={handleTogglePublic}
            />
          ))}
        </div>
      )}

      {showModal && (
        <ReportModal
          report={editingReport}
          clients={clients}
          currentUser={user}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingReport(null); }}
        />
      )}
    </div>
  );
}
