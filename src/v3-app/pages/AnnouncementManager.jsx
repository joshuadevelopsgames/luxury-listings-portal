import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreService } from '../../services/firestoreService';
import { isSystemAdmin as checkIsSystemAdmin } from '../../utils/systemAdmins';
import { Timestamp } from 'firebase/firestore';
import {
  Megaphone,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  X,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Link as LinkIcon,
  Calendar,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ── Type options ──────────────────────────────────────────────────────────────
const ANNOUNCEMENT_TYPES = [
  { value: 'info',    label: 'Info',    icon: Info,          color: '#0071e3' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: '#ff9500' },
  { value: 'success', label: 'Success', icon: CheckCircle,   color: '#34c759' },
  { value: 'urgent',  label: 'Urgent',  icon: AlertCircle,   color: '#ff3b30' },
];

const TYPE_STYLES = {
  info:    { bg: 'bg-[#0071e3]/10', border: 'border-[#0071e3]/20', text: 'text-[#0071e3]', icon: Info },
  warning: { bg: 'bg-[#ff9500]/10', border: 'border-[#ff9500]/20', text: 'text-[#ff9500]', icon: AlertTriangle },
  success: { bg: 'bg-[#34c759]/10', border: 'border-[#34c759]/20', text: 'text-[#34c759]', icon: CheckCircle },
  urgent:  { bg: 'bg-[#ff3b30]/10', border: 'border-[#ff3b30]/20', text: 'text-[#ff3b30]', icon: AlertCircle },
};

// ── Blank form ────────────────────────────────────────────────────────────────
const BLANK_FORM = {
  title: '',
  message: '',
  type: 'info',
  active: true,
  dismissible: true,
  linkUrl: '',
  linkText: '',
  expiresAt: '',
  priority: 0,
};

const AnnouncementManager = () => {
  const { currentUser } = useAuth();
  const isAdmin = checkIsSystemAdmin(currentUser?.email);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // ── Load announcements ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const items = await firestoreService.getAnnouncements();
        setAnnouncements(items);
      } catch (e) {
        toast.error('Failed to load announcements');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...BLANK_FORM, createdBy: currentUser?.email });
    setEditingId(null);
    setShowCreateModal(true);
  };

  const openEdit = (a) => {
    setForm({
      title: a.title || '',
      message: a.message || '',
      type: a.type || 'info',
      active: a.active !== false,
      dismissible: a.dismissible !== false,
      linkUrl: a.linkUrl || '',
      linkText: a.linkText || '',
      expiresAt: a.expiresAt ? formatDateForInput(a.expiresAt) : '',
      priority: a.priority || 0,
    });
    setEditingId(a.id);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!form.message.trim()) {
      toast.error('Message is required');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        active: form.active,
        dismissible: form.dismissible,
        linkUrl: form.linkUrl.trim(),
        linkText: form.linkText.trim(),
        priority: Number(form.priority) || 0,
        expiresAt: form.expiresAt ? Timestamp.fromDate(new Date(form.expiresAt)) : null,
        createdBy: currentUser?.email,
      };

      if (editingId) {
        await firestoreService.updateAnnouncement(editingId, payload);
        setAnnouncements(prev => prev.map(a => a.id === editingId ? { ...a, ...payload, id: editingId } : a));
        toast.success('Announcement updated');
      } else {
        const { id } = await firestoreService.createAnnouncement(payload);
        setAnnouncements(prev => [{ ...payload, id }, ...prev]);
        toast.success('Announcement created');
      }
      setShowCreateModal(false);
    } catch (e) {
      toast.error('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (a) => {
    try {
      const newActive = !a.active;
      await firestoreService.updateAnnouncement(a.id, { active: newActive });
      setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, active: newActive } : x));
      toast.success(newActive ? 'Announcement activated' : 'Announcement deactivated');
    } catch {
      toast.error('Failed to toggle');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await firestoreService.deleteAnnouncement(deleteTarget.id);
      setAnnouncements(prev => prev.filter(a => a.id !== deleteTarget.id));
      toast.success('Announcement deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatDateForInput(ts) {
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  }

  function formatDate(ts) {
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return '—';
    }
  }

  // ── Access denied ─────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-[#ff3b30] mx-auto mb-4" />
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mb-2">Access Denied</h2>
          <p className="text-[#86868b]">Only system administrators can manage announcements.</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
              Announcements
            </h1>
            {!loading && (
              <span className="px-3 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-semibold">
                {announcements.length}
              </span>
            )}
          </div>
          <p className="text-[15px] text-[#86868b]">
            Create site-wide banners visible to all team members
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
          <p className="text-[#86868b] text-[15px]">No announcements yet</p>
          <p className="text-[#86868b] text-[13px] mt-1">Create one to broadcast a message to all users</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const style = TYPE_STYLES[a.type] || TYPE_STYLES.info;
            const Icon = style.icon;
            const isExpanded = expandedId === a.id;

            return (
              <div
                key={a.id}
                className={`rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border transition-all ${
                  isExpanded
                    ? 'border-[#0071e3]/30 shadow-lg'
                    : 'border-gray-200 dark:border-white/5 hover:shadow-md'
                }`}
              >
                {/* Card header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.bg}`}>
                      <Icon className={`w-5 h-5 ${style.text}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">
                          {a.title || a.message?.slice(0, 60)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          a.active
                            ? 'bg-[#34c759]/10 text-[#34c759]'
                            : 'bg-black/5 dark:bg-white/10 text-[#86868b]'
                        }`}>
                          {a.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#86868b] truncate max-w-md">
                        {a.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[12px] text-[#86868b] hidden sm:block">
                      {formatDate(a.createdAt)}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-[#86868b]" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-[#86868b]" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-white/5 space-y-4">
                    {/* Live preview */}
                    <div className="mt-4">
                      <span className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide mb-2 block">Preview</span>
                      <div className={`${style.bg} ${style.border} border rounded-xl py-2.5 px-4`}>
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${style.text}`} />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {a.title && (
                              <span className={`text-[13px] font-semibold ${style.text}`}>{a.title}</span>
                            )}
                            <span className="text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7] truncate">{a.message}</span>
                          </div>
                          {a.linkUrl && (
                            <span className={`flex items-center gap-1 text-[12px] font-medium ${style.text}`}>
                              {a.linkText || 'Learn more'}
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          )}
                          {a.dismissible !== false && (
                            <X className="w-3.5 h-3.5 text-[#86868b]" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                      <div>
                        <span className="text-[#86868b] block">Type</span>
                        <span className={`font-medium ${style.text} capitalize`}>{a.type}</span>
                      </div>
                      <div>
                        <span className="text-[#86868b] block">Dismissible</span>
                        <span className="font-medium text-[#1d1d1f] dark:text-white">{a.dismissible !== false ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-[#86868b] block">Priority</span>
                        <span className="font-medium text-[#1d1d1f] dark:text-white">{a.priority || 0}</span>
                      </div>
                      <div>
                        <span className="text-[#86868b] block">Expires</span>
                        <span className="font-medium text-[#1d1d1f] dark:text-white">
                          {a.expiresAt ? formatDate(a.expiresAt) : 'Never'}
                        </span>
                      </div>
                    </div>
                    {a.linkUrl && (
                      <div className="text-[12px]">
                        <span className="text-[#86868b] block">Link</span>
                        <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[#0071e3] hover:underline break-all">
                          {a.linkUrl}
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(a)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                            a.active
                              ? 'bg-[#86868b]/10 text-[#86868b] hover:bg-[#86868b]/20'
                              : 'bg-[#34c759]/10 text-[#34c759] hover:bg-[#34c759]/20'
                          }`}
                        >
                          {a.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {a.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEdit(a)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-medium hover:bg-[#0071e3]/20 transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </div>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors text-[13px] font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#ffffff] dark:bg-[#2c2c2e] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/5 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-[#0071e3]" />
                  </div>
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
                    {editingId ? 'Edit Announcement' : 'New Announcement'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Title */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                    Title <span className="text-[#86868b] font-normal">(optional headline)</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Scheduled Maintenance"
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[15px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                    Message <span className="text-[#ff3b30]">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="The message all users will see..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[15px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 resize-none"
                  />
                </div>

                {/* Type selector */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1.5">Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {ANNOUNCEMENT_TYPES.map((t) => {
                      const selected = form.type === t.value;
                      const TIcon = t.icon;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, type: t.value }))}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                            selected
                              ? `border-[${t.color}]/30 bg-[${t.color}]/10`
                              : 'border-transparent bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                          style={selected ? { borderColor: `${t.color}33`, backgroundColor: `${t.color}1a` } : {}}
                        >
                          <TIcon className="w-5 h-5" style={{ color: t.color }} />
                          <span className="text-[12px] font-medium" style={selected ? { color: t.color } : { color: '#86868b' }}>
                            {t.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row: link URL + link text */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                      <LinkIcon className="w-3 h-3 inline mr-1" />Link URL
                    </label>
                    <input
                      type="url"
                      value={form.linkUrl}
                      onChange={(e) => setForm(p => ({ ...p, linkUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full h-10 px-3 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[13px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                      Link Text
                    </label>
                    <input
                      type="text"
                      value={form.linkText}
                      onChange={(e) => setForm(p => ({ ...p, linkText: e.target.value }))}
                      placeholder="Learn more"
                      className="w-full h-10 px-3 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[13px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                    />
                  </div>
                </div>

                {/* Row: expiry + priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                      <Calendar className="w-3 h-3 inline mr-1" />Expires At
                    </label>
                    <input
                      type="datetime-local"
                      value={form.expiresAt}
                      onChange={(e) => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[13px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                      <GripVertical className="w-3 h-3 inline mr-1" />Priority
                    </label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(e) => setForm(p => ({ ...p, priority: e.target.value }))}
                      min={0}
                      max={100}
                      className="w-full h-10 px-3 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[13px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                    />
                    <p className="text-[11px] text-[#86868b] mt-1">Higher = shown first</p>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.dismissible}
                      onClick={() => setForm(p => ({ ...p, dismissible: !p.dismissible }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 ${
                        form.dismissible ? 'bg-[#34c759]' : 'bg-black/20 dark:bg-white/20'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        form.dismissible ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                    <span className="text-[13px] text-[#1d1d1f] dark:text-white">Dismissible</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.active}
                      onClick={() => setForm(p => ({ ...p, active: !p.active }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 ${
                        form.active ? 'bg-[#34c759]' : 'bg-black/20 dark:bg-white/20'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                        form.active ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                    <span className="text-[13px] text-[#1d1d1f] dark:text-white">Active immediately</span>
                  </label>
                </div>

                {/* Live preview */}
                {form.message && (
                  <div>
                    <span className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide mb-2 block">Live Preview</span>
                    {(() => {
                      const ps = TYPE_STYLES[form.type] || TYPE_STYLES.info;
                      const PIcon = ps.icon;
                      return (
                        <div className={`${ps.bg} ${ps.border} border rounded-xl py-2.5 px-4`}>
                          <div className="flex items-center gap-3">
                            <PIcon className={`w-4 h-4 flex-shrink-0 ${ps.text}`} />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {form.title && <span className={`text-[13px] font-semibold ${ps.text}`}>{form.title}</span>}
                              <span className="text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7] truncate">{form.message}</span>
                            </div>
                            {form.linkUrl && (
                              <span className={`flex items-center gap-1 text-[12px] font-medium ${ps.text}`}>
                                {form.linkText || 'Learn more'}
                                <ExternalLink className="w-3 h-3" />
                              </span>
                            )}
                            {form.dismissible && <X className="w-3.5 h-3.5 text-[#86868b]" />}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 dark:border-white/5 flex-shrink-0">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="h-10 px-4 rounded-xl text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.message.trim()}
                  className="flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  {editingId ? 'Update' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setDeleteTarget(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#ffffff] dark:bg-[#2c2c2e] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-5 text-center">
                <div className="w-16 h-16 rounded-full bg-[#ff3b30]/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-[#ff3b30]" />
                </div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
                  Delete Announcement?
                </h2>
                <p className="text-[15px] text-[#86868b]">
                  This will permanently remove "{deleteTarget.title || deleteTarget.message?.slice(0, 40)}".
                </p>
              </div>
              <div className="flex items-center gap-3 p-5 border-t border-gray-200 dark:border-white/5">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 h-11 rounded-xl text-[15px] font-medium text-[#1d1d1f] dark:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-[#ff3b30] text-white text-[15px] font-medium hover:bg-[#ff453a] transition-all disabled:opacity-50"
                >
                  {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnnouncementManager;
