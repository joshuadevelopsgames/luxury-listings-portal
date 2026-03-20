import React, { useEffect, useState } from 'react';
import { clientsService } from '../services/clientsService';
import { Search, Plus, AlertCircle, CheckCircle, Activity } from 'lucide-react';

const HEALTH_BADGE = {
  healthy: { label: 'Healthy', color: 'bg-green-50 text-green-700', icon: CheckCircle },
  at_risk: { label: 'At Risk', color: 'bg-red-50 text-red-700', icon: AlertCircle },
  monitor: { label: 'Monitor', color: 'bg-yellow-50 text-yellow-700', icon: Activity },
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    clientsService.getAll()
      .then(setClients)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1d1d1f]">Clients</h1>
        <button className="flex items-center gap-2 px-4 h-9 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-colors">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients…"
          className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-200 bg-white text-[13px] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] transition-colors"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const health = HEALTH_BADGE[client.health_status] || HEALTH_BADGE.monitor;
            const Icon = health.icon;
            return (
              <div key={client.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-[#0071e3]/30 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#1d1d1f] truncate">{client.name}</p>
                    <p className="text-[12px] text-[#86868b] mt-0.5 truncate">{client.account_manager?.full_name || 'Unassigned'}</p>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ${health.color}`}>
                    <Icon className="w-3 h-3" />
                    {health.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-4 text-[12px] text-[#86868b]">
                  <span>{client.platform || 'Instagram'}</span>
                  <span>·</span>
                  <span>{client.posts_per_month || '—'} posts/mo</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
