import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Mail, Clock, CheckCircle, XCircle, User, Calendar } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

const PendingClients = () => {
  const { currentUser } = useAuth();
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
    if (!window.confirm(`Approve ${pendingClient.email} and add them as a client?`)) {
      return;
    }

    try {
      setProcessing({ ...processing, [pendingClient.id]: true });
      
      // Create client data
      const clientData = {
        clientName: pendingClient.clientName || pendingClient.email.split('@')[0],
        clientEmail: pendingClient.email,
        packageType: 'Standard', // Default, can be changed later
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

      // Add to clients collection
      await firestoreService.addClient(clientData);
      
      // Remove from pending clients
      await firestoreService.removePendingClient(pendingClient.id);
      
      toast.success(`✅ ${pendingClient.email} approved and added as client!`);
    } catch (error) {
      console.error('Error approving client:', error);
      toast.error('Failed to approve client: ' + error.message);
    } finally {
      setProcessing({ ...processing, [pendingClient.id]: false });
    }
  };

  const handleReject = async (pendingClient) => {
    if (!window.confirm(`Reject ${pendingClient.email}? They will need to contact support to sign up again.`)) {
      return;
    }

    try {
      setProcessing({ ...processing, [pendingClient.id]: true });
      await firestoreService.removePendingClient(pendingClient.id);
      toast.success(`✅ ${pendingClient.email} removed from pending list`);
    } catch (error) {
      console.error('Error rejecting client:', error);
      toast.error('Failed to reject client: ' + error.message);
    } finally {
      setProcessing({ ...processing, [pendingClient.id]: false });
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading pending clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pending Client Approvals</h1>
        <p className="text-gray-600">
          Review and approve clients who have signed up for portal access
        </p>
      </div>

      {pendingClients.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No pending clients</p>
          <p className="text-sm text-gray-500 mt-2">
            Clients who sign up will appear here for approval
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingClients.map((client) => (
            <Card key={client.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {client.clientName || client.email.split('@')[0]}
                    </p>
                    <p className="text-sm text-gray-600">{client.email}</p>
                  </div>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{client.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Signed up {format(new Date(client.createdAt?.toDate() || client.createdAt || Date.now()), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(client)}
                  disabled={processing[client.id]}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {processing[client.id] ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  onClick={() => handleReject(client)}
                  disabled={processing[client.id]}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingClients;

