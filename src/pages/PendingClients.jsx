import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading pending clients...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {pendingClients.length === 0 ? (
        <Card>
          <CardContent className="p-12 pt-12 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending clients</h3>
            <p className="text-sm text-gray-500">
              Clients who sign up will appear here for approval
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow border border-gray-200">
              <CardContent className="p-6 pt-8">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-lg">
                        {client.clientName ? client.clientName.charAt(0).toUpperCase() : client.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {client.clientName || client.email.split('@')[0]}
                      </p>
                      <p className="text-sm text-gray-600 truncate">{client.email}</p>
                    </div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex-shrink-0">Pending</Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">
                      <Mail className="w-3 h-3 text-gray-600" />
                    </div>
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">
                      <Calendar className="w-3 h-3 text-gray-600" />
                    </div>
                    <span>Signed up {format(new Date(client.createdAt?.toDate() || client.createdAt || Date.now()), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-100">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingClients;

