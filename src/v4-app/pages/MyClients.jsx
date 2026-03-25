import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ChevronRight,
  Instagram,
  Activity,
  AlertTriangle,
  Eye,
  CheckCircle2,
  RefreshCw,
  FileText,
  User,
  BarChart2,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ── Constants ──────────────────────────────────────────────────────────────────

const ADMIN_ROLES  = ['admin', 'director'];
const FILTER_TABS  = ['Active', 'Paused', 'All'];

const HEALTH_CONFIG = {
  healthy: {
    label:  'Healthy',
    badge:  'bg-[#34c759]/10 text-[#34c759]',
    bar:    'bg-[#34c759]',
    icon:   CheckCircle2,
  },
  monitor: {
    label:  'Monitor',
    badge:  'bg-[#ff9500]/10 text-[#ff9500]',
    bar:    'bg-[#ff9500]',
    icon:   Eye,
  },
  at_risk: {
    label:  'At Risk',
    badge:  'bg-[#ff3b30]/10 text-[#ff3b30]',
    bar:    'bg-[#ff3b30]',
    icon:   AlertTriangle,
  },
};

const STATUS_CONFIG = {
  Active:  { badge: 'bg-[#34c759]/10 text-[#34c759]' },
  Paused:  { badge: 'bg-[#ff9500]/10 text-[#ff9500]' },
  Churned: { badge: 'bg-[#ff3b30]/10 text-[#ff3b30]' },
};

// Deterministic color from name
const AVATAR_COLORS = [
  'bg-[#0071e3]', 'bg-[#34c759]', 'bg-[#ff9500]', 'bg-purple-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-[#ff3b30]',
];
function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function safeFormat(val, fmt) {
  if (!val) return '—';
  try {
    const d = typeof val === 'string' ? parseISO(val) : new Date(val);
    return isValid(d) ? format(d, fmt) : '—';
  } catch { return '—'; }
}

function normalizeHealth(raw) {
  if (!raw) return 'monitor';
  const s = String(raw).toLowerCase().replace(/-/g, '_').replace(/\s/g, '_');
  if (s === 'at_risk' || s === 'critical') return 'at_risk';
  if (s === 'healthy' || s === 'good')     return 'healthy';
  return 'monitor';
}

function latestSnapshot(snapshots) {
  if (!snapshots || snapshots.length === 0) return null;
  return [...snapshots].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at) : new Date(0);
    const db = b.created_at ? new Date(b.created_at) : new Date(0);
    return db - da;
  })[0];
}

// ── Client Avatar ──────────────────────────────────────────────────────────────

