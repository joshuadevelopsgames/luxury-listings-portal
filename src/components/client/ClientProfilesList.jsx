import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading client profiles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      {clients.length === 0 && (
        <Card className="mt-8">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Get Started</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Import your client list or approve pending sign-ups
                </p>
              </div>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {clients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6 pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clients</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">With Manager</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.withManager}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unassigned</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.withoutManager}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{stats.active}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      {clients.length > 0 && (
        <Card>
          <CardContent className="p-6 pt-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 w-full sm:w-auto min-w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search clients by name, email, or package..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Packages</option>
                  {[...new Set(clients.map(c => c.packageType).filter(Boolean))].map(pkg => (
                    <option key={pkg} value={pkg}>{pkg}</option>
                  ))}
                </select>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="p-12 pt-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || managerFilter !== 'all' || packageFilter !== 'all' || statusFilter !== 'all' 
                ? 'No clients match your filters' 
                : 'No clients in the system yet'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchTerm || managerFilter !== 'all' || packageFilter !== 'all' || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Clients will appear here once they are added or approved from pending sign-ups'}
            </p>
            {!searchTerm && managerFilter === 'all' && packageFilter === 'all' && statusFilter === 'all' && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    const event = new CustomEvent('switchTab', { detail: 'pending' });
                    window.dispatchEvent(event);
                  }}
                >
                  Check Pending Approvals
                </Button>
                <Button
                  variant="outline"
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
                >
                  Import All Clients
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
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
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const manager = getAssignedManager(client);
            return (
              <Card 
                key={client.id} 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200"
                onClick={() => setSelectedClient(client)}
              >
                <CardContent className="p-6 pt-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-lg">
                          {client.clientName ? client.clientName.charAt(0).toUpperCase() : 'C'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {client.clientName || 'Unnamed Client'}
                        </h3>
                        <Badge className="mt-1 bg-blue-100 text-blue-800 border-blue-200">
                          {client.packageType || 'Standard'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-3 h-3 text-gray-600" />
                    </div>
                    <span className="truncate">{client.clientEmail || 'No email'}</span>
                  </div>
                  
                  {client.phone && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3 h-3 text-gray-600" />
                      </div>
                      <span>{client.phone}</span>
                    </div>
                  )}

                  {manager ? (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-700">
                        Manager: <span className="font-medium text-green-700">{manager.displayName || manager.email}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-yellow-600">
                      <div className="h-5 w-5 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-3 h-3 text-yellow-600" />
                      </div>
                      <span>No manager assigned</span>
                    </div>
                  )}

                  {client.startDate && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-3 h-3 text-gray-600" />
                      </div>
                      <span>Since {format(new Date(client.startDate), 'MMM yyyy')}</span>
                    </div>
                  )}

                  {client.postsRemaining !== undefined && (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-3 h-3 text-gray-600" />
                      </div>
                      <span>{client.postsRemaining} posts remaining</span>
                    </div>
                  )}
                </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 flex items-center justify-center gap-2"
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
                        className="flex-1 flex items-center justify-center gap-2"
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {selectedClient.clientName ? selectedClient.clientName.charAt(0).toUpperCase() : 'C'}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-2">
                      {selectedClient.clientName || 'Unnamed Client'}
                    </CardTitle>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {selectedClient.packageType || 'Standard'} Package
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedClient(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm font-medium text-gray-900">{selectedClient.clientEmail || 'No email'}</p>
                        </div>
                      </div>
                      {selectedClient.phone && (
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Phone className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Phone</p>
                            <p className="text-sm font-medium text-gray-900">{selectedClient.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Assigned Manager</h3>
                    {getAssignedManager(selectedClient) ? (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Social Media Manager</p>
                          <p className="text-sm font-medium text-gray-900">
                            {getAssignedManager(selectedClient).displayName || getAssignedManager(selectedClient).email}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                        </div>
                        <p className="text-sm text-yellow-600">No manager assigned</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Package Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Package Type</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedClient.packageType || 'Standard'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Posts Remaining</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedClient.postsRemaining || 0}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Payment Status</p>
                      <Badge className={selectedClient.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {selectedClient.paymentStatus || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Approval Status</p>
                      <Badge className={selectedClient.approvalStatus === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {selectedClient.approvalStatus || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedClient.startDate && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Account Information</h3>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Client Since</p>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(selectedClient.startDate), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedClient.notes && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Notes</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedClient.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Contracts Section */}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <ClientContractsSection client={selectedClient} />
              </div>

              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
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
                  className="flex-1 min-w-[140px]"
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
                  className="flex-1 min-w-[140px]"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {getAssignedManager(selectedClient) ? 'Reassign' : 'Assign'}
                </Button>
                {getAssignedManager(selectedClient) && (
                  <Button
                    onClick={() => {
                      window.location.href = `mailto:${selectedClient.clientEmail}`;
                    }}
                    className="flex-1 min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Email
                  </Button>
                )}
                <Button
                  onClick={() => setSelectedClient(null)}
                  variant="outline"
                  className="flex-1 min-w-[140px]"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manager Assignment Modal */}
      {showManagerAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle>Assign Manager</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManagerAssignModal(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              <p className="text-sm text-gray-600 mb-4">
                Select a social media manager for <span className="font-medium">{selectedClient?.clientName || 'this client'}</span>
              </p>
              
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                <Button
                  variant={getAssignedManager(selectedClient) === null ? "default" : "outline"}
                  className="w-full justify-start h-auto py-3"
                  onClick={() => handleAssignManager(selectedClient.id, null)}
                  disabled={assigningManager}
                >
                  <X className="w-4 h-4 mr-2" />
                  Unassign Manager
                </Button>
                {employees.map(emp => (
                  <Button
                    key={emp.email}
                    variant={getAssignedManager(selectedClient)?.email === emp.email ? "default" : "outline"}
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleAssignManager(selectedClient.id, emp.email)}
                    disabled={assigningManager}
                  >
                    <User className="w-4 h-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">{emp.displayName || emp.email}</div>
                      {emp.displayName && emp.email && (
                        <div className="text-xs text-gray-500">{emp.email}</div>
                      )}
                    </div>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full shadow-xl">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle>Edit Client Information</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditForm({});
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name
                  </label>
                  <Input
                    value={editForm.clientName || ''}
                    onChange={(e) => setEditForm({...editForm, clientName: e.target.value})}
                    placeholder="Client name"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={editForm.clientEmail || ''}
                    onChange={(e) => setEditForm({...editForm, clientEmail: e.target.value})}
                    placeholder="client@example.com"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <Input
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    placeholder="Additional notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClientProfilesList;

