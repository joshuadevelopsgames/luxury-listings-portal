/**
 * ClientOverviewWidget - Dashboard widget showing assigned clients overview
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { firestoreService } from '../../../services/firestoreService';

const ClientOverviewWidget = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);

  const isAssignedToMe = (client) => {
    const am = (client.assignedManager || '').trim().toLowerCase();
    if (!am) return false;
    const email = (currentUser?.email || '').trim().toLowerCase();
    const uid = (currentUser?.uid || '').trim().toLowerCase();
    return am === email || (uid && am === uid);
  };

  useEffect(() => {
    const loadClients = async () => {
      if (!currentUser?.email && !currentUser?.uid) return;

      try {
        const allClients = await firestoreService.getClients();
        const myClients = allClients.filter(isAssignedToMe).slice(0, 4);
        setClients(myClients);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [currentUser?.email, currentUser?.uid]);

  const getHealthStatus = (client) => {
    const postsRemaining = client.postsRemaining || 0;
    const packageSize = client.packageSize || 10;
    const percentage = (postsRemaining / packageSize) * 100;
    
    if (percentage <= 20) return { color: 'bg-[#ff3b30]', label: 'Low' };
    if (percentage <= 50) return { color: 'bg-[#ff9500]', label: 'Medium' };
    return { color: 'bg-[#34c759]', label: 'Good' };
  };

  if (loading) {
    return (
      <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-12 w-full bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-12 w-full bg-black/5 dark:bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
            <Users className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">My Clients</h3>
        </div>
        <button
          onClick={() => navigate('/my-clients')}
          className="text-[13px] text-[#0071e3] hover:text-[#0077ed] font-medium flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Client List */}
      {clients.length === 0 ? (
        <p className="text-[13px] text-[#86868b] text-center py-4">
          No clients assigned to you yet
        </p>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const health = getHealthStatus(client);
            const postsUsed = client.postsUsed || 0;
            const packageSize = client.packageSize || 10;
            const progress = (postsUsed / packageSize) * 100;
            
            return (
              <div 
                key={client.id}
                className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                onClick={() => navigate('/my-clients')}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white truncate">
                    {client.clientName || 'Unnamed Client'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#86868b]">{client.packageType || 'Standard'}</span>
                    <div className={`w-2 h-2 rounded-full ${health.color}`} title={health.label} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0071e3] rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#86868b] whitespace-nowrap">
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
