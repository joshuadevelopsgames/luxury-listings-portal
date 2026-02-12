import React, { useState, useEffect } from 'react';
import { Mail, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { addContactToCRM, CLIENT_TYPE } from '../services/crmService';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const PendingClients = () => {
  const { confirm } = useConfirm();
  const [pendingClients, setPendingClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    loadPendingClients();
    
    // Set up real-time listener
    const unsubscribe = firestoreService.onPendingClientsChange((clients) => {
      setPendingClients(clients);
    });

    return () => unsubscribe();
  }, []);

  const loadPendingClients = async () => {
    try {
      setLoading(true);
      const clients = await firestoreService.getPendingClients();
      setPendingClients(clients);
    } catch (error) {
      console.error('Error loading pending clients:', error);
      toast.error('Failed to load pending clients');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (pendingClient) => {
    const confirmed = await confirm({
      title: 'Approve Client',
      message: `Approve ${pendingClient.email} and add them as a client?`,
      confirmText: 'Approve',
      variant: 'default'
    });
    if (!confirmed) {
      return;
    }

    try {
      setProcessing({ ...processing, [pendingClient.id]: true });
      
      // Create client data
      const clientData = {
        clientName: pendingClient.clientName || pendingClient.email.split('@')[0],
        clientEmail: pendingClient.email,
        packageType: 'Standard',
        packageSize: 1,
        postsUsed: 0,
        postsRemaining: 1,
        postedOn: 'Luxury Listings',
        paymentStatus: 'Pending',
        approvalStatus: 'Approved',
        notes: `Approved from pending sign-up on ${format(new Date(), 'MMM d, yyyy')}`,
        startDate: new Date().toISOString().split('T')[0],
        lastContact: new Date().toISOString().split('T')[0],
        customPrice: 0,
        overduePosts: 0
      };

      await firestoreService.addClient(clientData);
      await firestoreService.removePendingClient(pendingClient.id);
      await addContactToCRM({
        clientName: clientData.clientName,
        clientEmail: clientData.clientEmail,
        type: CLIENT_TYPE.NA,
        notes: clientData.notes
      }, 'warmLeads');

      toast.success(`${pendingClient.email} approved and added as client!`);
    } catch (error) {
      console.error('Error approving client:', error);
      toast.error('Failed to approve client: ' + error.message);
    } finally {
      setProcessing({ ...processing, [pendingClient.id]: false });
    }
  };

  const handleReject = async (pendingClient) => {
    const confirmed = await confirm({
      title: 'Reject Client',
      message: `Reject ${pendingClient.email}? They will need to contact support to sign up again.`,
      confirmText: 'Reject',
      variant: 'danger'
    });
    if (!confirmed) {
      return;
    }

    try {
      setProcessing({ ...processing, [pendingClient.id]: true });
      await firestoreService.removePendingClient(pendingClient.id);
      toast.success(`${pendingClient.email} removed from pending list`);
    } catch (error) {
      console.error('Error rejecting client:', error);
      toast.error('Failed to reject client: ' + error.message);
    } finally {
      setProcessing({ ...processing, [pendingClient.id]: false });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[14px] text-[#86868b]">Loading pending clients...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingClients.length === 0 ? (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-12 text-center">
          <Clock className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">No pending clients</h3>
          <p className="text-[14px] text-[#86868b]">
            Clients who sign up will appear here for approval
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingClients.map((client) => (
            <div 
              key={client.id} 
              className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#ff9500] to-[#ff3b30] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-lg">
                      {client.clientName ? client.clientName.charAt(0).toUpperCase() : client.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white truncate">
                      {client.clientName || client.email.split('@')[0]}
                    </p>
                    <p className="text-[12px] text-[#86868b] truncate">{client.email}</p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-md bg-[#ff9500]/10 text-[#ff9500] font-medium flex-shrink-0">
                  Pending
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                  <div className="h-5 w-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                    <Mail className="w-3 h-3" />
                  </div>
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                  <div className="h-5 w-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                    <Calendar className="w-3 h-3" />
                  </div>
                  <span>Signed up {format(new Date(client.createdAt?.toDate() || client.createdAt || Date.now()), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-black/5 dark:border-white/10">
                <button
                  onClick={() => handleApprove(client)}
                  disabled={processing[client.id]}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#34c759] text-white text-[13px] font-medium hover:bg-[#30d158] transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {processing[client.id] ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(client)}
                  disabled={processing[client.id]}
                  className="p-2.5 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingClients;

