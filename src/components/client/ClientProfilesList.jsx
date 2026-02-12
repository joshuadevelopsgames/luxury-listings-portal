import React, { useState, useEffect } from 'react';
import { openEmailInGmail } from '../../utils/gmailCompose';
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
  Loader2,
  Archive
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
import ClientDetailModal from './ClientDetailModal';
import { useOpenClientCard } from '../../hooks/useOpenClientCard';
import { addContactToCRM, CLIENT_TYPE, CLIENT_TYPE_OPTIONS } from '../../services/crmService';
import { findPotentialDuplicateGroups, findPotentialMatchesForContact } from '../../services/clientDuplicateService';
import { useConfirm } from '../../contexts/ConfirmContext';
import { getPostsRemaining, getEnabledPlatforms } from '../../utils/clientPostsUtils';

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
  const { confirm } = useConfirm();
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { clientForModal, openClientCard, closeClientCard } = useOpenClientCard();
  const [managerFilter, setManagerFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
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
    clientType: CLIENT_TYPE.NA,
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
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [mergeChoice, setMergeChoice] = useState(null);
  const [merging, setMerging] = useState(false);
  const [possibleExistingMatches, setPossibleExistingMatches] = useState([]);

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
      const list = clientsData || [];
      setClients(list);
      const allowedManagers = (employeesData || []).filter(emp => {
        const name = (emp.displayName || emp.firstName || '').toLowerCase();
        const isSMM = emp.role === 'social_media_manager' || emp.roles?.includes('social_media_manager');
        const isAllowedUser = name.includes('michelle') || name.includes('matthew');
        return isSMM || isAllowedUser;
      });
      setEmployees(allowedManagers);
      return list;
    } catch (error) {
      console.error('Error loading data:', error);
      return [];
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

  const isPaused = (c) => c.approvalStatus === 'Paused' || c.approvalStatus === 'Pending';
  const isCancelled = (c) => c.approvalStatus === 'Cancelled' || c.approvalStatus === 'Rejected';

  // Calculate stats from displayed list (cancelled = archived, not counted in total/active)
  const nonArchived = displayClients.filter(c => !isCancelled(c));
  const stats = {
    total: nonArchived.length,
    withManager: nonArchived.filter(c => getAssignedManager(c)).length,
    withoutManager: nonArchived.filter(c => !getAssignedManager(c)).length,
    active: displayClients.filter(c => c.approvalStatus === 'Approved').length,
    paused: displayClients.filter(c => isPaused(c)).length,
    archived: displayClients.filter(c => isCancelled(c)).length
  };

  const filteredClients = displayClients.filter(client => {
    const statusNorm = client.approvalStatus?.toLowerCase();
    const isArchived = statusNorm === 'cancelled' || statusNorm === 'rejected';
    if (statusFilter === 'all' && isArchived) return false;
    if (statusFilter === 'cancelled') return isArchived;
    if (statusFilter === 'approved' && statusNorm !== 'approved') return false;
    if (statusFilter === 'paused' && statusNorm !== 'paused' && statusNorm !== 'pending') return false;

    const matchesSearch = 
      client.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.packageType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesManager = managerFilter === 'all' || 
      (managerFilter === 'unassigned' && !getAssignedManager(client)) ||
      (managerFilter !== 'unassigned' && getAssignedManager(client)?.email === managerFilter);
    const matchesPackage = packageFilter === 'all' || 
      client.packageType?.toLowerCase() === packageFilter.toLowerCase();
    return matchesSearch && matchesManager && matchesPackage;
  }).sort((a, b) => (a.clientName || '').localeCompare(b.clientName || ''));

  const handleDeleteClient = async (clientId) => {
    try {
      setDeleting(true);
      await firestoreService.deleteClient(clientId);
      toast.success('Client removed successfully');
      setShowDeleteConfirm(null);
      if (clientForModal?.id === clientId) closeClientCard();
      await loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to remove client');
    } finally {
      setDeleting(false);
    }
  };

  const doAddClient = async () => {
    const totalRemaining = addForm.postsRemaining ?? addForm.packageSize ?? 12;
    const enabled = getEnabledPlatforms({ platforms: addForm.platforms });
    let postsRemainingByPlatform = null;
    let postsUsedByPlatform = null;
    if (enabled.length > 0) {
      const perPlatform = Math.floor(totalRemaining / enabled.length);
      let remainder = totalRemaining - perPlatform * enabled.length;
      postsRemainingByPlatform = {};
      postsUsedByPlatform = {};
      enabled.forEach((key) => {
        const add = remainder > 0 ? 1 : 0;
        remainder -= add;
        postsRemainingByPlatform[key] = perPlatform + add;
        postsUsedByPlatform[key] = 0;
      });
    }
    const newClient = {
      clientName: addForm.clientName.trim(),
      clientEmail: addForm.clientEmail.trim(),
      clientType: addForm.clientType || CLIENT_TYPE.NA,
      phone: addForm.phone.trim(),
      notes: addForm.notes.trim(),
      packageType: addForm.packageType,
      packageSize: addForm.packageSize,
      postsUsed: 0,
      postsRemaining: totalRemaining,
      ...(postsRemainingByPlatform && { postsRemainingByPlatform, postsUsedByPlatform }),
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
    await addContactToCRM({
      clientName: newClient.clientName,
      clientEmail: newClient.clientEmail,
      type: newClient.clientType,
      phone: newClient.phone,
      notes: newClient.notes
    }, 'warmLeads');
    toast.success('Client added successfully and added to CRM.');
    setShowAddModal(false);
    setPossibleExistingMatches([]);
    setAddForm({
      clientName: '',
      clientEmail: '',
      clientType: CLIENT_TYPE.NA,
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
  };

  const handleAddClient = async () => {
    if (!addForm.clientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }
    if (!addForm.clientEmail?.trim()) {
      toast.error('Please enter a client email');
      return;
    }

    const matches = findPotentialMatchesForContact(displayClients, {
      name: addForm.clientName,
      email: addForm.clientEmail
    });
    if (matches.length > 0) {
      setPossibleExistingMatches(matches);
      return;
    }

    try {
      setAdding(true);
      await doAddClient();
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Failed to add client');
    } finally {
      setAdding(false);
    }
  };

  const handleAddAsNewAnyway = async () => {
    try {
      setAdding(true);
      await doAddClient();
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
                <p className="text-[12px] font-medium text-[#86868b]">Paused</p>
                <p className="text-[28px] font-semibold text-[#ff9500] mt-1">{stats.paused}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#ff9500]/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#ff9500]" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#86868b]">Archived</p>
                <p className="text-[28px] font-semibold text-[#86868b] mt-1">{stats.archived}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#86868b]/10 flex items-center justify-center">
                <Archive className="w-5 h-5 text-[#86868b]" />
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
                <option value="paused">Paused</option>
                <option value="cancelled">Archived (Cancelled)</option>
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

              {canManageClients && !internalOnly && (
                <button
                  onClick={() => {
                    const groups = findPotentialDuplicateGroups(displayClients);
                    setDuplicateGroups(groups);
                    setMergeChoice(null);
                    setShowDuplicatesModal(true);
                  }}
                  className="h-10 px-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[13px] font-medium hover:bg-amber-500/20 transition-colors"
                  title="Find clients that may be duplicates (same name/email)"
                >
                  Find duplicates
                </button>
              )}
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
              const greyOut = isPaused(client) || isCancelled(client);
              return (
                <div 
                  key={client.id} 
                  className={`grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer group items-center ${greyOut ? 'opacity-60 bg-black/[0.02] dark:bg-white/[0.02]' : ''}`}
                  onClick={() => openClientCard(client)}
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
                      {`${getPostsRemaining(client)} remaining`}
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
            const greyOut = isPaused(client) || isCancelled(client);
            return (
              <div 
                key={client.id} 
                className={`relative rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 hover:shadow-lg transition-all cursor-pointer group ${greyOut ? 'opacity-60' : ''}`}
                onClick={() => openClientCard(client)}
              >
                {/* Edit/Delete buttons at top right */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {(canManageClients || canEditPackages) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openClientCard(client); }}
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

                  <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                    <div className="h-5 w-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Package className="w-3 h-3" />
                    </div>
                    <span>{getPostsRemaining(client)} posts remaining</span>
                  </div>
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
                      openEmailInGmail(client.clientEmail);
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

      {/* Unified client card modal */}
      {clientForModal && (
        <ClientDetailModal
          client={clientForModal}
          onClose={closeClientCard}
          onClientUpdate={(updated) => {
            setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
          }}
          employees={employees}
          showManagerAssignment={true}
        />
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

      {/* Potential duplicates modal */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Potential duplicates</h2>
              <button onClick={() => { setShowDuplicatesModal(false); setDuplicateGroups([]); setMergeChoice(null); }} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                <X className="w-5 h-5 text-[#86868b]" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {duplicateGroups.length === 0 ? (
                <p className="text-[14px] text-[#86868b]">No potential duplicates found. Names and emails are compared to detect possible duplicates.</p>
              ) : (
                <p className="text-[13px] text-[#86868b] mb-4">These groups look like the same person (matching name and/or email). Pick which record to keep, then merge the others into it.</p>
              )}
              {duplicateGroups.map((group, groupIndex) => {
                const keepId = mergeChoice?.groupIndex === groupIndex ? mergeChoice.keepId : null;
                return (
                  <div key={groupIndex} className="mb-6 last:mb-0 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
                    <div className="text-[12px] font-semibold text-[#86868b] uppercase tracking-wide mb-2">Group {groupIndex + 1}</div>
                    <ul className="space-y-2 mb-3">
                      {group.map((c) => (
                        <li key={c.id} className="flex items-center justify-between gap-2 text-[14px]">
                          <span className="text-[#1d1d1f] dark:text-white font-medium">{c.clientName || c.contactName || '—'}</span>
                          <span className="text-[#86868b] truncate">{c.clientEmail || c.email || 'No email'}</span>
                          {canManageClients && (
                            <button
                              onClick={() => setMergeChoice({ groupIndex, keepId: c.id })}
                              className={`flex-shrink-0 px-2 py-1 rounded-lg text-[12px] font-medium ${keepId === c.id ? 'bg-[#34c759] text-white' : 'bg-black/10 dark:bg-white/10 text-[#86868b] hover:bg-black/15 dark:hover:bg-white/15'}`}
                            >
                              {keepId === c.id ? 'Keep' : 'Keep this one'}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {canManageClients && (
                      <button
                        disabled={!keepId || merging}
                        onClick={async () => {
                          if (!keepId) return;
                          const keepClient = group.find((c) => c.id === keepId);
                          const others = group.filter((c) => c.id !== keepId);
                          const names = others.map((c) => c.clientName || c.contactName || '—').join(', ');
                          const confirmed = await confirm({
                            title: 'Confirm merge',
                            message: `Merge ${others.length} duplicate(s) (${names}) into "${keepClient?.clientName || keepClient?.contactName || 'this client'}"? Their data will be combined and the duplicate records removed.`,
                            confirmText: 'Merge',
                            variant: 'default'
                          });
                          if (!confirmed) return;
                          setMerging(true);
                          try {
                            for (const other of others) {
                              const result = await firestoreService.mergeClientInto(keepId, other.id);
                              if (!result.success) {
                                toast.error(`Merge failed: ${result.error}`);
                                break;
                              }
                            }
                            toast.success('Duplicates merged.');
                            const nextClients = await loadData();
                            const display = internalOnly ? nextClients.filter(c => c.isInternal === true) : nextClients.filter(c => c.isInternal !== true);
                            const groups = findPotentialDuplicateGroups(display);
                            setDuplicateGroups(groups);
                            setMergeChoice(null);
                            if (groups.length === 0) setShowDuplicatesModal(false);
                          } catch (e) {
                            toast.error(e.message || 'Merge failed');
                          } finally {
                            setMerging(false);
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {merging ? 'Merging…' : `Merge ${group.length - 1} into kept record`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Possible existing client – prompt to open or add anyway */}
      {possibleExistingMatches.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full p-6 border border-black/10 dark:border-white/10 shadow-2xl">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-1">Possible existing client</h3>
            <p className="text-[13px] text-[#86868b] mb-4">
              A client with the same or similar name/email may already exist. Open existing or add as new?
            </p>
            <ul className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {possibleExistingMatches.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/5 dark:bg-white/5">
                  <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white truncate">
                    {c.clientName || c.contactName || '—'}
                  </span>
                  <span className="text-[12px] text-[#86868b] truncate">{c.clientEmail || c.email || ''}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setPossibleExistingMatches([]);
                      openClientCard(c);
                    }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed]"
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddAsNewAnyway}
                disabled={adding}
                className="flex-1 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/15 dark:hover:bg-white/15 disabled:opacity-50"
              >
                {adding ? 'Adding…' : 'Add as new anyway'}
              </button>
              <button
                type="button"
                onClick={() => setPossibleExistingMatches([])}
                className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-[#86868b] text-[13px] font-medium hover:bg-black/5 dark:hover:bg-white/5"
              >
                Cancel
              </button>
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
                    clientType: CLIENT_TYPE.NA,
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
              {!internalOnly && (
                <p className="text-[13px] text-[#86868b] mb-4">
                  This will add the client to your CRM and record today&apos;s date.
                </p>
              )}
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
                    Email *
                  </label>
                  <input
                    type="email"
                    value={addForm.clientEmail}
                    onChange={(e) => setAddForm({...addForm, clientEmail: e.target.value})}
                    placeholder="client@example.com"
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                </div>

                {!internalOnly && (
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                      Type *
                    </label>
                    <select
                      value={addForm.clientType || CLIENT_TYPE.NA}
                      onChange={(e) => setAddForm({...addForm, clientType: e.target.value})}
                      className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    >
                      {CLIENT_TYPE_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}

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
                  disabled={adding || !addForm.clientName.trim() || (!internalOnly && !addForm.clientEmail?.trim())}
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
                      clientType: CLIENT_TYPE.NA,
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

