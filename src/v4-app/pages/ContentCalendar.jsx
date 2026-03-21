import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Instagram, Facebook, Youtube, Video, FileText,
  Clock, X, ChevronLeft, ChevronRight, Sparkles, Loader2, Check
} from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isToday, isSameMonth
} from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { contentService } from '../services/contentService';
import { clientsService } from '../services/clientsService';
import { supabase } from '../lib/supabase';

// ── Constants ──────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', Icon: Instagram, color: '#e1306c' },
  { id: 'facebook',  label: 'Facebook',  Icon: Facebook,  color: '#1877f2' },
  { id: 'tiktok',    label: 'TikTok',    Icon: Video,     color: '#000000' },
  { id: 'youtube',   label: 'YouTube',   Icon: Youtube,   color: '#ff0000' },
  { id: 'other',     label: 'Other',     Icon: FileText,  color: '#86868b' },
];

const STATUSES = {
  draft:            { label: 'Draft',            color: 'bg-gray-100 text-gray-600' },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
  approved:         { label: 'Approved',         color: 'bg-green-100 text-green-700' },
  scheduled:        { label: 'Scheduled',        color: 'bg-blue-100 text-blue-700' },
  published:        { label: 'Published',        color: 'bg-purple-100 text-purple-700' },
  failed:           { label: 'Failed',           color: 'bg-red-100 text-red-700' },
};

const POST_TYPES = ['image', 'video', 'reel', 'carousel', 'story'];

