import React, { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, MapPin, MoreHorizontal, Eye, Edit, RefreshCw } from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';

/**
 * V3 Clients - Real Data from Firestore
 */
const V3Clients = () => {
  const [view, setView] = useState('grid');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const gradients = [
    'from-[#0071e3] to-[#5856d6]',
    'from-[#ff9500] to-[#ff3b30]',
    'from-[#34c759] to-[#30d158]',
    'from-[#af52de] to-[#ff2d55]',
    'from-[#5856d6] to-[#0071e3]',
    'from-[#ff2d55] to-[#ff9500]',
  ];

  // Load clients from Firestore
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsData = await firestoreService.getClients();
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse" />
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
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Clients</h1>
          <p className="text-[17px] text-[#86868b]">Manage your client relationships.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadClients}
            className="h-10 px-4 rounded-full bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
            Refresh
          </button>
          <button className="flex items-center gap-2 h-10 px-5 rounded-full bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">{stats.total}</p>
          <p className="text-[13px] text-[#86868b]">Total Clients</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-[#34c759] tracking-[-0.02em]">{stats.active}</p>
          <p className="text-[13px] text-[#86868b]">Active</p>
        </div>
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <p className="text-[28px] font-semibold text-[#5856d6] tracking-[-0.02em]">{stats.premium}</p>
          <p className="text-[13px] text-[#86868b]">Premium</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-black/5 dark:bg-white/5 border-0 text-[13px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-lg">
          <button
            onClick={() => setView('grid')}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${view === 'grid' ? 'bg-white dark:bg-[#3d3d3d] shadow-sm' : 'text-[#86868b]'}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
            </svg>
          </button>
          <button
            onClick={() => setView('list')}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${view === 'list' ? 'bg-white dark:bg-[#3d3d3d] shadow-sm' : 'text-[#86868b]'}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="p-12 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 text-center">
          <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-[#86868b]" />
          </div>
          <p className="text-[17px] font-medium text-[#1d1d1f] dark:text-white mb-1">
            {searchTerm ? 'No clients found' : 'No clients yet'}
          </p>
          <p className="text-[13px] text-[#86868b]">
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
            const postsTotal = client.packageSize || client.postsTotal || 10;
            
            return (
              <div
                key={client.id}
                className="p-6 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center text-white text-[15px] font-semibold shadow-lg`}>
                      {getInitials(client.clientName)}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{client.clientName || 'Unnamed Client'}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        status === 'Active' ? 'bg-[#34c759]/10 text-[#34c759]' : 
                        status === 'Pending' ? 'bg-[#ff9500]/10 text-[#ff9500]' :
                        status === 'Renewal' ? 'bg-[#ff3b30]/10 text-[#ff3b30]' :
                        'bg-[#86868b]/10 text-[#86868b]'
                      }`}>
                        {status}
                      </span>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                    <MoreHorizontal className="w-[18px] h-[18px] text-[#86868b]" strokeWidth={1.5} />
                  </button>
                </div>

                <div className="space-y-2.5 mb-5">
                  {client.clientEmail && (
                    <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                      <Mail className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{client.clientEmail}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                      <Phone className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {(client.location || client.city) && (
                    <div className="flex items-center gap-3 text-[13px] text-[#86868b]">
                      <MapPin className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span>{client.location || client.city}</span>
                    </div>
                  )}
                </div>

                {/* Package Progress */}
                <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{client.packageType || 'Standard'}</span>
                    <span className="text-[12px] text-[#86868b]">{postsUsed}/{postsTotal}</span>
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
                  <button className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                    View
                  </button>
                  <button className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg bg-[#0071e3] text-[13px] font-medium text-white hover:bg-[#0077ed] transition-colors">
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
