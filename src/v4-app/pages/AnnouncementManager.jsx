import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'content_manager', label: 'Content Manager' },
  { value: 'social_media_manager', label: 'Social Media Manager' },
  { value: 'graphic_designer', label: 'Graphic Designer' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'team_member', label: 'Team Member' },
];

const PRIORITY_CONFIG = {
  high: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    label: 'High',
  },
  normal: {
    border: 'border-l-[#0071e3]',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    label: 'Normal',
  },
  low: {
    border: 'border-l-gray-300 dark:border-l-white/20',
    badge: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-[#86868b]',
    label: 'Low',
  },
};

const DEFAULT_FORM = {
  title: '',
  body: '',
  priority: 'normal',
  target_roles: [],
  expires_at: '',
};

function Avatar({ profile }) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name || ''}
        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  const initials = (profile?.full_name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-[#0071e3] flex items-center justify-center flex-shrink-0">
      <span className="text-white text-[10px] font-bold">{initials}</span>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
}

// Modal for creating / editing announcements
function AnnouncementModal({ initial, onClose, onSave, saving }) {
  const [form, setForm] = useState(initial || DEFAULT_FORM);

  const toggleRole = (role) => {
    setForm((prev) => {
      const roles = prev.target_roles || [];
      const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
      return { ...prev, target_roles: next };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Title and body are required');
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/5 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
          <h2 className="text-[17px] font-bold text-[#1d1d1f] dark:text-white">
            {initial?.id ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
          >
            <X className="w-4 h-4 text-[#86868b]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Announcement title"
              className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-shadow"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              placeholder="Announcement content…"
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none transition-shadow"
              required
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              className="h-10 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Target roles */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">
              Target Roles
              <span className="ml-2 font-normal">(leave all unchecked = Everyone)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={(form.target_roles || []).includes(value)}
                    onChange={() => toggleRole(value)}
                    className="w-4 h-4 rounded accent-[#0071e3] cursor-pointer"
                  />
                  <span className="text-[13px] text-[#1d1d1f] dark:text-white group-hover:text-[#0071e3] transition-colors">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Expiry date */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868b] mb-1.5">
              Expiry Date <span className="font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.expires_at ? form.expires_at.slice(0, 10) : ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, expires_at: e.target.value || '' }))
              }
              min={new Date().toISOString().slice(0, 10)}
              className="h-10 px-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl px-5 py-2 text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : initial?.id ? 'Save Changes' : 'Publish'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#1d1d1f] dark:text-white rounded-xl px-5 py-2 text-[14px] font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Single announcement card
function AnnouncementCard({ announcement, isAdmin, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_CONFIG[announcement.priority] || PRIORITY_CONFIG.normal;
  const publisher = announcement.profiles;
  const targetRoles = announcement.target_roles || [];
  const bodyText = announcement.body || '';
  const isLong = bodyText.length > 200;

  return (
    <div
      className={`bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm border-l-4 ${priority.border} overflow-hidden`}
    >
      <div className="px-5 py-4">
        {/* Priority + roles row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${priority.badge}`}>
            {priority.label}
          </span>
          {targetRoles.length === 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/5 text-[#86868b]">
              <Users className="w-3 h-3" />
              Everyone
            </span>
          ) : (
            targetRoles.map((r) => (
              <span
                key={r}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/5 text-[#86868b] capitalize"
              >
                {r.replace(/_/g, ' ')}
              </span>
            ))
          )}
        </div>

        {/* Title */}
        <h3 className="text-[16px] font-bold text-[#1d1d1f] dark:text-white mb-2 leading-snug">
          {announcement.title}
        </h3>

        {/* Body */}
        <div
          className={`text-[14px] text-[#86868b] leading-relaxed whitespace-pre-wrap ${
            !expanded && isLong ? 'line-clamp-3' : ''
          }`}
        >
          {bodyText}
        </div>
        {isLong && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 text-[#0071e3] text-[13px] font-medium flex items-center gap-1 hover:underline"
          >
            {expanded ? (
              <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
            ) : (
              <>Read more <ChevronDown className="w-3.5 h-3.5" /></>
            )}
          </button>
        )}

        {/* Footer row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-black/5 dark:border-white/5">
          {/* Publisher info */}
          <div className="flex items-center gap-2">
            <Avatar profile={publisher} />
            <div>
              <p className="text-[12px] font-medium text-[#1d1d1f] dark:text-white leading-none">
                {publisher?.full_name || 'Team'}
              </p>
              <p className="text-[11px] text-[#86868b]">{formatDate(announcement.created_at)}</p>
            </div>
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(announcement)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white text-[12px] font-medium transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => onDelete(announcement.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 text-[12px] font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Expiry notice */}
        {announcement.expires_at && (
          <p className="text-[11px] text-[#86868b] mt-2">
            Expires: {formatDate(announcement.expires_at)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AnnouncementManager() {
  const { user, profile } = useAuth();
  const isAdmin = ['admin', 'director'].includes((profile?.role || '').toLowerCase());

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, profiles!published_by(full_name, avatar_url)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Filter expired client-side
      const now = new Date();
      const filtered = (data || []).filter((a) => {
        if (a.expires_at && new Date(a.expires_at) <= now) return false;
        // For non-admins: filter by target_roles
        if (!isAdmin) {
          const roles = a.target_roles || [];
          if (roles.length > 0 && profile?.role && !roles.includes(profile.role)) return false;
        }
        return true;
      });

      setAnnouncements(filtered);
    } catch (e) {
      toast.error(e.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, profile?.role]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const openNewModal = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEditModal = (announcement) => {
    setEditTarget({
      ...announcement,
      expires_at: announcement.expires_at ? announcement.expires_at.slice(0, 10) : '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleSave = async (form) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        priority: form.priority,
        target_roles: form.target_roles || [],
        expires_at: form.expires_at || null,
        is_active: true,
      };

      if (editTarget?.id) {
        // Update existing
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editTarget.id);
        if (error) throw error;
        toast.success('Announcement updated');
      } else {
        // Insert new
        const { error } = await supabase
          .from('announcements')
          .insert({ ...payload, published_by: user.id });
        if (error) throw error;
        toast.success('Announcement published');
      }

      closeModal();
      loadAnnouncements();
    } catch (e) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this announcement? It will no longer be visible.')) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      toast.success('Announcement removed');
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-[#161617] -mx-4 lg:-mx-8 -mt-4 lg:-mt-8 px-4 lg:px-8 pt-8 pb-16">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f] dark:text-white">
              Announcements
            </h1>
            <p className="text-[#86868b] text-[14px] mt-1">
              {isAdmin ? 'Broadcast messages to the team.' : 'Stay up to date with company news.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl px-4 py-2 text-[14px] font-medium transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Announcement
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16">
            <p className="text-[#86868b] text-[14px]">Loading announcements…</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm py-16 text-center px-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black/5 dark:bg-white/5 mb-4">
              <Megaphone className="w-7 h-7 text-[#86868b]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#1d1d1f] dark:text-white mb-1">
              No announcements yet
            </h3>
            <p className="text-[#86868b] text-[14px]">
              {isAdmin
                ? 'Create your first announcement to broadcast to the team.'
                : 'Check back later for company updates.'}
            </p>
            {isAdmin && (
              <button
                onClick={openNewModal}
                className="mt-5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl px-4 py-2 text-[14px] font-medium transition-colors"
              >
                Create Announcement
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                isAdmin={isAdmin}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <AnnouncementModal
          initial={editTarget}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
