import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionsContext';
import { firestoreService } from '../services/firestoreService';
import { Shield, Settings, MessageSquare, ArrowRight, BarChart3, Clock, RefreshCw } from 'lucide-react';

const DAYS = 30;

function formatPath(path) {
  if (!path || path === '/') return 'Dashboard';
  return path.replace(/^\//, '').replace(/-/g, ' ');
}

export default function SystemAdminPage() {
  const { isSystemAdmin } = usePermissions();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSystemAdmin === false) {
      navigate('/dashboard', { replace: true });
    }
  }, [isSystemAdmin, navigate]);

  useEffect(() => {
    if (!isSystemAdmin) return;
    setLoading(true);
    firestoreService.getUsageAnalytics().then((list) => {
      setEvents(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isSystemAdmin]);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - DAYS);
    return d.getTime();
  }, []);

  const { byViews, byAvgTime } = useMemo(() => {
    const views = {};
    const time = {}; // page_path -> { totalSec, count }
    for (const e of events) {
      const ts = e.timestamp?.toMillis?.() ?? e.timestamp?.seconds * 1000 ?? 0;
      if (ts < since) continue;
      const path = e.page_path || '/';
      if (e.event_type === 'page_view') {
        views[path] = (views[path] || 0) + 1;
      } else if (e.event_type === 'time_on_page' && typeof e.value === 'number') {
        if (!time[path]) time[path] = { totalSec: 0, count: 0 };
        time[path].totalSec += e.value;
        time[path].count += 1;
      }
    }
    const byViews = Object.entries(views)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
    const byAvgTime = Object.entries(time)
      .filter(([, v]) => v.count > 0)
      .map(([path, v]) => ({ path, avgSec: Math.round(v.totalSec / v.count), sessions: v.count }))
      .sort((a, b) => b.avgSec - a.avgSec)
      .slice(0, 15);
    return { byViews, byAvgTime };
  }, [events, since]);

  if (isSystemAdmin === false) return null;

  const links = [
    { to: '/permissions', label: 'Users & Permissions', icon: Settings, description: 'Manage access and roles' },
    { to: '/admin-message', label: 'Admin Message', icon: MessageSquare, description: 'System admin guidelines' },
  ];

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#0071e3]" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white tracking-tight">System Admin</h1>
          <p className="text-[13px] text-[#86868b]">Admin-only tools and usage analytics</p>
        </div>
      </div>

      {/* Usage analytics */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0071e3]" strokeWidth={1.5} />
            Usage (last {DAYS} days)
          </h2>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              firestoreService.getUsageAnalytics().then(setEvents).finally(() => setLoading(false));
            }}
            className="flex items-center gap-1.5 text-[13px] text-[#0071e3] hover:underline"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="rounded-xl border border-black/5 dark:border-white/10 bg-[#ffffff] dark:bg-white/5 p-8 text-center text-[#86868b] text-[13px]">
            Loading…
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-black/5 dark:border-white/10 bg-[#ffffff] dark:bg-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2 text-[#86868b] text-[12px] font-medium uppercase tracking-wide">
                <BarChart3 className="w-4 h-4" /> Most viewed pages
              </div>
              <ul className="divide-y divide-black/5 dark:divide-white/10">
                {byViews.length === 0 ? (
                  <li className="px-4 py-6 text-[13px] text-[#86868b]">No page views in the last {DAYS} days.</li>
                ) : (
                  byViews.map(({ path, count }) => (
                    <li key={path} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-[13px] text-[#1d1d1f] dark:text-white truncate">{formatPath(path)}</span>
                      <span className="text-[13px] font-medium text-[#0071e3] tabular-nums">{count}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-xl border border-black/5 dark:border-white/10 bg-[#ffffff] dark:bg-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center gap-2 text-[#86868b] text-[12px] font-medium uppercase tracking-wide">
                <Clock className="w-4 h-4" /> Longest time on page (avg)
              </div>
              <ul className="divide-y divide-black/5 dark:divide-white/10">
                {byAvgTime.length === 0 ? (
                  <li className="px-4 py-6 text-[13px] text-[#86868b]">No duration data yet.</li>
                ) : (
                  byAvgTime.map(({ path, avgSec, sessions }) => (
                    <li key={path} className="flex items-center justify-between px-4 py-2.5 gap-2">
                      <span className="text-[13px] text-[#1d1d1f] dark:text-white truncate">{formatPath(path)}</span>
                      <span className="text-[13px] font-medium text-[#0071e3] tabular-nums shrink-0">
                        {avgSec >= 60 ? `${Math.floor(avgSec / 60)}m ${avgSec % 60}s` : `${avgSec}s`}
                        <span className="text-[11px] text-[#86868b] font-normal ml-1">({sessions})</span>
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </section>

      <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-3">Admin tools</h2>
      <div className="space-y-3">
        {links.map(({ to, label, icon: Icon, description }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 p-4 rounded-xl bg-[#ffffff] dark:bg-white/5 border border-black/5 dark:border-white/10 hover:border-[#0071e3]/30 dark:hover:border-[#0a84ff]/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-[#86868b] group-hover:text-[#0071e3]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#1d1d1f] dark:text-white">{label}</p>
              <p className="text-[12px] text-[#86868b]">{description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#86868b] group-hover:text-[#0071e3] shrink-0" strokeWidth={1.5} />
          </Link>
        ))}
      </div>
    </div>
  );
}
