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
  FileText,
  Filter,
  UserPlus,
  X,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';
import { format } from 'date-fns';
import ClientContractsSection from './ClientContractsSection';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const ClientProfilesList = () => {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [managerFilter, setManagerFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showManagerAssignModal, setShowManagerAssignModal] = useState(false);
  const [assigningManager, setAssigningManager] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadData();
    
    // Set up real-time listener for clients
    const unsubscribe = firestoreService.onClientsChange((updatedClients) => {
      setClients(updatedClients || []);
    });
    
    return () => unsubscribe();
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

  // Calculate stats
  const stats = {
    total: clients.length,
    withManager: clients.filter(c => getAssignedManager(c)).length,
    withoutManager: clients.filter(c => !getAssignedManager(c)).length,
    active: clients.filter(c => c.approvalStatus === 'Approved').length,
    pending: clients.filter(c => c.approvalStatus === 'Pending').length
  };

  const filteredClients = clients.filter(client => {
    // Search filter
    const matchesSearch = 
      client.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.packageType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Manager filter
    const matchesManager = managerFilter === 'all' || 
      (managerFilter === 'unassigned' && !getAssignedManager(client)) ||
      (managerFilter !== 'unassigned' && getAssignedManager(client)?.email === managerFilter);
    
    // Package filter
    const matchesPackage = packageFilter === 'all' || 
      client.packageType?.toLowerCase() === packageFilter.toLowerCase();
    
    // Status filter
    const matchesStatus = statusFilter === 'all' ||
      client.approvalStatus?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesManager && matchesPackage && matchesStatus;
  });

  const handleAssignManager = async (clientId, managerEmail) => {
    try {
      setAssigningManager(true);
      const updateData = managerEmail 
        ? { assignedManager: managerEmail }
        : { assignedManager: null };
      
      await firestoreService.updateClient(clientId, updateData);
      toast.success(managerEmail ? 'Manager assigned successfully' : 'Manager unassigned');
      setShowManagerAssignModal(false);
      await loadData();
      // Update selected client if it's the one being updated
      if (selectedClient && selectedClient.id === clientId) {
        const updated = await firestoreService.getClients();
        const updatedClient = updated.find(c => c.id === clientId);
        if (updatedClient) setSelectedClient(updatedClient);
      }
    } catch (error) {
      console.error('Error assigning manager:', error);
      toast.error('Failed to assign manager');
    } finally {
      setAssigningManager(false);
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;
    
    try {
      await firestoreService.updateClient(selectedClient.id, editForm);
      toast.success('Client updated successfully');
      setShowEditModal(false);
      setEditForm({});
      loadData();
      // Reload selected client
      const updated = await firestoreService.getClients();
      const updatedClient = updated.find(c => c.id === selectedClient.id);
      if (updatedClient) setSelectedClient(updatedClient);
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Failed to update client');
    }
  };

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Client Profiles</h1>
          <p className="text-gray-600">
            View client contact information and assigned social media managers
          </p>
        </div>
        {clients.length === 0 && (
          <Button
            onClick={async () => {
              try {
                const { bulkAddClients } = await import('../../utils/bulkAddClients');
                await bulkAddClients();
                await loadData();
              } catch (error) {
                console.error('Error importing clients:', error);
                toast.error('Failed to import clients: ' + error.message);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Import All Clients
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">With Manager</p>
              <p className="text-2xl font-bold text-green-600">{stats.withManager}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unassigned</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.withoutManager}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search clients by name, email, or package..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Managers</option>
              <option value="unassigned">Unassigned</option>
              {employees.map(emp => (
                <option key={emp.email} value={emp.email}>
                  {emp.displayName || emp.email}
                </option>
              ))}
            </select>
            
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Packages</option>
              {[...new Set(clients.map(c => c.packageType).filter(Boolean))].map(pkg => (
                <option key={pkg} value={pkg}>{pkg}</option>
              ))}
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {searchTerm || managerFilter !== 'all' || packageFilter !== 'all' || statusFilter !== 'all' 
              ? 'No clients match your filters' 
              : 'No clients in the system yet'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {searchTerm || managerFilter !== 'all' || packageFilter !== 'all' || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Clients will appear here once they are added or approved from pending sign-ups'}
          </p>
          {!searchTerm && managerFilter === 'all' && packageFilter === 'all' && statusFilter === 'all' && (
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-3">To get started:</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Navigate to pending clients tab
                    const event = new CustomEvent('switchTab', { detail: 'pending' });
                    window.dispatchEvent(event);
                  }}
                >
                  Check Pending Approvals
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    // Import bulk clients
                    try {
                      const { bulkAddClients } = await import('../../utils/bulkAddClients');
                      await bulkAddClients();
                      await loadData();
                    } catch (error) {
                      console.error('Error importing clients:', error);
                      toast.error('Failed to import clients: ' + error.message);
                    }
                  }}
                >
                  Import All Clients
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    // Create a test client
                    try {
                      const testClient = {
                        clientName: 'Test Client',
                        clientEmail: `test-${Date.now()}@example.com`,
                        packageType: 'Standard',
                        packageSize: 10,
                        postsUsed: 0,
                        postsRemaining: 10,
                        postedOn: 'Luxury Listings',
                        paymentStatus: 'Paid',
                        approvalStatus: 'Approved',
                        notes: 'Test client created for demonstration',
                        startDate: new Date().toISOString().split('T')[0],
                        lastContact: new Date().toISOString().split('T')[0],
                        customPrice: 0,
                        overduePosts: 0
                      };
                      await firestoreService.addClient(testClient);
                      toast.success('Test client created!');
                      await loadData();
                    } catch (error) {
                      console.error('Error creating test client:', error);
                      toast.error('Failed to create test client: ' + error.message);
                    }
                  }}
                >
                  Create Test Client
                </Button>
              </div>
            </div>
          )}
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClient(client);
                      setShowManagerAssignModal(true);
                    }}
                  >
                    <UserPlus className="w-4 h-4" />
                    {manager ? 'Reassign' : 'Assign'}
                  </Button>
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
                <Button
                  onClick={() => {
                    setEditForm({
                      clientName: selectedClient.clientName || '',
                      clientEmail: selectedClient.clientEmail || '',
                      phone: selectedClient.phone || '',
                      notes: selectedClient.notes || ''
                    });
                    setShowEditModal(true);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Info
                </Button>
                <Button
                  onClick={() => {
                    setSelectedClient(selectedClient);
                    setShowManagerAssignModal(true);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {getAssignedManager(selectedClient) ? 'Reassign Manager' : 'Assign Manager'}
                </Button>
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

      {/* Manager Assignment Modal */}
      {showManagerAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Assign Manager</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManagerAssignModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Select a social media manager for {selectedClient?.clientName || 'this client'}
              </p>
              
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                <Button
                  variant={getAssignedManager(selectedClient) === null ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleAssignManager(selectedClient.id, null)}
                  disabled={assigningManager}
                >
                  <X className="w-4 h-4 mr-2" />
                  Unassign
                </Button>
                {employees.map(emp => (
                  <Button
                    key={emp.email}
                    variant={getAssignedManager(selectedClient)?.email === emp.email ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleAssignManager(selectedClient.id, emp.email)}
                    disabled={assigningManager}
                  >
                    <User className="w-4 h-4 mr-2" />
                    {emp.displayName || emp.email}
                  </Button>
                ))}
              </div>
              
              <Button
                onClick={() => setShowManagerAssignModal(false)}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Edit Client Information</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditForm({});
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name
                  </label>
                  <Input
                    value={editForm.clientName || ''}
                    onChange={(e) => setEditForm({...editForm, clientName: e.target.value})}
                    placeholder="Client name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={editForm.clientEmail || ''}
                    onChange={(e) => setEditForm({...editForm, clientEmail: e.target.value})}
                    placeholder="client@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <Input
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    placeholder="Additional notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={handleUpdateClient}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Changes
                </Button>
                <Button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditForm({});
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
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

