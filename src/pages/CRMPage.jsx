import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Instagram,
  ExternalLink,
  Database,
  Settings,
  Building,
  Save,
  X,
  List,
  LayoutGrid,
  UserCheck,
  Download,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { exportCrmToXlsx } from '../utils/exportCrmToXlsx';
import { importCrmFromXlsxFile } from '../utils/importCrmFromXlsx';
import { mergeCrmDuplicates } from '../utils/mergeCrmDuplicates';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { PERMISSIONS } from '../entities/Permissions';
import { addContactToCRM, removeLeadFromCRM, CLIENT_TYPE, CLIENT_TYPE_OPTIONS, getContactTypes } from '../services/crmService';
import { findPotentialMatchesForContact } from '../services/clientDuplicateService';
import ClientLink from '../components/ui/ClientLink';
import LeadLink from '../components/crm/LeadLink';
import ClientDetailModal from '../components/client/ClientDetailModal';
import LeadDetailModal from '../components/crm/LeadDetailModal';

const CRMPage = () => {
  const navigate = useNavigate();
  const { currentUser, currentRole, hasPermission } = useAuth();
  const { confirm } = useConfirm();
  
  // Check permissions
  const canManageCRM = hasPermission(PERMISSIONS.MANAGE_CRM);
  const canManageLeads = hasPermission(PERMISSIONS.MANAGE_LEADS);
  const canViewLeads = hasPermission(PERMISSIONS.VIEW_LEADS);
  const canDeleteClients = hasPermission(PERMISSIONS.DELETE_CLIENTS);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  // Default to card view on mobile, list on desktop
  const [viewMode, setViewMode] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'card' : 'list'
  );
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null); // 'client' or 'lead'
  const [clientModalEmployees, setClientModalEmployees] = useState([]);
  const [existingClients, setExistingClients] = useState([]);
  const [loadingExistingClients, setLoadingExistingClients] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    contactName: '',
    email: '',
    phone: '',
    instagram: '',
    organization: '',
    website: '',
    notes: ''
  });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [exportingCrm, setExportingCrm] = useState(false);
  const [importingCrm, setImportingCrm] = useState(false);
  const [mergingDuplicates, setMergingDuplicates] = useState(false);
  const importFileRef = React.useRef(null);
  const addingLeadRef = useRef(false);

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Graduate lead → client: after creating client, require day-one screenshot
  const [graduateScreenshotModal, setGraduateScreenshotModal] = useState({
    show: false,
    clientId: null,
    clientName: '',
    leadId: null
  });
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [possibleExistingMatches, setPossibleExistingMatches] = useState([]);

  // Add New Lead modal state
  const [newLead, setNewLead] = useState({
    firstName: '',
    lastName: '',
    email: '',
    types: [],
    phone: '',
    instagram: '',
    organization: '',
    website: '',
    notes: '',
    location: '',
    primaryContact: { name: '', email: '', phone: '', role: '' }
  });
  const [selectedTabs, setSelectedTabs] = useState({
    warmLeads: false,
    contactedClients: false,
    coldLeads: false
  });
  const [isAddingLead, setIsAddingLead] = useState(false);

  // CRM data state
  const [warmLeads, setWarmLeads] = useState([]);
  const [contactedClients, setContactedClients] = useState([]);
  const [coldLeads, setColdLeads] = useState([]);


  // Normalize Firestore client to CRM lead shape for display
  const normalizeExistingClient = (c) => ({
    ...c,
    contactName: c.clientName || c.contactName || c.clientEmail?.split('@')[0] || '—',
    email: c.clientEmail || c.email || '',
    type: c.clientType || c.type || CLIENT_TYPE.NA,
    status: c.approvalStatus || c.status || 'client',
    lastContact: c.lastContact || '—',
    organization: c.organization || '',
    phone: c.phone || '',
    instagram: c.instagram || '',
    website: c.website || '',
    notes: c.notes || '',
    location: c.location || null,
    primaryContact: c.primaryContact || null
  });

  // Load CRM data from shared Firestore doc (all users see same leads)
  const loadStoredData = async () => {
    if (!currentUser?.uid) return;
    try {
      const { warmLeads: w, contactedClients: c, coldLeads: cold } = await firestoreService.getCrmData();
      setWarmLeads(w);
      setContactedClients(c);
      setColdLeads(cold);
      if (w.length || c.length || cold.length) {
        console.log('📂 Loaded CRM data from Firebase:', { warm: w.length, contacted: c.length, cold: cold.length });
      }
    } catch (error) {
      console.error('Error loading stored CRM data:', error);
      setWarmLeads([]);
      setContactedClients([]);
      setColdLeads([]);
    }
  };

  // Load existing clients from Firestore (clients collection)
  const loadExistingClients = async () => {
    setLoadingExistingClients(true);
    try {
      const clients = await firestoreService.getClients();
      setExistingClients(clients.map(normalizeExistingClient));
    } catch (error) {
      console.error('Error loading existing clients:', error);
      setExistingClients([]);
    } finally {
      setLoadingExistingClients(false);
    }
  };

  // Subscribe to clients collection changes so new/approved clients show up
  useEffect(() => {
    setLoadingExistingClients(true);
    const unsubscribe = firestoreService.onClientsChange((clients) => {
      setExistingClients(clients.map(normalizeExistingClient));
      setLoadingExistingClients(false);
    });
    return () => unsubscribe();
  }, []);

  // Load employees when client detail modal opens (for manager assignment, same as ClientLink)
  useEffect(() => {
    if (selectedClient && selectedItemType === 'client' && clientModalEmployees.length === 0) {
      firestoreService.getApprovedUsers().then(setClientModalEmployees).catch(console.error);
    }
    if (!selectedClient || selectedItemType !== 'client') {
      setClientModalEmployees([]);
    }
  }, [selectedClient, selectedItemType]);

  // Load CRM data on mount and subscribe to shared doc so all users see updates
  useEffect(() => {
    if (!currentUser?.uid) return;
    loadStoredData();
    const unsubscribe = firestoreService.onCrmDataChange(({ warmLeads: w, contactedClients: c, coldLeads: cold }) => {
      setWarmLeads(w);
      setContactedClients(c);
      setColdLeads(cold);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const fullContactsList = [
    ...warmLeads.map(c => ({ ...c, isExisting: false })),
    ...contactedClients.map(c => ({ ...c, isExisting: false })),
    ...coldLeads.map(c => ({ ...c, isExisting: false })),
    ...existingClients.map(c => ({ ...c, isExisting: true }))
  ];

  const doAddNewLead = async () => {
    const selectedTabKeys = Object.entries(selectedTabs)
      .filter(([key, value]) => value)
      .map(([key]) => key);
    const contactName = [newLead.firstName, newLead.lastName].filter(Boolean).join(' ').trim();
    const types = Array.isArray(newLead.types) && newLead.types.length ? newLead.types : [CLIENT_TYPE.NA];
    const loc = (newLead.location || '').trim() || null;
    const pc = newLead.primaryContact && (newLead.primaryContact.name || newLead.primaryContact.email || newLead.primaryContact.phone || newLead.primaryContact.role)
      ? { name: newLead.primaryContact.name || '', email: newLead.primaryContact.email || '', phone: newLead.primaryContact.phone || '', role: newLead.primaryContact.role || '' }
      : null;
    const newLeadData = {
      id: Date.now() + Math.random(),
      contactName: contactName || '',
      firstName: newLead.firstName || '',
      lastName: newLead.lastName || '',
      email: newLead.email || '',
      type: types[0],
      types,
      addedToCrmAt: new Date().toISOString(),
      phone: newLead.phone || '',
      instagram: newLead.instagram || '',
      organization: newLead.organization || '',
      website: newLead.website || '',
      notes: newLead.notes || '',
      location: loc,
      primaryContact: pc,
      status: selectedTabKeys[0] === 'warmLeads' ? 'warm' : selectedTabKeys[0] === 'contactedClients' ? 'contacted' : 'cold',
      lastContact: new Date().toISOString(),
      category: selectedTabKeys[0]
    };
    if (selectedTabKeys.includes('warmLeads')) setWarmLeads(prev => [newLeadData, ...prev]);
    if (selectedTabKeys.includes('contactedClients')) setContactedClients(prev => [newLeadData, ...prev]);
    if (selectedTabKeys.includes('coldLeads')) setColdLeads(prev => [newLeadData, ...prev]);
    const nextWarm = selectedTabKeys.includes('warmLeads') ? [newLeadData, ...warmLeads] : warmLeads;
    const nextContacted = selectedTabKeys.includes('contactedClients') ? [newLeadData, ...contactedClients] : contactedClients;
    const nextCold = selectedTabKeys.includes('coldLeads') ? [newLeadData, ...coldLeads] : coldLeads;
    await saveCRMDataToFirebase({ warmLeads: nextWarm, contactedClients: nextContacted, coldLeads: nextCold });
    showToast(`✅ Lead added to ${selectedTabKeys.length} tab(s): ${selectedTabKeys.join(', ')}`);
    resetNewLeadForm();
    setShowAddModal(false);
    setPossibleExistingMatches([]);
  };

  const handleAddNewLead = async () => {
    if (addingLeadRef.current) return;
    const hasName = (newLead.firstName || '').trim() || (newLead.lastName || '').trim();
    if (!hasName || !newLead.email) {
      toast.error('Please fill in at least First name, Last name, and Email');
      return;
    }
    if (Object.values(selectedTabs).filter(Boolean).length === 0) {
      toast.error('Please select at least one tab to add the lead to');
      return;
    }

    const contactName = [newLead.firstName, newLead.lastName].filter(Boolean).join(' ').trim();
    const matches = findPotentialMatchesForContact(fullContactsList, {
      name: contactName,
      email: newLead.email
    });
    if (matches.length > 0) {
      setPossibleExistingMatches(matches);
      return;
    }

    addingLeadRef.current = true;
    setIsAddingLead(true);
    try {
      await doAddNewLead();
    } catch (error) {
      console.error('❌ Error adding new lead:', error);
      showToast(`❌ Error adding lead: ${error.message}`, 'error');
    } finally {
      addingLeadRef.current = false;
      setIsAddingLead(false);
    }
  };

  // Save CRM data to shared Firestore doc (visible to all users)
  const saveCRMDataToFirebase = async (override) => {
    if (!currentUser?.uid) throw new Error('You must be signed in to save CRM data');
    const data = override ?? { warmLeads, contactedClients, coldLeads };
    await firestoreService.setCrmData({
      warmLeads: data.warmLeads ?? [],
      contactedClients: data.contactedClients ?? [],
      coldLeads: data.coldLeads ?? []
    });
    console.log('💾 CRM data saved to Firebase');
  };

  // Reset new lead form
  const resetNewLeadForm = () => {
    setNewLead({
      firstName: '',
      lastName: '',
      email: '',
      types: [],
      phone: '',
      instagram: '',
      organization: '',
      website: '',
      notes: '',
      location: '',
      primaryContact: { name: '', email: '', phone: '', role: '' }
    });
    setSelectedTabs({
      warmLeads: false,
      contactedClients: false,
      coldLeads: false
    });
  };

  // Handle edit from LeadDetailModal
  const handleEditLead = async (updatedLead) => {
    if (!updatedLead?.id) return;

    try {
      const updateClientInArray = (arr, setArr) => {
        setArr(prev => prev.map(c => c.id === updatedLead.id ? { ...c, ...updatedLead } : c));
      };
      updateClientInArray(warmLeads, setWarmLeads);
      updateClientInArray(contactedClients, setContactedClients);
      updateClientInArray(coldLeads, setColdLeads);
      await saveCRMDataToFirebase();
      showToast(`✅ Lead "${updatedLead.contactName}" updated successfully!`);
    } catch (error) {
      console.error('Error updating lead:', error);
      showToast(`❌ Error updating lead: ${error.message}`, 'error');
      throw error;
    }
  };

  // Delete lead
  const deleteLead = async (client) => {
    if (!client) return;

    const confirmed = await confirm({
      title: 'Delete Lead',
      message: `Are you sure you want to permanently delete "${client.contactName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      setWarmLeads(prev => prev.filter(c => c.id !== client.id));
      setContactedClients(prev => prev.filter(c => c.id !== client.id));
      setColdLeads(prev => prev.filter(c => c.id !== client.id));
      await saveCRMDataToFirebase();
      showToast(`✅ Lead "${client.contactName}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting lead:', error);
      showToast(`❌ Error deleting lead: ${error.message}`, 'error');
    }
  };

  // Graduate lead to client: create Firestore client then require day-one screenshot
  const handleGraduateLead = async (lead) => {
    if (!lead?.email) {
      toast.error('Lead must have an email to graduate');
      return;
    }
    const confirmed = await confirm({
      title: 'Promote to Client',
      message: `Create a client from "${lead.contactName || lead.email}"? You will be asked to upload a day-one social screenshot (required) next.`,
      confirmText: 'Continue',
      variant: 'default'
    });
    if (!confirmed) return;

    try {
      const leadTypes = getContactTypes(lead);
      const clientData = {
        clientName: lead.contactName || lead.name || lead.email.split('@')[0] || 'Unknown',
        clientEmail: lead.email,
        clientType: leadTypes[0] || CLIENT_TYPE.NA,
        clientTypes: leadTypes,
        phone: lead.phone || '',
        notes: lead.notes || '',
        location: (lead.location || '').trim() || null,
        primaryContact: lead.primaryContact || null,
        packageType: 'Standard',
        packageSize: 1,
        postsUsed: 0,
        postsRemaining: 1,
        postedOn: 'Luxury Listings',
        paymentStatus: 'Pending',
        approvalStatus: 'Approved',
        startDate: new Date().toISOString().split('T')[0],
        lastContact: new Date().toISOString().split('T')[0],
        customPrice: 0,
        overduePosts: 0
      };
      const result = await firestoreService.addClient(clientData);
      if (!result?.id) throw new Error('Failed to create client');
      setSelectedClient(null);
      setSelectedItemType(null);
      setGraduateScreenshotModal({
        show: true,
        clientId: result.id,
        clientName: clientData.clientName,
        leadId: lead.id
      });
      showToast(`Client created. Please upload day-one screenshot.`);
    } catch (error) {
      console.error('Error graduating lead:', error);
      showToast(`❌ ${error.message}`, 'error');
    }
  };

  const handleSignupScreenshotUpload = async (file) => {
    if (!file || !graduateScreenshotModal.clientId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploadingScreenshot(true);
    try {
      const storage = getStorage();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `client-screenshots/${graduateScreenshotModal.clientId}/signup_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const uploadedAt = new Date().toISOString();
      await firestoreService.updateClient(graduateScreenshotModal.clientId, {
        signupScreenshotUrl: url,
        signupScreenshotUploadedAt: uploadedAt
      });
      if (graduateScreenshotModal.leadId) {
        await removeLeadFromCRM(graduateScreenshotModal.leadId);
        setWarmLeads(prev => prev.filter(l => l.id !== graduateScreenshotModal.leadId));
        setContactedClients(prev => prev.filter(l => l.id !== graduateScreenshotModal.leadId));
        setColdLeads(prev => prev.filter(l => l.id !== graduateScreenshotModal.leadId));
      }
      setGraduateScreenshotModal({ show: false, clientId: null, clientName: '', leadId: null });
      showToast(`✅ Day-one screenshot saved. Lead promoted to client.`);
    } catch (error) {
      console.error('Screenshot upload error:', error);
      showToast(`❌ Upload failed: ${error.message}`, 'error');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const deleteExistingClient = async (client) => {
    if (!client || !canDeleteClients) return;
    const name = client.clientName || client.name || 'this client';
    const confirmed = await confirm({
      title: 'Delete Client',
      message: `Are you sure you want to permanently delete "${name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await firestoreService.deleteClient(client.id);
      setExistingClients(prev => prev.filter(c => c.id !== client.id));
      showToast(`✅ Client "${name}" deleted successfully!`);
      if (selectedClient?.id === client.id && selectedItemType === 'client') {
        setSelectedClient(null);
        setSelectedItemType(null);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast(`❌ Error deleting client: ${error.message}`, 'error');
    }
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    const colors = {
      warm: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      contacted: '!bg-purple-100 !text-purple-800 dark:!bg-purple-900/30 dark:!text-purple-300',
      cold: '!bg-blue-100 !text-blue-600 dark:!bg-blue-900/30 dark:!text-blue-300',
      client: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
      rejected: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400'
    };
    return colors[s] || colors.cold;
  };

  // For existing clients: show "Previous client" when status is paused/cancelled/rejected
  const getClientStatusLabel = (status, isExisting) => {
    const s = (status || '').toLowerCase();
    if (!isExisting) return status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : '—';
    if (s === 'paused') return 'Previous client (Paused)';
    if (s === 'cancelled' || s === 'rejected') return 'Previous client (Cancelled)';
    return status ? String(status).charAt(0).toUpperCase() + String(status).slice(1) : 'Active';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'warm':
        return <Star className="w-4 h-4 text-green-600" />;
      case 'contacted':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      case 'cold':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const matchesSearch = (client, isExisting) => {
    const q = (searchTerm || '').toLowerCase();
    const name = (client.contactName || client.clientName || '').toLowerCase();
    const email = (client.email || client.clientEmail || '').toLowerCase();
    const org = (client.organization || '').toLowerCase();
    const ig = (client.instagram || '').toLowerCase();
    const web = (client.website || '').toLowerCase();
    const loc = (client.location || '').toLowerCase();
    const pc = client.primaryContact || {};
    const pcName = (pc.name || '').toLowerCase();
    const pcEmail = (pc.email || '').toLowerCase();
    return !q || name.includes(q) || email.includes(q) || org.includes(q) || ig.includes(q) || web.includes(q) || loc.includes(q) || pcName.includes(q) || pcEmail.includes(q);
  };

  // Single combined list: warm + contacted + cold + existing, with type for filtering
  const allContacts = [
    ...warmLeads.map(c => ({ ...c, _type: 'warm', isExisting: false })),
    ...contactedClients.map(c => ({ ...c, _type: 'contacted', isExisting: false })),
    ...coldLeads.map(c => ({ ...c, _type: 'cold', isExisting: false })),
    ...existingClients.map(c => ({ ...c, _type: 'clients', isExisting: true, type: (c.clientTypes && c.clientTypes[0]) || c.clientType || c.type || CLIENT_TYPE.NA }))
  ]
    .filter(c => matchesSearch(c, c.isExisting))
    .filter(c => statusFilter === 'all' || c._type === statusFilter)
    .filter(c => typeFilter === 'all' || getContactTypes(c).includes(typeFilter))
    .filter(c => locationFilter === 'all' || (locationFilter === '_none_' ? !(c.location || '').trim() : (c.location || '').trim() === locationFilter))
    .sort((a, b) => {
      const getVal = (c, key) => {
        switch (key) {
          case 'name': return (c.contactName || c.clientName || c.email || '').toLowerCase();
          case 'email': return (c.email || c.clientEmail || '').toLowerCase();
          case 'type': return (getContactTypes(c).map(t => CLIENT_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t).join(', ') || '—').toLowerCase();
          case 'location': return ((c.location || '').trim() || '—').toLowerCase();
          case 'phone': return (c.phone || '').toLowerCase();
          case 'status': return (getClientStatusLabel(c.status, c.isExisting) || '').toLowerCase();
          default: return '';
        }
      };
      const va = getVal(a, sortBy);
      const vb = getVal(b, sortBy);
      const cmp = va.localeCompare(vb, undefined, { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalWarmLeads = warmLeads.length;
  const totalContacted = contactedClients.length;
  const totalColdLeads = coldLeads.length;
  const totalExistingClients = existingClients.length;
  const totalLeads = totalWarmLeads + totalContacted + totalColdLeads;

  const allContactsForLocations = [...warmLeads, ...contactedClients, ...coldLeads, ...existingClients];
  const uniqueLocations = [...new Set(allContactsForLocations.map(c => (c.location || '').trim()).filter(Boolean))].sort();

  const renderClientCard = (client, isExisting = false) => (
    <div key={client.id} className="p-5 rounded-2xl bg-white dark:bg-[#1d1d1f] border border-black/5 dark:border-white/10 hover:shadow-lg transition-shadow">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isExisting ? (
              <h4 className="font-medium">
                <ClientLink client={client} showId />
              </h4>
            ) : (
              <h4 className="font-medium">
                <LeadLink 
                  lead={client} 
                  onEdit={handleEditLead}
                  onDelete={canManageLeads ? deleteLead : null}
                />
              </h4>
            )}
            
            {/* Organization - New prominent field */}
            {client.organization && (
              <div className="flex items-center gap-2 mt-2">
                <Building className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">{client.organization}</p>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <Mail className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{client.email}</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Phone className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{client.phone}</p>
            </div>
            {client.instagram && (
              <div className="flex items-center gap-2 mt-2">
                <Instagram className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-gray-400">@{client.instagram}</p>
              </div>
            )}
            
            {/* Website - New prominent field */}
            {client.website && (
              <div className="flex items-center gap-2 mt-2">
                <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                <p className="text-sm text-gray-600 dark:text-gray-400">{client.website}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[11px] px-2 py-1 rounded-lg font-medium ${getStatusColor(client.status)}`}>
              {getClientStatusLabel(client.status, isExisting)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#86868b] font-medium">
              Type: {getContactTypes(client).map(t => CLIENT_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t).join(', ') || 'N/A'}
            </span>
            {client.location && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#86868b] font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {client.location}
              </span>
            )}
          </div>
        </div>
        {(client.primaryContact && (client.primaryContact.name || client.primaryContact.email)) && (
          <div className="mb-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
            <p className="text-[11px] font-medium text-[#86868b] mb-1">Primary contact</p>
            <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{client.primaryContact.name || '—'}{client.primaryContact.role ? ` · ${client.primaryContact.role}` : ''}</p>
            {client.primaryContact.email && <p className="text-[12px] text-[#86868b]">{client.primaryContact.email}</p>}
            {client.primaryContact.phone && <p className="text-[12px] text-[#86868b]">{client.primaryContact.phone}</p>}
          </div>
        )}
        <div className="space-y-3 mb-5">
          {/* Notes section - now cleaner without organization/website clutter */}
          {client.notes && client.notes !== 'No additional information' && (
            <p className="text-sm text-gray-700 dark:text-gray-300">{client.notes}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            <span>Last contact: {client.lastContact}</span>
          </div>
          {client.followUpDate && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>Follow up: {client.followUpDate}</span>
            </div>
          )}
          {client.nextOutreach && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <AlertCircle className="w-3 h-3" />
              <span>Next outreach: {client.nextOutreach}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedClient(client);
              setSelectedItemType(isExisting ? 'client' : 'lead');
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
          <button
            onClick={() => {
              setSelectedClient(client);
              setSelectedItemType(isExisting ? 'client' : 'lead');
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );

  const renderClientRow = (client, isExisting = false) => (
    <tr
      key={client.id}
      className="border-b border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
    >
      <td className="py-3 px-4">
        {isExisting ? (
          <div className="font-medium">
            <ClientLink client={client} showId />
          </div>
        ) : (
          <div className="font-medium">
            <LeadLink 
              lead={client} 
              onEdit={handleEditLead}
              onDelete={deleteLead}
            />
          </div>
        )}
        {client.organization && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{client.organization}</p>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{client.email}</td>
      <td className="py-3 px-4">
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#86868b] font-medium">
          {getContactTypes(client).map(t => CLIENT_TYPE_OPTIONS.find(o => o.value === t)?.label ?? t).join(', ') || 'N/A'}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{client.location || '—'}</td>
      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{client.phone || '—'}</td>
      <td className="py-3 px-4">
        <span className={`text-[11px] px-2 py-1 rounded-lg font-medium ${getStatusColor(client.status)}`}>
          {getClientStatusLabel(client.status, isExisting)}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedClient(client);
              setSelectedItemType(isExisting ? 'client' : 'lead');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>
          <button
            onClick={() => {
              setSelectedClient(client);
              setSelectedItemType(isExisting ? 'client' : 'lead');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
      </td>
    </tr>
  );

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
  };
  const SortHeader = ({ columnKey, label }) => (
    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300 p-0">
      <button
        type="button"
        role="button"
        tabIndex={0}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSort(columnKey);
        }}
        className="w-full text-left py-3 px-4 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-white/10 transition-colors inline-flex items-center gap-1"
      >
        {label}
        {sortBy === columnKey ? (sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />) : <span className="w-3.5 h-3.5 opacity-30"><ArrowUp className="w-3.5 h-3.5" /></span>}
      </button>
    </th>
  );

  const renderLeadList = (items, isExistingDefault = false) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
            <SortHeader columnKey="name" label="Name" />
            <SortHeader columnKey="email" label="Email" />
            <SortHeader columnKey="type" label="Type" />
            <SortHeader columnKey="location" label="Location" />
            <SortHeader columnKey="phone" label="Phone" />
            <SortHeader columnKey="status" label="Status" />
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((client) => renderClientRow(client, client.isExisting !== undefined ? client.isExisting : isExistingDefault))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">CRM Dashboard</h1>
          <p className="text-[15px] text-[#86868b] mt-1">Manage your leads and client relationships</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setImportingCrm(true);
              try {
                const { warmLeads: w, contactedClients: c, coldLeads: cold } = await importCrmFromXlsxFile(file);
                const total = w.length + c.length + cold.length;
                if (total === 0) {
                  showToast('No leads found in file', 'error');
                } else {
                  setWarmLeads(w);
                  setContactedClients(c);
                  setColdLeads(cold);
                  await saveCRMDataToFirebase({ warmLeads: w, contactedClients: c, coldLeads: cold });
                  showToast(`Imported ${total} lead${total !== 1 ? 's' : ''} from xlsx`);
                }
              } catch (err) {
                console.error(err);
                showToast('Import failed: ' + (err.message || 'invalid file'), 'error');
              } finally {
                setImportingCrm(false);
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => importFileRef.current?.click()}
            disabled={importingCrm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#af52de]/10 text-[#af52de] text-[13px] font-medium hover:bg-[#af52de]/20 transition-colors disabled:opacity-50"
          >
            {importingCrm ? 'Importing…' : 'Import from xlsx'}
          </button>
          <button
            type="button"
            onClick={async () => {
              setMergingDuplicates(true);
              try {
                const { warmLeads: w, contactedClients: c, coldLeads: cold, mergedCount } = mergeCrmDuplicates(warmLeads, contactedClients, coldLeads);
                setWarmLeads(w);
                setContactedClients(c);
                setColdLeads(cold);
                await saveCRMDataToFirebase({ warmLeads: w, contactedClients: c, coldLeads: cold });
                if (mergedCount > 0) showToast(`Merged ${mergedCount} duplicate${mergedCount !== 1 ? 's' : ''}`);
                else showToast('No duplicates found');
              } catch (err) {
                console.error(err);
                showToast('Merge failed', 'error');
              } finally {
                setMergingDuplicates(false);
              }
            }}
            disabled={mergingDuplicates}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[13px] font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            {mergingDuplicates ? 'Merging…' : 'Merge duplicates'}
          </button>
          <button
            onClick={() => {
              setExportingCrm(true);
              try {
                exportCrmToXlsx({ warmLeads, contactedClients, coldLeads, existingClients });
                showToast('CRM exported to spreadsheet');
              } catch (e) {
                console.error(e);
                showToast('Export failed', 'error');
              } finally {
                setExportingCrm(false);
              }
            }}
            disabled={exportingCrm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#34c759]/10 text-[#34c759] text-[13px] font-medium hover:bg-[#34c759]/20 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportingCrm ? 'Exporting…' : 'Export to spreadsheet'}
          </button>
          <button
            onClick={() => navigate('/clients?openAdd=1')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
          <button type="button" onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#34c759] text-white text-[13px] font-medium hover:bg-[#2db14e] transition-colors">
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-[#34c759]/5 border border-[#34c759]/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#34c759] mb-1">Warm Leads</p>
              <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">{totalWarmLeads}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#34c759]/10">
              <Star className="w-5 h-5 text-[#34c759]" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0071e3]/5 border border-[#0071e3]/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#0071e3] mb-1">Contacted</p>
              <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">{totalContacted}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0071e3]/10">
              <CheckCircle className="w-5 h-5 text-[#0071e3]" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-black/[0.02] dark:bg-white/5 border border-black/5 dark:border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#86868b] mb-1">Cold Leads</p>
              <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">{totalColdLeads}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/10">
              <Clock className="w-5 h-5 text-[#86868b]" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#af52de]/5 border border-[#af52de]/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#af52de] mb-1">Total Leads</p>
              <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">{totalLeads}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#af52de]/10">
              <Users className="w-5 h-5 text-[#af52de]" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#5856d6]/5 border border-[#5856d6]/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#5856d6] mb-1">Existing Clients</p>
              <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">{totalExistingClients}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#5856d6]/10">
              <UserCheck className="w-5 h-5 text-[#5856d6]" />
            </div>
          </div>
        </div>
      </div>

      {/* Search, filters, and view in one bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#86868b] w-4 h-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads and clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-[14px] rounded-lg bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 text-[13px] rounded-lg bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 min-w-[140px]"
        >
          <option value="all">All</option>
          <option value="warm">Warm leads ({totalWarmLeads})</option>
          <option value="cold">Cold leads ({totalColdLeads})</option>
          <option value="contacted">Contacted ({totalContacted})</option>
          <option value="clients">Existing clients ({totalExistingClients})</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 px-3 text-[13px] rounded-lg bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 min-w-[160px]"
        >
          <option value="all">All types</option>
          {CLIENT_TYPE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="h-10 px-3 text-[13px] rounded-lg bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 min-w-[140px]"
        >
          <option value="all">All locations</option>
          <option value="_none_">No location</option>
          {uniqueLocations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white dark:bg-[#2c2c2e] border border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-[#0071e3] text-white'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              viewMode === 'card'
                ? 'bg-[#0071e3] text-white'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Card
          </button>
        </div>
      </div>

      {/* Single list: A–Z by name */}
      <div className="space-y-4">
        <p className="text-[13px] text-[#86868b]">
          {allContacts.length} contact{allContacts.length !== 1 ? 's' : ''} (A–Z by name)
        </p>
        {loadingExistingClients && statusFilter === 'all' ? (
          <p className="text-[#86868b] py-8">Loading...</p>
        ) : viewMode === 'list' ? (
          renderLeadList(allContacts, false)
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allContacts.map((client) => renderClientCard(client, client.isExisting))}
          </div>
        )}
        {!loadingExistingClients && allContacts.length === 0 && (
          <p className="text-[#86868b] py-8 text-center">No contacts match the current filter and search.</p>
        )}
      </div>

      {/* Possible existing contact (CRM) – open or add anyway */}
      {possibleExistingMatches.length > 0 && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full p-6 border border-black/10 dark:border-white/10 shadow-2xl">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-1">Possible existing contact</h3>
            <p className="text-[13px] text-[#86868b] mb-4">
              A lead or client with the same or similar name/email may already exist. Open existing or add as new?
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
                      setSelectedClient(c);
                      setSelectedItemType(c.isExisting ? 'client' : 'lead');
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
                onClick={async () => {
                  if (addingLeadRef.current) return;
                  addingLeadRef.current = true;
                  setIsAddingLead(true);
                  try {
                    await doAddNewLead();
                  } catch (error) {
                    console.error('❌ Error adding new lead:', error);
                    showToast(`❌ Error adding lead: ${error.message}`, 'error');
                  } finally {
                    addingLeadRef.current = false;
                    setIsAddingLead(false);
                  }
                }}
                disabled={isAddingLead}
                className="flex-1 py-2.5 rounded-xl bg-black/10 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/15 dark:hover:bg-white/15 disabled:opacity-50"
              >
                {isAddingLead ? 'Adding…' : 'Add as new anyway'}
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
        </div>,
        document.body
      )}

      {/* Add New Lead Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 flex-shrink-0">
              <div>
                <h3 className="text-[19px] font-semibold text-[#1d1d1f] dark:text-white">Add New Lead</h3>
                <p className="text-[13px] text-[#86868b] mt-0.5">Lead will be added to your CRM and the date recorded</p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); resetNewLeadForm(); }}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[#86868b] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Type & Tabs */}
              <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#0071e3]" />
                    <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">Type & list</h4>
                  </div>
                  <p className="text-[11px] text-[#86868b] mt-0.5">Choose type and which tab(s) to add this lead to</p>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Type(s) *</label>
                    <div className="flex flex-wrap gap-3">
                      {CLIENT_TYPE_OPTIONS.map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(newLead.types || []).includes(value)}
                            onChange={(e) => {
                              const prev = newLead.types || [];
                              setNewLead(prev2 => ({
                                ...prev2,
                                types: e.target.checked ? [...prev, value] : prev.filter(t => t !== value)
                              }));
                            }}
                            className="w-4 h-4 rounded border-black/20 text-[#0071e3] focus:ring-[#0071e3]"
                          />
                          <span className="text-[13px] text-[#1d1d1f] dark:text-white">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Add to tab(s)</label>
                    <p className="text-[11px] text-[#86868b] mb-2">Warm and Cold leads are mutually exclusive; you can select Contacted Clients with either.</p>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTabs.warmLeads}
                          onChange={(e) => setSelectedTabs(prev => e.target.checked ? { ...prev, warmLeads: true, coldLeads: false } : { ...prev, warmLeads: false })}
                          className="w-4 h-4 rounded border-black/20 text-[#0071e3] focus:ring-[#0071e3]"
                        />
                        <span className="text-[13px] text-[#1d1d1f] dark:text-white">Warm Leads</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTabs.contactedClients}
                          onChange={(e) => setSelectedTabs(prev => ({ ...prev, contactedClients: e.target.checked }))}
                          className="w-4 h-4 rounded border-black/20 text-[#0071e3] focus:ring-[#0071e3]"
                        />
                        <span className="text-[13px] text-[#1d1d1f] dark:text-white">Contacted Clients</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTabs.coldLeads}
                          onChange={(e) => setSelectedTabs(prev => e.target.checked ? { ...prev, coldLeads: true, warmLeads: false } : { ...prev, coldLeads: false })}
                          className="w-4 h-4 rounded border-black/20 text-[#0071e3] focus:ring-[#0071e3]"
                        />
                        <span className="text-[13px] text-[#1d1d1f] dark:text-white">Cold Leads</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact details */}
              <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#0071e3]" />
                    <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">Contact details</h4>
                  </div>
                  <p className="text-[11px] text-[#86868b] mt-0.5">Name and email required</p>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">First name *</label>
                      <input type="text" value={newLead.firstName} onChange={(e) => setNewLead(prev => ({ ...prev, firstName: e.target.value }))} placeholder="First name" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Last name *</label>
                      <input type="text" value={newLead.lastName} onChange={(e) => setNewLead(prev => ({ ...prev, lastName: e.target.value }))} placeholder="Last name" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Email *</label>
                      <input type="email" value={newLead.email} onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Phone</label>
                      <input type="tel" value={newLead.phone} onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Instagram</label>
                      <input type="text" value={newLead.instagram} onChange={(e) => setNewLead(prev => ({ ...prev, instagram: e.target.value }))} placeholder="@handle" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Organization</label>
                      <input type="text" value={newLead.organization} onChange={(e) => setNewLead(prev => ({ ...prev, organization: e.target.value }))} placeholder="Company or brand" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Website</label>
                      <input type="url" value={newLead.website} onChange={(e) => setNewLead(prev => ({ ...prev, website: e.target.value }))} placeholder="https://…" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Location</label>
                    <input type="text" value={newLead.location || ''} onChange={(e) => setNewLead(prev => ({ ...prev, location: e.target.value }))} placeholder="City, region, or country" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">Notes</label>
                    <textarea value={newLead.notes} onChange={(e) => setNewLead(prev => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Additional notes" className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none" />
                  </div>
                  <div className="border-t border-black/5 dark:border-white/10 pt-4">
                    <h4 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white mb-3">Primary contact (optional)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[#86868b] mb-1">Name</label>
                        <input type="text" value={newLead.primaryContact?.name || ''} onChange={(e) => setNewLead(prev => ({ ...prev, primaryContact: { ...(prev.primaryContact || {}), name: e.target.value } }))} placeholder="Contact name" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px]" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#86868b] mb-1">Email</label>
                        <input type="email" value={newLead.primaryContact?.email || ''} onChange={(e) => setNewLead(prev => ({ ...prev, primaryContact: { ...(prev.primaryContact || {}), email: e.target.value } }))} placeholder="contact@example.com" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px]" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#86868b] mb-1">Phone</label>
                        <input type="tel" value={newLead.primaryContact?.phone || ''} onChange={(e) => setNewLead(prev => ({ ...prev, primaryContact: { ...(prev.primaryContact || {}), phone: e.target.value } }))} placeholder="+1 (555) 000-0000" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px]" />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#86868b] mb-1">Role</label>
                        <input type="text" value={newLead.primaryContact?.role || ''} onChange={(e) => setNewLead(prev => ({ ...prev, primaryContact: { ...(prev.primaryContact || {}), role: e.target.value } }))} placeholder="e.g. Marketing Manager" className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 text-[14px]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button type="button" onClick={handleAddNewLead} disabled={isAddingLead} className="flex-1 h-11 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  {isAddingLead ? 'Adding…' : 'Add Lead'}
                </button>
                <button onClick={() => { setShowAddModal(false); resetNewLeadForm(); }} className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/5 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Client Detail Modal - for existing clients (same as ClientLink modal: employees + manager assignment) */}
      {selectedClient && selectedItemType === 'client' && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => {
            setSelectedClient(null);
            setSelectedItemType(null);
          }}
          onClientUpdate={(updatedClient) => {
            setExistingClients(prev => 
              prev.map(c => c.id === updatedClient.id ? updatedClient : c)
            );
          }}
          employees={clientModalEmployees}
          showManagerAssignment={true}
        />
      )}

      {/* Lead Detail Modal - for CRM leads */}
      {selectedClient && selectedItemType === 'lead' && (
        <LeadDetailModal
          lead={selectedClient}
          onClose={() => {
            setSelectedClient(null);
            setSelectedItemType(null);
          }}
          onEdit={handleEditLead}
          onDelete={deleteLead}
          onGraduate={handleGraduateLead}
          canEdit={true}
        />
      )}

      {/* Graduate: required day-one screenshot upload */}
      {graduateScreenshotModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full p-6 border border-black/10 dark:border-white/10 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#1d1d1f] dark:text-white mb-1">Day-one screenshot (required)</h3>
            <p className="text-[13px] text-[#86868b] mb-4">
              Upload a screenshot of followers/insights for {graduateScreenshotModal.clientName}. This completes promoting the lead to a client.
            </p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#86868b]/30 rounded-xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingScreenshot}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleSignupScreenshotUpload(f);
                  e.target.value = '';
                }}
              />
              {uploadingScreenshot ? (
                <span className="text-[#0071e3]">Uploading…</span>
              ) : (
                <span className="text-[13px] text-[#86868b]">Click or drop image</span>
              )}
            </label>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : toast.type === 'error' 
            ? 'bg-red-500 text-white' 
            : 'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMPage;
