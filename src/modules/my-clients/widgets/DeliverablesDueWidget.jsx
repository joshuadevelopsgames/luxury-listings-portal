/**
 * DeliverablesDueWidget - Dashboard widget showing upcoming deliverables
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { firestoreService } from '../../../services/firestoreService';

const DeliverablesDueWidget = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deliverables, setDeliverables] = useState([]);

  const isAssignedToMe = (client) => {
    const am = (client.assignedManager || '').trim().toLowerCase();
    if (!am) return false;
    const email = (currentUser?.email || '').trim().toLowerCase();
    const uid = (currentUser?.uid || '').trim().toLowerCase();
    return am === email || (uid && am === uid);
  };

  useEffect(() => {
    const loadDeliverables = async () => {
      if (!currentUser?.email && !currentUser?.uid) return;

      try {
        const allClients = await firestoreService.getClients();
        const myClients = allClients.filter(isAssignedToMe);
        
        // Create deliverables from client data
        // In a full implementation, this would come from client_contracts
        const upcomingDeliverables = myClients
          .filter(c => c.postsRemaining > 0)
          .map(client => ({
            id: client.id,
            clientName: client.clientName,
            type: 'Posts',
            remaining: client.postsRemaining,
            dueDate: client.nextDeliveryDate || null,
            status: client.postsRemaining <= 2 ? 'urgent' : 'normal'
          }))
          .slice(0, 5);
        
        setDeliverables(upcomingDeliverables);
      } catch (error) {
        console.error('Error loading deliverables:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDeliverables();
  }, [currentUser?.email, currentUser?.uid]);

  const getStatusStyle = (status) => {
    if (status === 'urgent') {
      return 'text-[#ff3b30] bg-[#ff3b30]/10';
    }
    return 'text-[#34c759] bg-[#34c759]/10';
  };

  if (loading) {
    return (
      <div className="h-[327px] min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 w-full bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-10 w-full bg-black/5 dark:bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[327px] min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff9500] to-[#ff3b30] flex items-center justify-center shadow-lg shadow-[#ff9500]/20">
            <FileText className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">Deliverables Due</h3>
        </div>
      </div>

      {/* Deliverables List */}
      {deliverables.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-[13px] text-[#86868b]">No pending deliverables</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deliverables.map((item) => (
            <div 
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              onClick={() => navigate('/my-clients')}
            >
              <div className="flex items-center gap-3 min-w-0">
                {item.status === 'urgent' && (
                  <AlertCircle className="w-4 h-4 text-[#ff3b30] shrink-0" strokeWidth={1.5} />
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white truncate">
                    {item.clientName}
                  </p>
                  <p className="text-[11px] text-[#86868b]">
                    {item.remaining} {item.type.toLowerCase()} remaining
                  </p>
                </div>
              </div>
              <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${getStatusStyle(item.status)}`}>
                {item.status === 'urgent' ? 'Urgent' : 'On Track'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliverablesDueWidget;
