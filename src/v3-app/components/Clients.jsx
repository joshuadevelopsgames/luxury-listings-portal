import React, { useState } from 'react';
import { Plus, Search, Mail, Phone, MapPin, MoreHorizontal, Eye, Edit } from 'lucide-react';
import { useClients } from '../../contexts/ClientsContext';
import ClientLink from '../../components/ui/ClientLink';

/**
 * V3 Clients - Real Data from Firestore (via ClientsContext for live updates)
 */
const V3Clients = () => {
  const [view, setView] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const { clients, loading } = useClients();

  const gradients = [
    'from-brand to-brand',
    'from-warning to-danger',
    'from-positive to-positive',
    'from-brand to-[#ff2d55]',
    'from-brand to-brand',
    'from-[#ff2d55] to-warning',
  ];

  // Filter clients based on search
  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.clientName?.toLowerCase().includes(searchLower) ||
      client.clientEmail?.toLowerCase().includes(searchLower) ||
      client.packageType?.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate stats
  const stats = {
    total: clients.length,
    active: clients.filter(c => c.approvalStatus === 'Approved' || c.status === 'Active').length,
    premium: clients.filter(c => c.packageType?.toLowerCase() === 'premium').length,
  };

  // Get client initials for avatar
  const getInitials = (name) => {
    if (!name) return 'C';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get status display
  const getStatus = (client) => {
    if (client.approvalStatus === 'Approved' || client.status === 'Active') return 'Active';
    if (client.approvalStatus === 'Pending') return 'Pending';
    if (client.postsRemaining === 0) return 'Renewal';
    return client.approvalStatus || client.status || 'Active';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-surface-3 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-3 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-surface-3 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-ink tracking-[-0.02em] mb-1">Clients</h1>
          <p className="text-[17px] text-ink-muted">Manage your client relationships.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 h-10 px-5 rounded-full bg-brand text-white text-[13px] font-medium shadow-lg shadow-brand/25 hover:bg-brand-hover active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-ink tracking-[-0.02em]">{stats.total}</p>
          <p className="text-[13px] text-ink-muted">Total Clients</p>
        </div>
        <div className="p-4 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-positive tracking-[-0.02em]">{stats.active}</p>
          <p className="text-[13px] text-ink-muted">Active</p>
        </div>
        <div className="p-4 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-brand tracking-[-0.02em]">{stats.premium}</p>
          <p className="text-[13px] text-ink-muted">Premium</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-surface border border-hairline-strong text-[13px] text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-surface-3 rounded-lg">
          <button
            onClick={() => setView('grid')}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${view === 'grid' ? 'bg-white dark:bg-[#3d3d3d] shadow-sm' : 'text-ink-muted'}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
            </svg>
          </button>
          <button
            onClick={() => setView('list')}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${view === 'list' ? 'bg-white dark:bg-[#3d3d3d] shadow-sm' : 'text-ink-muted'}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="p-12 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-ink-muted" />
          </div>
          <p className="text-[17px] font-medium text-ink mb-1">
            {searchTerm ? 'No clients found' : 'No clients yet'}
          </p>
          <p className="text-[13px] text-ink-muted">
            {searchTerm ? 'Try adjusting your search' : 'Add clients to get started'}
          </p>
        </div>
      )}

      {/* Client Grid */}
      {filteredClients.length > 0 && (
        <div className={`grid gap-5 ${view === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredClients.map((client, idx) => {
            const status = getStatus(client);
            const postsUsed = client.postsUsed || 0;
            const postsTotal = client.packageSize || client.postsTotal || 12;
            
            return (
              <div
                key={client.id}
                className="p-6 rounded-xl bg-white/80 dark:bg-surface backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center text-white text-[15px] font-semibold shadow-lg`}>
                      {getInitials(client.clientName)}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold">
                        <ClientLink client={client} showId />
                      </h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        status === 'Active' ? 'bg-positive/10 text-positive' : 
                        status === 'Pending' ? 'bg-warning/10 text-warning' :
                        status === 'Renewal' ? 'bg-danger/10 text-danger' :
                        'bg-ink-muted/10 text-ink-muted'
                      }`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-surface-3 transition-all">
                    <MoreHorizontal className="w-[18px] h-[18px] text-ink-muted" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="space-y-2.5 mb-5">
                  {client.clientEmail && (
                    <div className="flex items-center gap-3 text-[13px] text-ink-muted">
                      <Mail className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{client.clientEmail}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-3 text-[13px] text-ink-muted">
                      <Phone className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {(client.location || client.city) && (
                    <div className="flex items-center gap-3 text-[13px] text-ink-muted">
                      <MapPin className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span>{client.location || client.city}</span>
                    </div>
                  )}
                </div>

                {/* Package Progress */}
                <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium text-ink">{client.packageType || 'Standard'}</span>
                    <span className="text-[12px] text-ink-muted">{postsUsed}/{postsTotal}</span>
                  </div>
                  <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${gradients[idx % gradients.length]}`}
                      style={{ width: `${Math.min((postsUsed / postsTotal) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-5 pt-5 border-t border-black/5 dark:border-white/5">
                  <button className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg bg-surface-3 text-[13px] font-medium text-ink hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                    View
                  </button>
                  <button className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg bg-brand text-[13px] font-medium text-white hover:bg-brand-hover transition-colors">
                    <Edit className="w-4 h-4" strokeWidth={1.5} />
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default V3Clients;
