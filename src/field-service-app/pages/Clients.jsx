import React, { useState, useMemo } from 'react';
import { Search, Plus, X } from 'lucide-react';

const summaryCards = [
  { label: 'New leads', period: 'Past 30 days', value: 24, change: -17, changeUp: false },
  { label: 'New clients', period: 'Past 30 days', value: 4, change: 33, changeUp: true },
  { label: 'Total new clients', period: 'Year to date', value: 4 },
];

const sampleClients = [
  { name: 'Jill Flack', address: '259 Coville Close Northeast, Calgary, Alberta T3K 5V8', tags: [], status: 'Active', lastActivity: '3 minutes ago' },
  { name: 'Gio Cardone', address: '5 Strathridge Way Southwest, Calgary, Alberta T3H 3S3', tags: [], status: 'Active', lastActivity: '9:55 AM' },
  { name: 'Kerwuin Arrieta', address: '353 Panora Way Northwest, Calgary, Alberta T3P 1E5', tags: [], status: 'Lead', lastActivity: '9:47 AM' },
  { name: 'Aditya Kohli', address: '353 Masters Avenue Southeast, Calgary, Alberta T3M 2N7', tags: [], status: 'Lead', lastActivity: 'Mon' },
  { name: 'Audra Rawlinson-Ford', address: '7411 202 Avenue Southeast, Calgary, Alberta T3S 0E8', tags: [], status: 'Lead', lastActivity: 'Mon' },
  { name: 'Danny Schuler', address: '22 McIntyre Place, Langdon, Alberta T0J 1X2', tags: [], status: 'Lead', lastActivity: 'Mon' },
  { name: 'Abbie Wilcox', address: '15 Maple Place, Strathmore, Alberta T1P 1G5', tags: [], status: 'Lead', lastActivity: 'Mon' },
  { name: 'Crestridge Landng', address: '62 Crestridge Landng Southwest, Calgary, Alberta', tags: [], status: 'Lead', lastActivity: 'Mon' },
];

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Leads and Active');
  const [dismissQB, setDismissQB] = useState(false);

  const filtered = useMemo(() => {
    let list = sampleClients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q));
    }
    return list;
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#1d1d1f] dark:text-white tracking-tight">Clients</h1>
        <button
          onClick={() => {}}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-[#34c759] hover:bg-[#30b350] text-white text-[14px] font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New Client
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 p-4 shadow-sm"
          >
            <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">{card.period}</p>
            <p className="text-[13px] text-[#1d1d1f] dark:text-white font-medium mt-0.5">{card.label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-[#1d1d1f] dark:text-white">{card.value}</span>
              {card.change != null && (
                <span className={`text-[13px] font-medium ${card.changeUp ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
                  {card.changeUp ? '↑' : '↓'} {Math.abs(card.change)}%
                </span>
              )}
            </div>
          </div>
        ))}
        {!dismissQB && (
          <div className="rounded-xl bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 p-4 shadow-sm relative flex flex-col justify-between min-h-[120px]">
            <div className="flex justify-between items-start gap-2">
              <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white pr-6">
                Sync clients and eliminate double-entry with QuickBooks Online
              </p>
              <button onClick={() => setDismissQB(true)} className="absolute top-3 right-3 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[#86868b]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-[#86868b] font-medium">QuickBooks Online</span>
              <button className="text-[13px] font-semibold text-[#0071e3] hover:underline">Sync now</button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white mb-4">
          Filtered clients ({filtered.length} results)
        </h2>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-[13px] text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5">
            <Plus className="w-3.5 h-3.5" /> Filter by tag
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'Leads and Active' ? 'All' : 'Leads and Active')}
            className="inline-flex items-center h-9 px-3 rounded-lg bg-gray-100 dark:bg-white/10 text-[13px] font-medium text-[#1d1d1f] dark:text-white"
          >
            Status | {statusFilter}
          </button>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 text-[13px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c1e] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Address</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Tags</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => {}}
                  >
                    <td className="px-4 py-3 text-[13px] font-medium text-[#1d1d1f] dark:text-white">{client.name}</td>
                    <td className="px-4 py-3 text-[13px] text-[#86868b] max-w-[280px] truncate">{client.address}</td>
                    <td className="px-4 py-3 text-[13px] text-[#86868b]">{client.tags.length ? client.tags.join(', ') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[13px]">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            client.status === 'Active' ? 'bg-[#34c759]' : 'bg-[#0071e3]'
                          }`}
                        />
                        {client.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#86868b]">{client.lastActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
