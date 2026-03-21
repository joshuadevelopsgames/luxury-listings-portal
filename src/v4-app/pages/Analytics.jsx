import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, Heart, Eye, MousePointerClick, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';

function StatCard({ label, value, icon, trend, trendLabel }) {
  const up = trend > 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  return (
    <div className="bg-white border border-[#e5e5ea] rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-[#86868b]">{label}</p>
        <span className="text-[#86868b]">{icon}</span>
      </div>
      <p className="text-[28px] font-bold text-[#1d1d1f] leading-none">{value}</p>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-[12px] font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
          <TrendIcon size={13} />
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function ReportRow({ report }) {
  const m = report.metrics ?? {};
  const followersChange = (m.followers_end ?? 0) - (m.followers_start ?? 0);
  const followersUp = followersChange >= 0;

  return (
    <tr className="border-b border-[#f5f5f7] hover:bg-[#f9f9f9] transition-colors">
      <td className="px-4 py-3 text-[13px] font-medium text-[#1d1d1f]">
        {report.client?.name ?? '—'}
      </td>
      <td className="px-4 py-3 text-[12px] text-[#86868b]">
        {format(parseISO(report.period_start), 'MMM d')}–{format(parseISO(report.period_end), 'MMM d, yyyy')}
      </td>
      <td className="px-4 py-3 text-[13px] text-center">
        <span className={`font-semibold ${followersUp ? 'text-green-600' : 'text-red-500'}`}>
          {followersUp ? '+' : ''}{followersChange.toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3 text-[13px] text-center text-[#1d1d1f]">{(m.reach ?? 0).toLocaleString()}</td>
      <td className="px-4 py-3 text-[13px] text-center text-[#1d1d1f]">{(m.impressions ?? 0).toLocaleString()}</td>
      <td className="px-4 py-3 text-[13px] text-center text-[#1d1d1f]">
        {m.reach ? ((((m.likes ?? 0) + (m.comments ?? 0) + (m.saves ?? 0)) / m.reach) * 100).toFixed(2) + '%' : '—'}
      </td>
      <td className="px-4 py-3 text-[13px] text-center text-[#1d1d1f]">{(m.profile_views ?? 0).toLocaleString()}</td>
    </tr>
  );
}

export default function Analytics() {
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      const [{ data: r }, { data: c }] = await Promise.all([
        supabase
          .from('instagram_reports')
          .select('*, client:clients(id, name)')
          .eq('archived', false)
          .order('period_start', { ascending: false })
          .limit(100),
        supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
      ]);
      setReports(r ?? []);
      setClients(c ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = clientFilter ? reports.filter(r => r.client_id === clientFilter) : reports;

  // Aggregate totals
  const totals = filtered.reduce((acc, r) => {
    const m = r.metrics ?? {};
    return {
      reach: acc.reach + (m.reach ?? 0),
      impressions: acc.impressions + (m.impressions ?? 0),
      likes: acc.likes + (m.likes ?? 0),
      comments: acc.comments + (m.comments ?? 0),
      saves: acc.saves + (m.saves ?? 0),
      profile_views: acc.profile_views + (m.profile_views ?? 0),
      follower_gain: acc.follower_gain + ((m.followers_end ?? 0) - (m.followers_start ?? 0)),
    };
  }, { reach: 0, impressions: 0, likes: 0, comments: 0, saves: 0, profile_views: 0, follower_gain: 0 });

  const avgEngagement = totals.reach > 0
    ? (((totals.likes + totals.comments + totals.saves) / totals.reach) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1d1d1f]">Analytics</h1>
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-[#86868b]" />
          <span className="text-[12px] text-[#86868b]">{filtered.length} report{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Client filter */}
      <div className="flex items-center gap-3">
        <label className="text-[13px] font-medium text-[#86868b]">Client:</label>
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="border border-[#d2d2d7] rounded-lg px-3 py-1.5 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Follower Growth" value={`${totals.follower_gain >= 0 ? '+' : ''}${totals.follower_gain.toLocaleString()}`} icon={<Users size={16} />} />
        <StatCard label="Total Reach" value={totals.reach.toLocaleString()} icon={<Eye size={16} />} />
        <StatCard label="Impressions" value={totals.impressions.toLocaleString()} icon={<MousePointerClick size={16} />} />
        <StatCard label="Avg Engagement" value={`${avgEngagement}%`} icon={<Heart size={16} />} />
        <StatCard label="Profile Views" value={totals.profile_views.toLocaleString()} icon={<Eye size={16} />} />
        <StatCard label="Total Likes" value={totals.likes.toLocaleString()} icon={<Heart size={16} />} />
        <StatCard label="Total Comments" value={totals.comments.toLocaleString()} icon={<Heart size={16} />} />
        <StatCard label="Total Saves" value={totals.saves.toLocaleString()} icon={<Heart size={16} />} />
      </div>

      {/* Reports table */}
      <div className="border border-[#e5e5ea] rounded-2xl overflow-hidden bg-white">
        <div className="px-5 py-3.5 border-b border-[#f5f5f7]">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">Report Breakdown</p>
        </div>
        {loading ? (
          <p className="px-5 py-6 text-[14px] text-[#86868b]">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[14px] text-[#86868b]">No reports found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f5f5f7] text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5">Period</th>
                  <th className="px-4 py-2.5 text-center">Followers</th>
                  <th className="px-4 py-2.5 text-center">Reach</th>
                  <th className="px-4 py-2.5 text-center">Impressions</th>
                  <th className="px-4 py-2.5 text-center">Engagement</th>
                  <th className="px-4 py-2.5 text-center">Profile Views</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => <ReportRow key={r.id} report={r} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
