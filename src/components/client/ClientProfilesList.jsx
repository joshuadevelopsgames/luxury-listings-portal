import React, { useState, useEffect } from 'react';
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
import PlatformIcons from '../PlatformIcons';

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

  // Load data once on mount (no real-time listener for performance)
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
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[14px] text-[#86868b]">Loading client profiles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      {clients.length === 0 && (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Get Started</h2>
              <p className="text-[14px] text-[#86868b] mt-1">
                Import your client list or approve pending sign-ups
              </p>
            </div>
            <button
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
              className="px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
            >
              Import All Clients
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {clients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#86868b]">Total Clients</p>
                <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#0071e3]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#0071e3]" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#86868b]">With Manager</p>
                <p className="text-[28px] font-semibold text-[#34c759] mt-1">{stats.withManager}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#34c759]/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#34c759]" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#86868b]">Unassigned</p>
                <p className="text-[28px] font-semibold text-[#ff9500] mt-1">{stats.withoutManager}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#ff9500]/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[#ff9500]" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#86868b]">Active</p>
                <p className="text-[28px] font-semibold text-[#0071e3] mt-1">{stats.active}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#0071e3]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#0071e3]" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#86868b]">Pending</p>
                <p className="text-[28px] font-semibold text-[#ff9500] mt-1">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#ff9500]/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#ff9500]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      {clients.length > 0 && (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 w-full sm:w-auto min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#86868b] w-4 h-4" />
              <input
                placeholder="Search clients by name, email, or package..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="h-10 px-3 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
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
                className="h-10 px-3 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="all">All Packages</option>
                {[...new Set(clients.map(c => c.packageType).filter(Boolean))].map(pkg => (
                  <option key={pkg} value={pkg}>{pkg}</option>
                ))}
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-12 text-center">
          <Users className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
          <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
            {searchTerm || managerFilter !== 'all' || packageFilter !== 'all' || statusFilter !== 'all' 
              ? 'No clients match your filters' 
              : 'No clients in the system yet'}
          </h3>
          <p className="text-[14px] text-[#86868b] mb-6">
            {searchTerm || managerFilter !== 'all' || packageFilter !== 'all' || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Clients will appear here once they are added or approved from pending sign-ups'}
          </p>
          {!searchTerm && managerFilter === 'all' && packageFilter === 'all' && statusFilter === 'all' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  const event = new CustomEvent('switchTab', { detail: 'pending' });
                  window.dispatchEvent(event);
                }}
                className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              >
                Check Pending Approvals
              </button>
              <button
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
                className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              >
                Import All Clients
              </button>
              <button
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
                className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              >
                Create Test Client
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const manager = getAssignedManager(client);
            return (
              <div 
                key={client.id} 
                className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedClient(client)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      {client.profilePhoto ? (
                        <img src={client.profilePhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">
                            {client.clientName ? client.clientName.charAt(0).toUpperCase() : 'C'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-medium text-[#1d1d1f] dark:text-white truncate">
                        {client.clientName || 'Unnamed Client'}
                      </h3>
                      {client.brokerage && (
                        <p className="text-[11px] text-[#86868b] truncate">{client.brokerage}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] font-medium">
                          {client.packageType || 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {/* Platform icons */}
                  {client.platforms && Object.values(client.platforms).some(Boolean) && (
                    <div className="mb-1">
                      <PlatformIcons platforms={client.platforms} compact size={16} />
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                    <div className="h-5 w-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-3 h-3" />
                    </div>
                    <span className="truncate">{client.clientEmail || 'No email'}</span>
                  </div>

                  {client.phone && (
                    <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                      <div className="h-5 w-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-3 h-3" />
                      </div>
                      <span>{client.phone}</span>
                    </div>
                  )}

                  {manager ? (
                    <div className="flex items-center gap-2 text-[12px]">
                      <div className="h-5 w-5 rounded-full bg-[#34c759]/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-[#34c759]" />
                      </div>
                      <span className="text-[#86868b]">
                        Manager: <span className="font-medium text-[#34c759]">{manager.displayName || manager.email}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[12px] text-[#ff9500]">
                      <div className="h-5 w-5 rounded-full bg-[#ff9500]/10 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-3 h-3" />
                      </div>
                      <span>No manager assigned</span>
                    </div>
                  )}

                  {client.startDate && (
                    <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                      <div className="h-5 w-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-3 h-3" />
                      </div>
                      <span>Since {format(new Date(client.startDate), 'MMM yyyy')}</span>
                    </div>
                  )}

                  {client.postsRemaining !== undefined && (
                    <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                      <div className="h-5 w-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-3 h-3" />
                      </div>
                      <span>{client.postsRemaining} posts remaining</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-black/5 dark:border-white/10">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClient(client);
                      setShowManagerAssignModal(true);
                    }}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {manager ? 'Reassign' : 'Assign'}
                  </button>
                  {manager && (
                    <button
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `mailto:${client.clientEmail}`;
                      }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Contact
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-b border-black/5 dark:border-white/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#0071e3] to-[#5856d6] rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-xl">
                      {selectedClient.clientName ? selectedClient.clientName.charAt(0).toUpperCase() : 'C'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white mb-1">
                      {selectedClient.clientName || 'Unnamed Client'}
                    </h2>
                    <span className="text-[12px] px-2 py-1 rounded-md bg-[#0071e3]/10 text-[#0071e3] font-medium">
                      {selectedClient.packageType || 'Standard'} Package
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
            </div>
            <div className="p-6">

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-[#86868b]" />
                        </div>
                        <div>
                          <p className="text-[11px] text-[#86868b]">Email</p>
                          <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{selectedClient.clientEmail || 'No email'}</p>
                        </div>
                      </div>
                      {selectedClient.phone && (
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                            <Phone className="w-4 h-4 text-[#86868b]" />
                          </div>
                          <div>
                            <p className="text-[11px] text-[#86868b]">Phone</p>
                            <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{selectedClient.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Assigned Manager</h3>
                    {getAssignedManager(selectedClient) ? (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#34c759]/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-[#34c759]" />
                        </div>
                        <div>
                          <p className="text-[11px] text-[#86868b]">Social Media Manager</p>
                          <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                            {getAssignedManager(selectedClient).displayName || getAssignedManager(selectedClient).email}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#ff9500]/10 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 text-[#ff9500]" />
                        </div>
                        <p className="text-[13px] text-[#ff9500]">No manager assigned</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-black/5 dark:border-white/10 pt-6">
                  <h3 className="text-[12px] font-semibold text-[#86868b] mb-4 uppercase tracking-wide">Package Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                      <p className="text-[11px] text-[#86868b] mb-1">Package Type</p>
                      <p className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">{selectedClient.packageType || 'Standard'}</p>
                    </div>
                    <div className="p-3 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                      <p className="text-[11px] text-[#86868b] mb-1">Posts Remaining</p>
                      <p className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white">{selectedClient.postsRemaining || 0}</p>
                    </div>
                    <div className="p-3 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                      <p className="text-[11px] text-[#86868b] mb-1">Payment Status</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${selectedClient.paymentStatus === 'Paid' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>
                        {selectedClient.paymentStatus || 'Unknown'}
                      </span>
                    </div>
                    <div className="p-3 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                      <p className="text-[11px] text-[#86868b] mb-1">Approval Status</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${selectedClient.approvalStatus === 'Approved' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'}`}>
                        {selectedClient.approvalStatus || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedClient.startDate && (
                  <div className="border-t border-black/5 dark:border-white/10 pt-6">
                    <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Account Information</h3>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-[#86868b]" />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#86868b]">Client Since</p>
                        <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                          {format(new Date(selectedClient.startDate), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedClient.notes && (
                  <div className="border-t border-black/5 dark:border-white/10 pt-6">
                    <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide">Notes</h3>
                    <div className="p-4 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                      <p className="text-[13px] text-[#1d1d1f] dark:text-white whitespace-pre-wrap">{selectedClient.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Contracts Section */}
              <div className="border-t border-black/5 dark:border-white/10 pt-6 mt-6">
                <ClientContractsSection client={selectedClient} />
              </div>

              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-black/5 dark:border-white/10">
                <button
                  onClick={() => {
                    setEditForm({
                      clientName: selectedClient.clientName || '',
                      clientEmail: selectedClient.clientEmail || '',
                      phone: selectedClient.phone || '',
                      notes: selectedClient.notes || ''
                    });
                    setShowEditModal(true);
                  }}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Info
                </button>
                <button
                  onClick={() => {
                    setSelectedClient(selectedClient);
                    setShowManagerAssignModal(true);
                  }}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {getAssignedManager(selectedClient) ? 'Reassign' : 'Assign'}
                </button>
                {getAssignedManager(selectedClient) && (
                  <button
                    onClick={() => {
                      window.location.href = `mailto:${selectedClient.clientEmail}`;
                    }}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Send Email
                  </button>
                )}
                <button
                  onClick={() => setSelectedClient(null)}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Assignment Modal */}
      {showManagerAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Assign Manager</h2>
              <button
                onClick={() => setShowManagerAssignModal(false)}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[14px] text-[#86868b] mb-4">
                Select a social media manager for <span className="font-medium text-[#1d1d1f] dark:text-white">{selectedClient?.clientName || 'this client'}</span>
              </p>
              
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    getAssignedManager(selectedClient) === null 
                      ? 'bg-[#0071e3] text-white' 
                      : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                  }`}
                  onClick={() => handleAssignManager(selectedClient.id, null)}
                  disabled={assigningManager}
                >
                  <X className="w-4 h-4" />
                  <span className="text-[13px] font-medium">Unassign Manager</span>
                </button>
                {employees.map(emp => (
                  <button
                    key={emp.email}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      getAssignedManager(selectedClient)?.email === emp.email 
                        ? 'bg-[#0071e3] text-white' 
                        : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
                    }`}
                    onClick={() => handleAssignManager(selectedClient.id, emp.email)}
                    disabled={assigningManager}
                  >
                    <User className="w-4 h-4" />
                    <div>
                      <div className="text-[13px] font-medium">{emp.displayName || emp.email}</div>
                      {emp.displayName && emp.email && (
                        <div className={`text-[11px] ${getAssignedManager(selectedClient)?.email === emp.email ? 'text-white/70' : 'text-[#86868b]'}`}>{emp.email}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowManagerAssignModal(false)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Edit Client Information</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditForm({});
                }}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Client Name
                  </label>
                  <input
                    value={editForm.clientName || ''}
                    onChange={(e) => setEditForm({...editForm, clientName: e.target.value})}
                    placeholder="Client name"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.clientEmail || ''}
                    onChange={(e) => setEditForm({...editForm, clientEmail: e.target.value})}
                    placeholder="client@example.com"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Phone
                  </label>
                  <input
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    placeholder="Additional notes..."
                    className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6 pt-6 border-t border-black/5 dark:border-white/10">
                <button
                  onClick={handleUpdateClient}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditForm({});
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientProfilesList;

