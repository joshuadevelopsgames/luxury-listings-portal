import React, { useState, useEffect, useMemo } from 'react';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { BarChart3, ChevronDown, ChevronUp, Users, ArrowRight, Camera } from 'lucide-react';
import PlatformIcons, { PLATFORMS } from '../components/PlatformIcons';
import ClientLink from '../components/ui/ClientLink';

// Workload: 1 base unit per client + (posts per month / 10). More posts + more platforms = more work.
const WORKLOAD_FULL = 40; // bar is 100% at this many units
const WORKLOAD_LOW = 15;  // Light
const WORKLOAD_MED = 28; // Moderate

function getWorkloadUnits(clients) {
  return clients.reduce((sum, c) => {
    const posts = Number(c.packageSize) || 0;
    const platformCount = c.platforms ? Object.values(c.platforms).filter(Boolean).length : 0;
    const base = 1;
    const postUnits = posts / 10;
    const platformBonus = platformCount > 2 ? 0.2 : 0; // extra complexity for 3+ platforms
    return sum + base + postUnits + platformBonus;
  }, 0);
}

function getCapacityColor(workloadUnits) {
  if (workloadUnits <= WORKLOAD_LOW) return { bar: 'bg-[#34c759]', text: 'text-[#34c759]', label: 'Light' };
  if (workloadUnits <= WORKLOAD_MED) return { bar: 'bg-[#ff9500]', text: 'text-[#ff9500]', label: 'Moderate' };
  return { bar: 'bg-[#ff3b30]', text: 'text-[#ff3b30]', label: 'Heavy' };
}

function getCapacityPercent(workloadUnits) {
  return Math.min(100, Math.round((workloadUnits / WORKLOAD_FULL) * 100));
}

// Aggregate platform counts across a list of clients
function aggregatePlatforms(clients) {
  const counts = {};
  PLATFORMS.forEach(({ key }) => { counts[key] = 0; });
  clients.forEach(client => {
    if (client.platforms) {
      Object.entries(client.platforms).forEach(([key, val]) => {
        if (val) counts[key] = (counts[key] || 0) + 1;
      });
    }
  });
  return counts;
}

// Aggregate package type counts
function aggregatePackages(clients) {
  const counts = {};
  clients.forEach(c => {
    const pkg = c.packageType || 'Unknown';
    counts[pkg] = (counts[pkg] || 0) + 1;
  });
  return counts;
}