function ClientAvatar({ name, size = 40 }) {
  const letter = (name ?? '?')[0].toUpperCase();
  const color  = avatarColor(name ?? '');
  return (
    <div
      className={`${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {letter}
    </div>
  );
}

// ── Side Panel ─────────────────────────────────────────────────────────────────

function ClientSidePanel({ client, onClose }) {
  const snapshot  = latestSnapshot(client.client_health_snapshots);
  const health    = normalizeHealth(snapshot?.status);
  const healthCfg = HEALTH_CONFIG[health];
  const HealthIcon = healthCfg.icon;

  const [notes, setNotes]   = useState(client.notes ?? '');
  const [saving, setSaving] = useState(false);
  const saveTimer           = useRef(null);

  const handleNotesBlur = async () => {
    if (notes === (client.notes ?? '')) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ notes })
        .eq('id', client.id);
      if (error) throw error;
      toast.success('Notes saved');
      client.notes = notes; // optimistic local update
    } catch (e) {
      toast.error(e.message || 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const managerName = client.profiles?.full_name ?? '—';
  const postsUsed   = client.posts_used_this_month ?? 0;
  const postsCap    = client.posts_per_month ?? 0;
  const postsWidth  = postsCap > 0 ? Math.min(100, Math.round((postsUsed / postsCap) * 100)) : 0;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md z-40 flex flex-col shadow-2xl bg-white dark:bg-[#1c1c1e] border-l border-black/10 dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <ClientAvatar name={client.name} size={36} />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">{client.name}</p>
            {client.instagram_handle && (
              <p className="text-[13px] text-[#86868b] truncate">@{client.instagram_handle}</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Close panel"
        >
          <X className="w-4 h-4 text-[#86868b]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Client Info */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide">Client Info</h3>
          <div className="bg-[#f5f5f7] dark:bg-[#161617] rounded-2xl p-4 space-y-3">
            <Row label="Status" value={
              <span className={`inline-flex items-center text-[12px] font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[client.status]?.badge ?? 'bg-black/5 text-[#86868b]'}`}>
                {client.status ?? '—'}
              </span>
            } />
            <Row label="Platform"       value={client.platform ?? '—'} />
            <Row label="Posts / Month"  value={postsCap > 0 ? `${postsUsed} / ${postsCap}` : '—'} />
            <Row label="Account Mgr"    value={managerName} />
            {client.instagram_handle && (
              <Row label="Instagram" value={
                <span className="flex items-center gap-1 text-[#0071e3]">
                  <Instagram className="w-3.5 h-3.5" />
                  @{client.instagram_handle}
                </span>
              } />
            )}
          </div>
        </div>

        {/* Posts progress */}
        {postsCap > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Posts This Month</span>
              <span className="text-[13px] text-[#86868b]">{postsUsed} / {postsCap}</span>
            </div>
            <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${postsWidth > 90 ? 'bg-[#ff3b30]' : postsWidth > 70 ? 'bg-[#ff9500]' : 'bg-[#0071e3]'}`}
                style={{ width: `${postsWidth}%` }}
              />
            </div>
          </div>
        )}

        {/* Health */}
        <div className="space-y-3">
          <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide">Health</h3>
          <div className="bg-[#f5f5f7] dark:bg-[#161617] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium px-2.5 py-1 rounded-full ${healthCfg.badge}`}>
                <HealthIcon className="w-3.5 h-3.5" />
                {healthCfg.label}
              </span>
              {snapshot?.score != null && (
                <span className="text-[22px] font-bold text-[#1d1d1f] dark:text-white">{snapshot.score}</span>
              )}
            </div>
            {snapshot?.summary && (
              <p className="text-[13px] text-[#86868b] leading-relaxed">{snapshot.summary}</p>
            )}
            {snapshot?.created_at && (
              <p className="text-[12px] text-[#86868b]">Last updated {safeFormat(snapshot.created_at, 'MMM d, yyyy')}</p>
            )}
            {!snapshot && (
              <p className="text-[13px] text-[#86868b]">No health snapshot available</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#86868b] uppercase tracking-wide">Notes</h3>
            {saving && (
              <div className="w-3.5 h-3.5 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            rows={5}
            placeholder="Add notes about this client…"
            className="w-full px-4 py-3 rounded-xl bg-[#f5f5f7] dark:bg-[#161617] border border-black/5 dark:border-white/5 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
          />
          <p className="text-[12px] text-[#86868b]">Auto-saves on blur</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-[#86868b] flex-shrink-0">{label}</span>
      <span className="text-[13px] text-[#1d1d1f] dark:text-white text-right">{value}</span>
    </div>
  );
}

// ── Client Card ────────────────────────────────────────────────────────────────

function ClientCard({ client, onViewDetails }) {
  const snapshot  = latestSnapshot(client.client_health_snapshots);
  const health    = normalizeHealth(snapshot?.status);
  const healthCfg = HEALTH_CONFIG[health];
  const HealthIcon = healthCfg.icon;

  const statusCfg = STATUS_CONFIG[client.status] ?? {};
  const postsUsed = client.posts_used_this_month ?? 0;
  const postsCap  = client.posts_per_month ?? 0;
  const postsWidth = postsCap > 0 ? Math.min(100, Math.round((postsUsed / postsCap) * 100)) : 0;
  const managerName = client.profiles?.full_name;

  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start gap-3">
        <ClientAvatar name={client.name} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">{client.name}</p>
            <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusCfg.badge ?? 'bg-black/5 text-[#86868b]'}`}>
              {client.status ?? '—'}
            </span>
          </div>
          {client.instagram_handle && (
            <div className="flex items-center gap-1 mt-0.5">
              <Instagram className="w-3 h-3 text-[#86868b]" />
              <span className="text-[13px] text-[#86868b]">@{client.instagram_handle}</span>
            </div>
          )}
        </div>
      </div>

      {/* Posts */}
      {postsCap > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#86868b]">Posts this month</span>
            <span className="text-[12px] font-medium text-[#1d1d1f] dark:text-white">{postsUsed} / {postsCap}</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${postsWidth > 90 ? 'bg-[#ff3b30]' : postsWidth > 70 ? 'bg-[#ff9500]' : 'bg-[#0071e3]'} transition-all`}
              style={{ width: `${postsWidth}%` }}
            />
          </div>
        </div>
      )}

      {/* Health + Manager */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full ${healthCfg.badge}`}>
          <HealthIcon className="w-3 h-3" />
          {healthCfg.label}
        </span>
        {managerName && (
          <div className="flex items-center gap-1 text-[12px] text-[#86868b]">
            <User className="w-3 h-3" />
            <span>{managerName}</span>
          </div>
        )}
      </div>

      {/* View details */}
      <button
        onClick={() => onViewDetails(client)}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#f5f5f7] dark:bg-[#161617] text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        View Details
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MyClients() {
  const { user, profile } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(profile?.role);

  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [clients, setClients]         = useState([]);
  const [search, setSearch]           = useState('');
  const [activeFilter, setActiveFilter] = useState('Active');
  const [selectedClient, setSelectedClient] = useState(null);

  const loadClients = useCallback(async () => {
    if (!user?.id) return;

    let query = supabase
      .from('clients')
      .select('*, profiles!account_manager_id(full_name), client_health_snapshots(status, score, summary, created_at)')
      .order('name');

    if (!isAdmin) {
      query = query.eq('account_manager_id', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    setClients(data ?? []);
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try   { await loadClients(); }
      catch (e) { if (!cancelled) toast.error(e.message || 'Failed to load clients'); }
      finally   { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.id, loadClients]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try   { await loadClients(); toast.success('Refreshed'); }
    catch (e) { toast.error(e.message || 'Refresh failed'); }
    finally   { setRefreshing(false); }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Status filter
      if (activeFilter === 'Active' && c.status !== 'Active') return false;
      if (activeFilter === 'Paused' && c.status !== 'Paused') return false;

      // Search filter
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.instagram_handle?.toLowerCase().includes(q) ||
        c.profiles?.full_name?.toLowerCase().includes(q)
      );
    });
  }, [clients, activeFilter, search]);

  // Close side panel when pressing Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedClient(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-5 h-5 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
        <p className="text-[14px] text-[#86868b]">Loading clients…</p>
      </div>
    );
  }

  return (
    <>
      {/* Side panel backdrop */}
      {selectedClient && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
          onClick={() => setSelectedClient(null)}
        />
      )}

      {/* Side panel */}
      {selectedClient && (
        <ClientSidePanel
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-[#1d1d1f] dark:text-white">My Clients</h1>
            <span className="text-[13px] font-medium px-2.5 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3]">
              {filteredClients.length}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              className="w-full h-10 pl-9 pr-9 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#1c1c1e] rounded-xl border border-black/5 dark:border-white/5 p-1 shadow-sm self-start">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  activeFilter === tab
                    ? 'bg-[#0071e3] text-white shadow-sm'
                    : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Client grid */}
        {filteredClients.length === 0 ? (
          <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl border border-black/5 dark:border-white/5 shadow-sm p-16 text-center">
            <BarChart2 className="w-10 h-10 text-[#86868b] mx-auto mb-3" />
            <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white mb-1">
              {search ? 'No clients found' : 'No clients yet'}
            </p>
            <p className="text-[#86868b] text-[14px]">
              {search ? `No results for "${search}"` : 'Clients assigned to you will appear here'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-4 text-[14px] font-medium text-[#0071e3] hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onViewDetails={setSelectedClient}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