// ── Post Card (calendar cell) ──────────────────────────────────────────────────
function PostCard({ post, onEdit }) {
  const platform = PLATFORMS.find((p) => p.id === post.platform) || PLATFORMS[PLATFORMS.length - 1];
  const Icon = platform.Icon;
  const status = STATUSES[post.status] || STATUSES.draft;

  return (
    <button
      onClick={() => onEdit(post)}
      className="w-full text-left bg-white rounded-lg border border-gray-200 p-2 hover:border-[#0071e3]/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color: platform.color }} />
        <span className="text-[11px] font-medium text-[#1d1d1f] truncate flex-1">
          {post.client?.name || '—'}
        </span>
      </div>
      {post.caption && (
        <p className="text-[10px] text-[#86868b] line-clamp-1 mb-1">{post.caption}</p>
      )}
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.color}`}>
          {status.label}
        </span>
        {post.scheduled_time && (
          <span className="text-[10px] text-[#86868b] flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />{post.scheduled_time.slice(0, 5)}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Add/Edit Modal ─────────────────────────────────────────────────────────────
function PostModal({ post, clients, currentUser, onSave, onClose }) {
  const isEdit = !!post?.id;
  const [form, setForm] = useState({
    client_id:      post?.client_id      || (clients[0]?.id ?? ''),
    platform:       post?.platform       || 'instagram',
    post_type:      post?.post_type      || 'image',
    caption:        post?.caption        || '',
    scheduled_date: post?.scheduled_date || format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: post?.scheduled_time || '',
    status:         post?.status         || 'draft',
    notes:          post?.notes          || '',
  });
  const [saving, setSaving] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const generateCaption = async () => {
    if (!form.client_id) { toast.error('Select a client first'); return; }
    setGeneratingCaption(true);
    try {
      const client = clients.find((c) => c.id === form.client_id);
      // Placeholder — wire to openaiService or Supabase Edge Function
      await new Promise((r) => setTimeout(r, 1000));
      set('caption', `✨ Discover luxury real estate with ${client?.name || 'us'}. #LuxuryLiving #RealEstate #${form.platform}`);
    } catch {
      toast.error('AI caption unavailable');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handleSave = async () => {
    if (!form.client_id || !form.scheduled_date) {
      toast.error('Client and scheduled date are required');
      return;
    }
    setSaving(true);
    try {
      await onSave(isEdit ? { id: post.id, ...form } : { ...form, created_by_id: currentUser?.id });
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
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">
            {isEdit ? 'Edit Post' : 'Schedule Post'}
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
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Platform</label>
              <select value={form.platform} onChange={(e) => set('platform', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]">
                {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Type</label>
              <select value={form.post_type} onChange={(e) => set('post_type', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]">
                {POST_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-medium text-[#86868b]">Caption</label>
              <button onClick={generateCaption} disabled={generatingCaption}
                className="flex items-center gap-1 text-[11px] text-[#0071e3] font-medium hover:opacity-70 disabled:opacity-40 transition-opacity">
                {generatingCaption ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Caption
              </button>
            </div>
            <textarea value={form.caption} onChange={(e) => set('caption', e.target.value)}
              rows={4} placeholder="Write your caption…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3] resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Date *</label>
              <input type="date" value={form.scheduled_date}
                onChange={(e) => set('scheduled_date', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Time</label>
              <input type="time" value={form.scheduled_time}
                onChange={(e) => set('scheduled_time', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]" />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3]">
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#86868b] mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              rows={2} placeholder="Internal notes…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#0071e3] resize-none" />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-[13px] font-medium text-[#1d1d1f] hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Schedule Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ContentCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [posts, setPosts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    clientsService.getAll().then(setClients).catch(console.error);
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contentService.getPostsForMonth(
        currentMonth,
        filterClient !== 'all' ? { clientId: filterClient } : {}
      );
      setPosts(data);
    } catch {
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, filterClient]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Real-time
  useEffect(() => {
    const channel = supabase
      .channel('content_posts_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_posts' }, () => loadPosts())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadPosts]);

  const filteredPosts = posts.filter((p) => {
    if (filterPlatform !== 'all' && p.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    return true;
  });

  const days      = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPad  = startOfMonth(currentMonth).getDay();

  const postsForDay = (day) =>
    filteredPosts.filter((p) => isSameDay(new Date(p.scheduled_date + 'T12:00:00'), day));

  const handleSave = async (postData) => {
    if (postData.id) {
      const { id, ...updates } = postData;
      const updated = await contentService.updatePost(id, updates);
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast.success('Post updated');
    } else {
      const created = await contentService.createPost(postData);
      toast.success('Post scheduled');
      if (isSameMonth(new Date(created.scheduled_date + 'T12:00:00'), currentMonth)) {
        setPosts((prev) => [...prev, created]);
      }
    }
  };

  const stats = {
    total:     filteredPosts.length,
    draft:     filteredPosts.filter((p) => p.status === 'draft').length,
    approved:  filteredPosts.filter((p) => p.status === 'approved').length,
    published: filteredPosts.filter((p) => p.status === 'published').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[22px] font-bold text-[#1d1d1f]">Content Calendar</h1>
        <button
          onClick={() => { setEditingPost(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-colors"
        >
          <Plus className="w-4 h-4" /> Schedule Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-[#1d1d1f]' },
          { label: 'Draft', value: stats.draft, color: 'text-gray-500' },
          { label: 'Approved', value: stats.approved, color: 'text-green-600' },
          { label: 'Published', value: stats.published, color: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
            <p className="text-[11px] text-[#86868b] font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-[22px] font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#0071e3]">
          <option value="all">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}
          className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#0071e3]">
          <option value="all">All Platforms</option>
          {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] bg-white focus:outline-none focus:border-[#0071e3]">
          <option value="all">All Statuses</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-[#86868b]" />
          </button>
          <h2 className="text-[15px] font-semibold text-[#1d1d1f]">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-[#86868b]" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#0071e3]" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[100px] border-b border-r border-gray-100 bg-gray-50/50" />
            ))}
            {days.map((day) => {
              const dayPosts = postsForDay(day);
              const today = isToday(day);
              return (
                <div key={day.toISOString()}
                  className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 ${today ? 'bg-[#0071e3]/5' : ''}`}>
                  <div className={`text-[12px] font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                    ${today ? 'bg-[#0071e3] text-white' : 'text-[#86868b]'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((post) => (
                      <PostCard key={post.id} post={post}
                        onEdit={(p) => { setEditingPost(p); setShowModal(true); }} />
                    ))}
                    {dayPosts.length > 3 && (
                      <p className="text-[10px] text-[#86868b] text-center">+{dayPosts.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <PostModal
          post={editingPost}
          clients={clients}
          currentUser={user}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingPost(null); }}
        />
      )}
    </div>
  );
}
