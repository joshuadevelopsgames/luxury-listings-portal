import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { 
  Calendar, 
  MessageSquare, 
  BarChart3, 
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  Globe
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';
import ClientCalendarApproval from '../components/client/ClientCalendarApproval';
import ClientMessaging from '../components/client/ClientMessaging';
import ClientAnalytics from '../components/client/ClientAnalytics';
import ClientReports from '../components/client/ClientReports';

const ClientPortal = () => {
  const { currentUser } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');

  // Load client data based on email
  useEffect(() => {
    const loadClientData = async () => {
      if (!currentUser?.email) {
        setLoading(false);
        return;
      }

      try {
        // Find client by email
        const clients = await firestoreService.getClients();
        const client = clients.find(c => 
          c.clientEmail?.toLowerCase() === currentUser.email.toLowerCase()
        );

        if (client) {
          setClientData(client);
        } else {
          console.warn('Client not found for email:', currentUser.email);
        }
      } catch (error) {
        console.error('Error loading client data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClientData();
  }, [currentUser?.email]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              We couldn't find a client account associated with your email address.
            </p>
            <p className="text-sm text-gray-500">
              Please contact your media manager if you believe this is an error.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {clientData.clientName}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {clientData.packageType} Package • {clientData.postsRemaining} posts remaining
              </p>
            </div>
            <Badge 
              className={
                clientData.approvalStatus === 'Approved' 
                  ? 'bg-green-100 text-green-800' 
                  : clientData.approvalStatus === 'Pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }
            >
              {clientData.approvalStatus}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Content Calendar
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-0">
            <ClientCalendarApproval clientId={clientData.id} clientEmail={clientData.clientEmail} />
          </TabsContent>

          <TabsContent value="messages" className="mt-0">
            <ClientMessaging clientId={clientData.id} clientEmail={clientData.clientEmail} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <ClientAnalytics clientId={clientData.id} clientEmail={clientData.clientEmail} />
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <ClientReports clientId={clientData.id} clientEmail={clientData.clientEmail} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientPortal;

