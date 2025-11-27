import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { 
  Users, 
  Mail, 
  Phone, 
  Search, 
  User,
  Calendar,
  Package,
  Edit3,
  MessageSquare,
  FileText
} from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';
import { format } from 'date-fns';
import ClientContractsSection from './ClientContractsSection';

const ClientProfilesList = () => {
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, employeesData] = await Promise.all([
        firestoreService.getClients(),
        firestoreService.getApprovedUsers()
      ]);
      
      setClients(clientsData || []);
      // Filter to only social media managers
      const smManagers = (employeesData || []).filter(emp => 
        emp.role === 'social_media_manager' || emp.roles?.includes('social_media_manager')
      );
      setEmployees(smManagers);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssignedManager = (client) => {
    // Check if client has assignedManager field
    if (client.assignedManager) {
      const manager = employees.find(emp => 
        emp.email === client.assignedManager || 
        emp.id === client.assignedManager ||
        emp.displayName === client.assignedManager
      );
      return manager;
    }
    return null;
  };

  const filteredClients = clients.filter(client =>
    client.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.packageType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading client profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Client Profiles</h1>
        <p className="text-gray-600">
          View client contact information and assigned social media managers
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search clients by name, email, or package..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No clients found</p>
          <p className="text-sm text-gray-500 mt-2">
            {searchTerm ? 'Try a different search term' : 'No clients in the system yet'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const manager = getAssignedManager(client);
            return (
              <Card 
                key={client.id} 
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedClient(client)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {client.clientName || 'Unnamed Client'}
                      </h3>
                      <Badge className="mt-1 bg-blue-100 text-blue-800">
                        {client.packageType || 'Standard'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.clientEmail || 'No email'}</span>
                  </div>
                  
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}

                  {manager ? (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">
                        Manager: <span className="font-medium text-green-700">{manager.displayName || manager.email}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <User className="w-4 h-4" />
                      <span>No manager assigned</span>
                    </div>
                  )}

                  {client.startDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Since {format(new Date(client.startDate), 'MMM yyyy')}</span>
                    </div>
                  )}

                  {client.postsRemaining !== undefined && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Package className="w-4 h-4" />
                      <span>{client.postsRemaining} posts remaining</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  {manager && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `mailto:${client.clientEmail}`;
                      }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Contact
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedClient.clientName || 'Unnamed Client'}
                  </h2>
                  <Badge className="bg-blue-100 text-blue-800">
                    {selectedClient.packageType || 'Standard'} Package
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedClient(null)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{selectedClient.clientEmail || 'No email'}</span>
                    </div>
                    {selectedClient.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{selectedClient.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Assigned Manager</h3>
                  {getAssignedManager(selectedClient) ? (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-600" />
                      <span className="text-gray-900">
                        {getAssignedManager(selectedClient).displayName || getAssignedManager(selectedClient).email}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-yellow-600">No manager assigned</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Package Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Package Type</p>
                      <p className="text-sm font-medium">{selectedClient.packageType || 'Standard'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Posts Remaining</p>
                      <p className="text-sm font-medium">{selectedClient.postsRemaining || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Payment Status</p>
                      <p className="text-sm font-medium">{selectedClient.paymentStatus || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Approval Status</p>
                      <p className="text-sm font-medium">{selectedClient.approvalStatus || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                {selectedClient.startDate && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Account Information</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Client since {format(new Date(selectedClient.startDate), 'MMMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                )}

                {selectedClient.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedClient.notes}</p>
                  </div>
                )}
              </div>

              {/* Contracts Section */}
              <div className="mt-6 pt-6 border-t">
                <ClientContractsSection client={selectedClient} />
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t">
                {getAssignedManager(selectedClient) && (
                  <Button
                    onClick={() => {
                      window.location.href = `mailto:${selectedClient.clientEmail}`;
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedClient(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClientProfilesList;

