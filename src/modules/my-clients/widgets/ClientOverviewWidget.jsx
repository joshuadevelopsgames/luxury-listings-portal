/**
 * ClientOverviewWidget - Dashboard widget showing assigned clients overview
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useClients } from '../../../contexts/ClientsContext';
import ClientLink from '../../../components/ui/ClientLink';
import { getPostsRemaining, getPostsUsed } from '../../../utils/clientPostsUtils';

const ClientOverviewWidget = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { clients: allClients, loading } = useClients();

  const isAssignedToMe = (client) => {
    const am = (client.assignedManager || '').trim().toLowerCase();
    const email = (currentUser?.email || '').trim().toLowerCase();
    const uid = currentUser?.uid || '';
    return am === email || (uid && am === uid.toLowerCase());
  };

  const clients = useMemo(
    () => allClients.filter(isAssignedToMe).filter((c) => !c.isInternal).slice(0, 4),
    [allClients, currentUser?.email, currentUser?.uid]
  );

  const getHealthStatus = (client) => {
    const postsRemaining = getPostsRemaining(client);
    const packageSize = client.packageSize || 12;
    const percentage = packageSize ? (postsRemaining / packageSize) * 100 : 0;
    
    if (percentage <= 20) return { color: 'bg-danger', label: 'Low' };
    if (percentage <= 50) return { color: 'bg-warning', label: 'Medium' };
    return { color: 'bg-positive', label: 'Good' };
  };

  if (loading) {
    return (
      <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-surface backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-hairline animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-12 w-full bg-surface-3 rounded" />
          <div className="h-12 w-full bg-surface-3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-surface backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-hairline">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand flex items-center justify-center shadow-lg shadow-brand/20">
            <Users className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-ink">My Clients</h3>
        </div>
        <button
          onClick={() => navigate('/my-clients')}
          className="text-[13px] text-brand hover:text-brand-hover font-medium flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Client List */}
      {clients.length === 0 ? (
        <p className="text-[13px] text-ink-muted text-center py-4">
          No clients assigned to you yet
        </p>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const health = getHealthStatus(client);
            const postsUsed = getPostsUsed(client);
            const packageSize = client.packageSize || 12;
            const progress = packageSize ? (postsUsed / packageSize) * 100 : 0;
            
            return (
              <div 
                key={client.id}
                className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                onClick={() => navigate('/my-clients')}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium truncate">
                    <ClientLink client={client} />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-muted">{client.packageType || 'Standard'}</span>
                    <div className={`w-2 h-2 rounded-full ${health.color}`} title={health.label} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-ink-muted whitespace-nowrap">
                    {postsUsed}/{packageSize}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientOverviewWidget;
