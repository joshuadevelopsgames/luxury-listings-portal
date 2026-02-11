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
  TrendingUp,
  Trash2,
  Pencil,
  LayoutGrid,
  List,
  Plus,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Upload,
  Camera,
  Loader2
} from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestoreService } from '../../services/firestoreService';
import { format } from 'date-fns';
import ClientContractsSection from './ClientContractsSection';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions, FEATURE_PERMISSIONS } from '../../contexts/PermissionsContext';
import PlatformIcons from '../PlatformIcons';
import ClientLink from '../ui/ClientLink';

// Custom icons for platforms not in lucide-react
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const ClientProfilesList = ({ internalOnly = false }) => {
  const { currentUser } = useAuth();
  const { hasFeaturePermission } = usePermissions();
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // Default to card view on mobile, list on desktop
  const [viewMode, setViewMode] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'card' : 'list'
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    clientName: '',
    clientEmail: '',
    phone: '',
    notes: '',
    packageType: 'Standard',
    packageSize: 12,
    postsRemaining: 10,
    paymentStatus: 'Pending',
    platforms: { instagram: false, facebook: false, linkedin: false, youtube: false, tiktok: false, x: false },
    isInternal: false
  });
  const [adding, setAdding] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = React.useRef(null);

  // Permissions
  const canManageClients = hasFeaturePermission(FEATURE_PERMISSIONS.MANAGE_CLIENTS);
  const canAssignManagers = hasFeaturePermission(FEATURE_PERMISSIONS.ASSIGN_CLIENT_MANAGERS);
  const canEditPackages = hasFeaturePermission(FEATURE_PERMISSIONS.EDIT_CLIENT_PACKAGES);

  // Load data once on mount (no real-time listener for performance)
  useEffect(() => {
    loadData();
  }, []);

  // Listen for add client modal trigger from parent
  useEffect(() => {
    const handleOpenAddModal = (e) => {
      setShowAddModal(true);
      if (e.detail?.isInternal) {
        setAddForm(prev => ({ ...prev, isInternal: true }));
      }
    };
    window.addEventListener('openAddClientModal', handleOpenAddModal);
    return () => window.removeEventListener('openAddClientModal', handleOpenAddModal);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, employeesData] = await Promise.all([
        firestoreService.getClients(),
        firestoreService.getApprovedUsers()
      ]);
      
      setClients(clientsData || []);
      // Filter to social media managers + specific allowed users (Michelle, Matthew)
      const allowedManagers = (employeesData || []).filter(emp => {
        const name = (emp.displayName || emp.firstName || '').toLowerCase();
        const isSMM = emp.role === 'social_media_manager' || emp.roles?.includes('social_media_manager');
        const isAllowedUser = name.includes('michelle') || name.includes('matthew');
        return isSMM || isAllowedUser;
      });
      setEmployees(allowedManagers);
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

  const displayClients = React.useMemo(
    () => (internalOnly ? clients.filter(c => c.isInternal === true) : clients.filter(c => c.isInternal !== true)),
    [clients, internalOnly]
  );

  // Calculate stats from displayed list
  const stats = {
    total: displayClients.length,
    withManager: displayClients.filter(c => getAssignedManager(c)).length,
    withoutManager: displayClients.filter(c => !getAssignedManager(c)).length,
    active: displayClients.filter(c => c.approvalStatus === 'Approved').length,
    pending: displayClients.filter(c => c.approvalStatus === 'Pending').length
  };

  const filteredClients = displayClients.filter(client => {
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
  }).sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));

  const handleAssignManager = async (clientId, managerEmail) => {
    try {
      setAssigningManager(true);
      const previousManager = selectedClient?.id === clientId ? selectedClient.assignedManager : null;
      const clientName = selectedClient?.id === clientId ? (selectedClient.clientName || selectedClient.name) : null;
      const updateData = managerEmail 
        ? { assignedManager: managerEmail }
        : { assignedManager: null };
      
      await firestoreService.updateClient(clientId, updateData);
      await firestoreService.logClientReassignment(clientId, clientName, previousManager, managerEmail || null, currentUser?.email);
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

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient?.id) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploadingPhoto(true);
    try {
      const storage = getStorage();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `client-photos/${selectedClient.id}/profile_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setEditForm(prev => ({ ...prev, profilePhoto: url }));
      toast.success('Photo uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleDeleteClient = async (clientId) => {
    try {
      setDeleting(true);
      await firestoreService.deleteClient(clientId);
      toast.success('Client removed successfully');
      setShowDeleteConfirm(null);
      setSelectedClient(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to remove client');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddClient = async () => {
    if (!addForm.clientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    try {
      setAdding(true);
      const newClient = {
        clientName: addForm.clientName.trim(),
        clientEmail: addForm.clientEmail.trim(),
        phone: addForm.phone.trim(),
        notes: addForm.notes.trim(),
        packageType: addForm.packageType,
        packageSize: addForm.packageSize,
        postsUsed: 0,
        postsRemaining: addForm.postsRemaining,
        paymentStatus: addForm.paymentStatus,
        platforms: addForm.platforms,
        isInternal: !!addForm.isInternal,
        approvalStatus: 'Approved',
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        lastContact: new Date().toISOString().split('T')[0],
        postedOn: 'Luxury Listings'
      };

      await firestoreService.addClient(newClient);
      toast.success('Client added successfully');
      setShowAddModal(false);
      setAddForm({
        clientName: '',
        clientEmail: '',
        phone: '',
        notes: '',
        packageType: 'Standard',
        packageSize: 12,
        postsRemaining: 10,
        paymentStatus: 'Pending',
        platforms: { instagram: false, facebook: false, linkedin: false, youtube: false, tiktok: false, x: false },
        isInternal: false
      });
      await loadData();
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Failed to add client');
    } finally {
      setAdding(false);
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
      {displayClients.length === 0 && (
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
      {displayClients.length > 0 && (
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
      {displayClients.length > 0 && (
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
                {[...new Set(displayClients.map(c => c.packageType).filter(Boolean))].map(pkg => (
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

              {/* View Toggle */}
              <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-[#0071e3] text-white' : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2.5 transition-colors ${viewMode === 'card' ? 'bg-[#0071e3] text-white' : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'}`}
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
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
              : (internalOnly ? 'Internal accounts will appear here once added.' : 'Clients will appear here once they are added.')}
          </p>
          {!searchTerm && managerFilter === 'all' && packageFilter === 'all' && statusFilter === 'all' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!internalOnly && (
                <button
                  onClick={() => {
                    const event = new CustomEvent('switchTab', { detail: 'internal' });
                    window.dispatchEvent(event);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  View Internal Accounts
                </button>
              )}
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
                      packageSize: 12,
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
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
          {/* List Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">
            <div className="col-span-4">Client</div>
            <div className="col-span-2">Package</div>
            <div className="col-span-2">Manager</div>
            <div className="col-span-2">Posts</div>
            <div className="col-span-2">Socials</div>
          </div>
          {/* List Items */}
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {filteredClients.map((client) => {
              const manager = getAssignedManager(client);
              return (
                <div 
                  key={client.id} 
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group items-center"
                  onClick={() => setSelectedClient(client)}
                >
                  {/* Client Info */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                      {client.profilePhoto ? (
                        <img src={client.profilePhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {client.clientName ? client.clientName.charAt(0).toUpperCase() : 'C'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[13px] font-medium truncate">
                        <ClientLink client={client} showId />
                      </h3>
                      <p className="text-[11px] text-[#86868b] truncate">{client.clientEmail || 'No email'}</p>
                    </div>
                  </div>

                  {/* Package */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#0071e3]/10 text-[#0071e3] font-medium">
                      {client.packageType || 'Standard'}
                    </span>
                  </div>

                  {/* Manager */}
                  <div className="col-span-2 flex items-center">
                    {manager ? (
                      <span className="text-[12px] text-[#34c759] font-medium truncate">
                        {manager.displayName || manager.email}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#ff9500]">Unassigned</span>
                    )}
                  </div>

                  {/* Posts */}
                  <div className="col-span-2 flex items-center">
                    <span className="text-[12px] text-[#86868b]">
                      {client.postsRemaining !== undefined ? `${client.postsRemaining} remaining` : '—'}
                    </span>
                  </div>

                  {/* Social Accounts */}
                  <div className="col-span-2 flex items-center gap-1.5">
                    {client.platforms?.instagram && <Instagram className="w-4 h-4 text-[#E4405F]" />}
                    {client.platforms?.facebook && <Facebook className="w-4 h-4 text-[#1877F2]" />}
                    {client.platforms?.linkedin && <Linkedin className="w-4 h-4 text-[#0A66C2]" />}
                    {client.platforms?.youtube && <Youtube className="w-4 h-4 text-[#FF0000]" />}
                    {client.platforms?.tiktok && <TikTokIcon className="w-4 h-4 text-[#000000] dark:text-white" />}
                    {client.platforms?.x && <XIcon className="w-4 h-4 text-[#000000] dark:text-white" />}
                    {!client.platforms || !Object.values(client.platforms).some(v => v) ? (
                      <span className="text-[11px] text-[#86868b]">—</span>
                    ) : null}
                    {canManageClients && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(client);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#ff3b30]/10 transition-colors"
                        title="Remove client"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#ff3b30]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const manager = getAssignedManager(client);
            return (
              <div 
                key={client.id} 
                className="relative rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setSelectedClient(client)}
              >
                {/* Edit/Delete buttons at top right */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {(canManageClients || canEditPackages) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClient(client);
                        setEditForm({
                          clientName: client.clientName || '',
                          clientEmail: client.clientEmail || '',
                          phone: client.phone || '',
                          notes: client.notes || '',
                          packageType: client.packageType || 'Standard',
                          packageSize: client.packageSize || 12,
                          postsUsed: client.postsUsed || 0,
                          postsRemaining: client.postsRemaining || 0,
                          paymentStatus: client.paymentStatus || 'Pending',
                          platforms: client.platforms || { instagram: false, facebook: false, linkedin: false, youtube: false, tiktok: false, x: false }
                        });
                        setShowEditModal(true);
                      }}
                      className="p-2 rounded-lg bg-white dark:bg-[#2c2c2e] shadow-sm border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      title="Edit client"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#0071e3]" />
                    </button>
                  )}
                  {canManageClients && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(client);
                      }}
                      className="p-2 rounded-lg bg-white dark:bg-[#2c2c2e] shadow-sm border border-black/5 dark:border-white/10 hover:bg-[#ff3b30]/10 transition-colors"
                      title="Remove client"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#ff3b30]" />
                    </button>
                  )}
                </div>

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
                      <h3 className="text-[14px] font-medium truncate">
                        <ClientLink client={client} showId />
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
                  {canAssignManagers && (
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
                  )}
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
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-b border-black/5 dark:border-white/10 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                    {selectedClient.profilePhoto ? (
                      <img src={selectedClient.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center">
                        <span className="text-white font-semibold text-xl">
                          {selectedClient.clientName ? selectedClient.clientName.charAt(0).toUpperCase() : 'C'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-[20px] font-semibold mb-1">
                      <ClientLink client={selectedClient} showId />
                    </h2>
                    <span className="text-[12px] px-2 py-1 rounded-md bg-[#0071e3]/10 text-[#0071e3] font-medium">
                      {selectedClient.packageType || 'Standard'} Package
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(canManageClients || canEditPackages) && (
                    <button
                      onClick={() => {
                        setEditForm({
                          clientName: selectedClient.clientName || '',
                          clientEmail: selectedClient.clientEmail || '',
                          phone: selectedClient.phone || '',
                          notes: selectedClient.notes || '',
                          packageType: selectedClient.packageType || 'Standard',
                          packageSize: selectedClient.packageSize || 12,
                          postsUsed: selectedClient.postsUsed || 0,
                          postsRemaining: selectedClient.postsRemaining || 0,
                          paymentStatus: selectedClient.paymentStatus || 'Pending',
                          platforms: selectedClient.platforms || { instagram: false, facebook: false, linkedin: false, youtube: false, tiktok: false, x: false },
                          profilePhoto: selectedClient.profilePhoto || ''
                        });
                        setShowEditModal(true);
                      }}
                      className="p-2 rounded-lg bg-[#0071e3]/10 hover:bg-[#0071e3]/20 transition-colors"
                      title="Edit client"
                    >
                      <Pencil className="w-4 h-4 text-[#0071e3]" />
                    </button>
                  )}
                  {canManageClients && (
                    <button
                      onClick={() => setShowDeleteConfirm(selectedClient)}
                      className="p-2 rounded-lg hover:bg-[#ff3b30]/10 transition-colors"
                      title="Remove client"
                    >
                      <Trash2 className="w-4 h-4 text-[#ff3b30]" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-[#86868b]" />
                  </button>
                </div>
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
                {canAssignManagers && (
                  <button
                    onClick={() => {
                      setShowManagerAssignModal(true);
                    }}
                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    {getAssignedManager(selectedClient) ? 'Reassign Manager' : 'Assign Manager'}
                  </button>
                )}
                <button
                  onClick={() => {
                    window.location.href = `mailto:${selectedClient.clientEmail}`;
                  }}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send Email
                </button>
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
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {/* Profile Photo */}
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  {selectedClient.profilePhoto ? (
                    <img src={selectedClient.profilePhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {selectedClient.clientName ? selectedClient.clientName.charAt(0).toUpperCase() : 'C'}
                      </span>
                    </div>
                  )}
                </div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
                  {canManageClients && canEditPackages ? 'Edit Client' : canEditPackages ? 'Edit Package Details' : 'Edit Client Information'}
                </h2>
              </div>
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
                {/* Basic Client Info - requires MANAGE_CLIENTS */}
                {canManageClients && (
                  <>
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
                  </>
                )}
                
                {canManageClients && (
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                      Notes
                    </label>
                    <textarea
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                      placeholder="Additional notes..."
                      className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                      rows={3}
                    />
                  </div>
                )}

                {canManageClients && (
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex-shrink-0">
                        {editForm.profilePhoto ? (
                          <img src={editForm.profilePhoto} alt="Profile" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#86868b]">
                            <Camera className="w-6 h-6" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleProfilePhotoUpload}
                        />
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-medium hover:bg-[#0071e3]/20 transition-colors disabled:opacity-50"
                        >
                          {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploadingPhoto ? 'Uploading...' : 'Upload photo'}
                        </button>
                        {editForm.profilePhoto && (
                          <button
                            type="button"
                            onClick={() => setEditForm(prev => ({ ...prev, profilePhoto: '' }))}
                            className="block text-[12px] text-[#86868b] hover:text-[#ff3b30]"
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#86868b] mt-2">Or paste URL:</p>
                    <input
                      type="text"
                      value={editForm.profilePhoto || ''}
                      onChange={(e) => setEditForm({...editForm, profilePhoto: e.target.value})}
                      placeholder="https://..."
                      className="mt-1 w-full h-9 px-3 text-[13px] rounded-lg bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                )}

                {/* Package Details - Admin Only */}
                {canEditPackages && (
                  <>
                    <div className="pt-4 border-t border-black/5 dark:border-white/10">
                      <h3 className="text-[12px] font-semibold text-[#86868b] mb-3 uppercase tracking-wide flex items-center gap-2">
                        <Package className="w-3.5 h-3.5" />
                        Package Details
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                          Package Type
                        </label>
                        <select
                          value={editForm.packageType || 'Standard'}
                          onChange={(e) => setEditForm({...editForm, packageType: e.target.value})}
                          className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        >
                          <option value="Standard">Standard</option>
                          <option value="Bundled">Bundled</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                          Package Size
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.packageSize || 0}
                          onChange={(e) => setEditForm({...editForm, packageSize: parseInt(e.target.value) || 0})}
                          className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                          Posts Used
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.postsUsed || 0}
                          onChange={(e) => setEditForm({...editForm, postsUsed: parseInt(e.target.value) || 0})}
                          className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                          Posts Remaining
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.postsRemaining || 0}
                          onChange={(e) => setEditForm({...editForm, postsRemaining: parseInt(e.target.value) || 0})}
                          className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                        Payment Status
                      </label>
                      <select
                        value={editForm.paymentStatus || 'Pending'}
                        onChange={(e) => setEditForm({...editForm, paymentStatus: e.target.value})}
                        className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                        <option value="Partial">Partial</option>
                      </select>
                    </div>

                    {/* Social Media Platforms */}
                    <div className="pt-4 border-t border-black/5 dark:border-white/10">
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-3">
                        Social Media Platforms
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'instagram', label: 'Instagram', icon: Instagram },
                          { key: 'facebook', label: 'Facebook', icon: Facebook },
                          { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                          { key: 'youtube', label: 'YouTube', icon: Youtube },
                          { key: 'tiktok', label: 'TikTok', icon: TikTokIcon },
                          { key: 'x', label: 'X', icon: XIcon }
                        ].map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setEditForm({
                              ...editForm,
                              platforms: {
                                ...(editForm.platforms || {}),
                                [key]: !(editForm.platforms?.[key])
                              }
                            })}
                            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                              editForm.platforms?.[key]
                                ? 'bg-[#0071e3] text-white'
                                : 'bg-black/5 dark:bg-white/10 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                            }`}
                          >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#ff3b30]/10 flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-[#ff3b30]" />
              </div>
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">Remove Client?</h2>
              <p className="text-[14px] text-[#86868b] mb-6">
                Are you sure you want to remove <span className="font-medium text-[#1d1d1f] dark:text-white">{showDeleteConfirm.clientName || 'this client'}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteClient(showDeleteConfirm.id)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#ff3b30] text-white text-[14px] font-medium hover:bg-[#e53529] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Removing...
                    </>
                  ) : (
                    'Remove'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between z-10">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">{internalOnly ? 'Add Internal Account' : 'Add New Client'}</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddForm({
                    clientName: '',
                    clientEmail: '',
                    phone: '',
                    notes: '',
                    packageType: 'Standard',
                    packageSize: 12,
                    postsRemaining: 10,
                    paymentStatus: 'Pending',
                    platforms: { instagram: false, facebook: false, linkedin: false, youtube: false, tiktok: false, x: false },
                    isInternal: false
                  });
                }}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Client Name */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Client Name *
                  </label>
                  <input
                    value={addForm.clientName}
                    onChange={(e) => setAddForm({...addForm, clientName: e.target.value})}
                    placeholder="Enter client name"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={addForm.clientEmail}
                    onChange={(e) => setAddForm({...addForm, clientEmail: e.target.value})}
                    placeholder="client@example.com"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Phone
                  </label>
                  <input
                    value={addForm.phone}
                    onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Internal Account */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!addForm.isInternal}
                    onChange={(e) => setAddForm({ ...addForm, isInternal: e.target.checked })}
                    className="w-4 h-4 rounded border-black/20 dark:border-white/20 text-[#0071e3] focus:ring-[#0071e3]"
                  />
                  <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Internal account (our company page)</span>
                </label>

                {/* Package Type & Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                      Package Type
                    </label>
                    <select
                      value={addForm.packageType}
                      onChange={(e) => setAddForm({...addForm, packageType: e.target.value})}
                      className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Bundled">Bundled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                      Posts Included
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addForm.postsRemaining}
                      onChange={(e) => setAddForm({...addForm, postsRemaining: parseInt(e.target.value) || 0, packageSize: parseInt(e.target.value) || 0})}
                      className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    />
                  </div>
                </div>

                {/* Social Media Platforms */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-3">
                    Social Media Platforms
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'instagram', label: 'Instagram', icon: Instagram },
                      { key: 'facebook', label: 'Facebook', icon: Facebook },
                      { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                      { key: 'youtube', label: 'YouTube', icon: Youtube },
                      { key: 'tiktok', label: 'TikTok', icon: null },
                      { key: 'x', label: 'X', icon: null }
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAddForm({
                          ...addForm,
                          platforms: {
                            ...addForm.platforms,
                            [key]: !addForm.platforms[key]
                          }
                        })}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                          addForm.platforms[key]
                            ? 'bg-[#0071e3] text-white'
                            : 'bg-black/5 dark:bg-white/10 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                        }`}
                      >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Notes
                  </label>
                  <textarea
                    value={addForm.notes}
                    onChange={(e) => setAddForm({...addForm, notes: e.target.value})}
                    placeholder="Additional notes about this client..."
                    className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-black/5 dark:border-white/10">
                <button
                  onClick={handleAddClient}
                  disabled={adding || !addForm.clientName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                >
                  {adding ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {internalOnly ? 'Add Internal Account' : 'Add Client'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddForm({
                      clientName: '',
                      clientEmail: '',
                      phone: '',
                      notes: '',
                      packageType: 'Standard',
                      packageSize: 12,
                      postsRemaining: 10,
                      paymentStatus: 'Pending',
                      platforms: { instagram: false, facebook: false, linkedin: false, youtube: false, tiktok: false, x: false },
                      isInternal: false
                    });
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