export default function WorkloadPage() {
  const { isSystemAdmin } = usePermissions();
  const { currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedManager, setExpandedManager] = useState(null);
  const [reassigning, setReassigning] = useState(null); // { clientId, currentManager }

  // Fetch data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [clientsData, usersData] = await Promise.all([
          firestoreService.getClients(),
          firestoreService.getApprovedUsers()
        ]);
        if (mounted) {
          setClients(clientsData);
          setApprovedUsers(usersData);
        }
      } catch (err) {
        console.error('Error loading workload data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Get managers (social_media_manager role or anyone with assigned clients)
  const managers = useMemo(() => {
    const managerEmails = new Set();

    // Add all social media managers from approved users
    approvedUsers.forEach(u => {
      if (u.role === 'social_media_manager' || u.roles?.includes('social_media_manager')) {
        managerEmails.add(u.email?.toLowerCase());
      }
    });

    // Also add anyone who has clients assigned (they might have a different role)
    clients.forEach(c => {
      if (c.assignedManager) {
        managerEmails.add(c.assignedManager.toLowerCase());
      }
    });

    // Build manager objects
    return [...managerEmails].map(email => {
      const user = approvedUsers.find(u => u.email?.toLowerCase() === email);
      return {
        email,
        displayName: user?.displayName || user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : email,
        avatar: user?.avatar || user?.photoURL || null,
        firstName: user?.firstName || email.split('@')[0],
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [approvedUsers, clients]);

  // Group clients by manager
  const clientsByManager = useMemo(() => {
    const grouped = {};
    managers.forEach(m => { grouped[m.email] = []; });
    grouped['unassigned'] = [];

    clients.forEach(client => {
      const am = client.assignedManager?.toLowerCase();
      if (am && grouped[am]) {
        grouped[am].push(client);
      } else if (am) {
        // Manager exists but wasn't in our managers list — add them
        if (!grouped[am]) grouped[am] = [];
        grouped[am].push(client);
      } else {
        grouped['unassigned'].push(client);
      }
    });
    return grouped;
  }, [clients, managers]);

  // Handle reassignment
  const handleReassign = async (clientId, newManagerEmail) => {
    try {
      await firestoreService.updateClient(clientId, { assignedManager: newManagerEmail || null });
      setClients(prev => prev.map(c =>
        c.id === clientId ? { ...c, assignedManager: newManagerEmail || null } : c
      ));
      setReassigning(null);
    } catch (err) {
      console.error('Reassignment failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Team Workload</h1>
          <p className="text-[15px] text-[#86868b]">Workload by clients, posts per month, and platforms — not just client count</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-black/5 dark:border-white/10 animate-pulse">
              <div className="h-6 bg-black/5 dark:bg-white/10 rounded-lg w-32 mb-4" />
              <div className="h-4 bg-black/5 dark:bg-white/10 rounded-lg w-20 mb-2" />
              <div className="h-3 bg-black/5 dark:bg-white/10 rounded-full w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalClients = clients.length;
  const assignedCount = clients.filter(c => c.assignedManager).length;
  const unassignedCount = totalClients - assignedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Team Workload</h1>
        <p className="text-[15px] text-[#86868b]">Workload by clients, posts per month, and platforms — not just client count</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={totalClients} icon={<Users className="w-4 h-4 text-[#0071e3]" strokeWidth={1.5} />} />
        <StatCard label="Account Managers" value={managers.length} icon={<Users className="w-4 h-4 text-[#5856d6]" strokeWidth={1.5} />} color="#5856d6" />
        <StatCard label="Assigned" value={assignedCount} icon={<BarChart3 className="w-4 h-4 text-[#34c759]" strokeWidth={1.5} />} color="#34c759" />
        <StatCard
          label="Unassigned"
          value={unassignedCount}
          icon={<BarChart3 className="w-4 h-4 text-[#ff3b30]" strokeWidth={1.5} />}
          color="#ff3b30"
          highlight={unassignedCount > 0}
        />
      </div>

      {/* Manager Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {managers.map(manager => {
          const managerClients = clientsByManager[manager.email] || [];
          const count = managerClients.length;
          const workloadUnits = getWorkloadUnits(managerClients);
          const capacity = getCapacityColor(workloadUnits);
          const pct = getCapacityPercent(workloadUnits);
          const platformCounts = aggregatePlatforms(managerClients);
          const packageCounts = aggregatePackages(managerClients);
          const totalPostsPerMonth = managerClients.reduce((sum, c) => sum + (Number(c.packageSize) || 0), 0);
          const isExpanded = expandedManager === manager.email;

          return (
            <div key={manager.email} className={`bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border transition-all ${isExpanded ? 'border-[#0071e3]/30 shadow-lg md:col-span-2 lg:col-span-3' : 'border-black/5 dark:border-white/10 hover:shadow-md'}`}>
              {/* Manager Header */}
              <button
                onClick={() => setExpandedManager(isExpanded ? null : manager.email)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white text-sm font-semibold">
                      {manager.avatar && typeof manager.avatar === 'string' && manager.avatar.startsWith('http') ? (
                        <img src={manager.avatar} alt="" className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        manager.firstName?.charAt(0)?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{manager.displayName}</h3>
                      <p className="text-[12px] text-[#86868b]">{count} client{count !== 1 ? 's' : ''} · {totalPostsPerMonth} posts/mo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-medium ${capacity.text}`}>{capacity.label}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#86868b]" /> : <ChevronDown className="w-4 h-4 text-[#86868b]" />}
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all ${capacity.bar}`} style={{ width: `${pct}%` }} />
                </div>

                {/* Quick Stats Row */}
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Platform summary */}
                  <div className="flex items-center gap-1">
                    {PLATFORMS.filter(p => platformCounts[p.key] > 0).map(({ key, Icon }) => (
                      <span key={key} className="flex items-center gap-0.5" title={`${platformCounts[key]} ${key}`}>
                        <Icon size={14} />
                        <span className="text-[11px] font-medium text-[#86868b]">{platformCounts[key]}</span>
                      </span>
                    ))}
                  </div>

                  {/* Package breakdown */}
                  <div className="flex items-center gap-1 ml-auto">
                    {Object.entries(packageCounts).map(([pkg, cnt]) => (
                      <span key={pkg} className="px-1.5 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.06] text-[10px] font-medium text-[#86868b]">
                        {cnt} {pkg}
                      </span>
                    ))}
                  </div>
                </div>
              </button>

              {/* Expanded Client List */}
              {isExpanded && (
                <div className="border-t border-black/5 dark:border-white/10 p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {managerClients.map(client => (
                      <ClientCard
                        key={client.id}
                        client={client}
                        isAdmin={isSystemAdmin}
                        managers={managers}
                        onReassign={handleReassign}
                        reassigning={reassigning}
                        setReassigning={setReassigning}
                      />
                    ))}
                    {managerClients.length === 0 && (
                      <p className="text-[13px] text-[#86868b] col-span-full text-center py-8">No clients assigned</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned Card */}
        {(clientsByManager['unassigned'] || []).length > 0 && (
          <div className={`bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border transition-all ${expandedManager === 'unassigned' ? 'border-[#ff3b30]/30 shadow-lg md:col-span-2 lg:col-span-3' : 'border-[#ff3b30]/20 hover:shadow-md'}`}>
            <button
              onClick={() => setExpandedManager(expandedManager === 'unassigned' ? null : 'unassigned')}
              className="w-full p-5 text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#ff3b30]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#ff3b30]">Unassigned</h3>
                    <p className="text-[12px] text-[#86868b]">{clientsByManager['unassigned'].length} client{clientsByManager['unassigned'].length !== 1 ? 's' : ''} need a manager</p>
                  </div>
                </div>
                {expandedManager === 'unassigned' ? <ChevronUp className="w-4 h-4 text-[#86868b]" /> : <ChevronDown className="w-4 h-4 text-[#86868b]" />}
              </div>
            </button>
            {expandedManager === 'unassigned' && (
              <div className="border-t border-black/5 dark:border-white/10 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {clientsByManager['unassigned'].map(client => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      isAdmin={isSystemAdmin}
                      managers={managers}
                      onReassign={handleReassign}
                      reassigning={reassigning}
                      setReassigning={setReassigning}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat card component
function StatCard({ label, value, icon, color = '#0071e3', highlight = false }) {
  return (
    <div className={`bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border ${highlight ? 'border-[#ff3b30]/20' : 'border-black/5 dark:border-white/10'}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
          {icon}
        </div>
      </div>
      <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">{value}</p>
      <p className="text-[13px] text-[#86868b]">{label}</p>
    </div>
  );
}

// Individual client card in expanded view
function ClientCard({ client, isAdmin, managers, onReassign, reassigning, setReassigning }) {
  const isReassigning = reassigning === client.id;

  return (
    <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl p-4 border border-black/5 dark:border-white/5">
      {/* Client header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0">
          {client.profilePhoto ? (
            <img src={client.profilePhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#86868b] text-sm font-semibold">
              {client.clientName?.charAt(0)?.toUpperCase() || 'C'}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-[14px] font-semibold truncate">
            <ClientLink client={client} showId />
          </h4>
          {client.brokerage && (
            <p className="text-[11px] text-[#86868b] truncate">{client.brokerage}</p>
          )}
        </div>
      </div>

      {/* Platforms */}
      {client.platforms && Object.values(client.platforms).some(Boolean) && (
        <div className="mb-3">
          <PlatformIcons platforms={client.platforms} compact size={14} />
        </div>
      )}

      {/* Package info */}
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 rounded-lg bg-[#0071e3]/10 text-[11px] font-medium text-[#0071e3]">
          {client.packageType || 'Standard'}
        </span>
        <span className="text-[11px] text-[#86868b]">
          {client.packageSize || 0} posts/mo
        </span>
      </div>

      {/* Admin-only: price */}
      {isAdmin && client.customPrice > 0 && (
        <p className="text-[12px] font-medium text-[#34c759] mb-2">
          ${Number(client.customPrice).toLocaleString()}/mo
        </p>
      )}

      {/* Reassign */}
      {isReassigning ? (
        <div className="mt-2">
          <select
            className="w-full px-2 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-[12px] text-[#1d1d1f] dark:text-white"
            defaultValue=""
            onChange={(e) => onReassign(client.id, e.target.value)}
          >
            <option value="" disabled>Assign to...</option>
            <option value="">Unassign</option>
            {managers.map(m => (
              <option key={m.email} value={m.email}>{m.displayName}</option>
            ))}
          </select>
          <button onClick={() => setReassigning(null)} className="text-[11px] text-[#86868b] mt-1 hover:text-[#1d1d1f] dark:hover:text-white">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setReassigning(client.id)}
          className="flex items-center gap-1 text-[11px] text-[#0071e3] hover:text-[#0071e3]/80 mt-1"
        >
          <ArrowRight className="w-3 h-3" />
          Reassign
        </button>
      )}
    </div>
  );
}
