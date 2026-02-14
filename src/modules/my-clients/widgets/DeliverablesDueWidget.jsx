/**
 * DeliverablesDueWidget - Dashboard widget showing upcoming deliverables
 */

import React, { useMemo, useState } from 'react';
import { FileText, AlertCircle, Pencil } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useClients } from '../../../contexts/ClientsContext';
import ClientDetailModal from '../../../components/client/ClientDetailModal';
import { useOpenClientCard } from '../../../hooks/useOpenClientCard';
import EditPostsLoggedModal from '../../../components/ui/EditPostsLoggedModal';
import { firestoreService } from '../../../services/firestoreService';
import { getPostsRemaining } from '../../../utils/clientPostsUtils';

const DeliverablesDueWidget = () => {
  const { currentUser } = useAuth();
  const { clients: allClients, loading: clientsLoading } = useClients();
  const { clientForModal, openClientCard, closeClientCard } = useOpenClientCard();
  const [employees, setEmployees] = useState([]);
  const [editClient, setEditClient] = useState(null);

  React.useEffect(() => {
    if (clientForModal && employees.length === 0) {
      firestoreService.getApprovedUsers().then(setEmployees).catch(() => {});
    }
  }, [clientForModal]);

  const isAssignedToMe = (client) => {
    const am = (client.assignedManager || '').trim().toLowerCase();
    const email = (currentUser?.email || '').trim().toLowerCase();
    const uid = currentUser?.uid || '';
    return am === email || (uid && am === uid.toLowerCase());
  };

  const myClients = useMemo(
    () => allClients.filter(isAssignedToMe).filter((c) => !c.isInternal),
    [allClients, currentUser?.email, currentUser?.uid]
  );

  const deliverables = useMemo(
    () =>
      myClients
        .filter(c => getPostsRemaining(c) > 0)
        .map(client => {
          const remaining = getPostsRemaining(client);
          return {
            id: client.id,
            clientName: client.clientName,
            type: 'Posts',
            remaining,
            dueDate: client.nextDeliveryDate || null,
            status: remaining <= 2 ? 'urgent' : 'normal'
          };
        })
        .slice(0, 5),
    [myClients]
  );

  const loadingWidget = clientsLoading;

  const getStatusStyle = (status) => {
    if (status === 'urgent') {
      return 'text-[#ff3b30] bg-[#ff3b30]/10';
    }
    return 'text-[#34c759] bg-[#34c759]/10';
  };

  if (loadingWidget) {
    return (
      <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 w-full bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-10 w-full bg-black/5 dark:bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10">
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
          {deliverables.map((item) => {
            const fullClient = myClients.find(c => c.id === item.id);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
              >
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => fullClient && openClientCard(fullClient)}
                >
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${getStatusStyle(item.status)}`}>
                    {item.status === 'urgent' ? 'Urgent' : 'On Track'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (fullClient) setEditClient(fullClient); }}
                    className="p-2 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                    title="Edit posts logged"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {clientForModal && (
        <ClientDetailModal
          client={clientForModal}
          onClose={closeClientCard}
          onClientUpdate={() => {}}
          employees={employees}
          showManagerAssignment={true}
        />
      )}
      {editClient && (
        <EditPostsLoggedModal
          client={editClient}
          onClose={() => setEditClient(null)}
          onSaved={() => setEditClient(null)}
        />
      )}
    </div>
  );
};

export default DeliverablesDueWidget;
