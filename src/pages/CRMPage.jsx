import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  RefreshCw,
  Settings,
  Building,
  Save,
  X,
  List,
  LayoutGrid,
  UserCheck
} from 'lucide-react';
import CRMGoogleSheetsSetup from '../components/CRMGoogleSheetsSetup';
import { CRMGoogleSheetsService } from '../services/crmGoogleSheetsService';
import { firestoreService } from '../services/firestoreService';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../firebase';
import { PERMISSIONS } from '../entities/Permissions';
import { addContactToCRM, removeLeadFromCRM, CLIENT_TYPE, CLIENT_TYPE_OPTIONS } from '../services/crmService';
import { findPotentialMatchesForContact } from '../services/clientDuplicateService';
import ClientLink from '../components/ui/ClientLink';
import LeadLink from '../components/crm/LeadLink';
import ClientDetailModal from '../components/client/ClientDetailModal';
import LeadDetailModal from '../components/crm/LeadDetailModal';

const CRMPage = () => {
  const { currentUser, currentRole, hasPermission } = useAuth();
  const { confirm } = useConfirm();
  
  // Initialize CRM service instance
  const crmService = new CRMGoogleSheetsService();
  
  // Check permissions
  const canManageCRM = hasPermission(PERMISSIONS.MANAGE_CRM);
  const canManageLeads = hasPermission(PERMISSIONS.MANAGE_LEADS);
  const canViewLeads = hasPermission(PERMISSIONS.VIEW_LEADS);
  const canDeleteClients = hasPermission(PERMISSIONS.DELETE_CLIENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'warm' | 'cold' | 'contacted' | 'clients'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'SMM' | 'PP' | 'BOTH' | 'N/A'
  // Default to card view on mobile, list on desktop
  const [viewMode, setViewMode] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'card' : 'list'
  );
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState(null); // 'client' or 'lead'
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

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editForm, setEditForm] = useState({
    contactName: '',
    email: '',
    type: CLIENT_TYPE.NA,
    phone: '',
    instagram: '',
    organization: '',
    website: '',
    notes: ''
  });

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const [showGoogleSheetsSetup, setShowGoogleSheetsSetup] = useState(false);
  const [isConnectedToGoogleSheets, setIsConnectedToGoogleSheets] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
    contactName: '',
    email: '',
    type: CLIENT_TYPE.NA,
    phone: '',
    instagram: '',
    organization: '',
    website: '',
    notes: ''
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
    notes: c.notes || ''
  });

  // Load stored data from Firebase
  const loadStoredData = async () => {
    if (!currentUser?.uid) return;

    try {
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().crmData) {
        const storedData = docSnap.data().crmData;
        console.log('📂 Loaded CRM data from Firebase:', storedData);
        
        if (storedData.warmLeads && storedData.warmLeads.length > 0) {
          setWarmLeads(storedData.warmLeads);
        }
        if (storedData.contactedClients && storedData.contactedClients.length > 0) {
          setContactedClients(storedData.contactedClients);
        }
        if (storedData.coldLeads && storedData.coldLeads.length > 0) {
          setColdLeads(storedData.coldLeads);
        }
      } else {
        console.log('📂 No stored CRM data found, starting with empty arrays');
        setWarmLeads([]);
        setContactedClients([]);
        setColdLeads([]);
      }
    } catch (error) {
      console.error('Error loading stored CRM data:', error);
      // Start with empty arrays on error
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

  // Load service account credentials for write operations
  const loadServiceAccountCredentials = async () => {
    try {
      console.log('🔍 Attempting to load service account credentials...');
      const docRef = doc(db, 'crm_config', 'google_sheets');
      const docSnap = await getDoc(docRef);
      
      console.log('🔍 Firestore document exists:', docSnap.exists());
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('🔍 Firestore document data:', data);
        console.log('🔍 Has serviceAccountCredentials:', !!data.serviceAccountCredentials);
        
        if (data.serviceAccountCredentials) {
          const credentials = data.serviceAccountCredentials;
          console.log('🔐 Loaded service account credentials:', credentials.client_email);
          return credentials;
        } else {
          console.log('🔐 No serviceAccountCredentials field in document');
          return null;
        }
      } else {
        console.log('🔐 No crm_config document found');
        return null;
      }
    } catch (error) {
      console.error('Error loading service account credentials:', error);
      return null;
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadStoredData();
  }, [currentUser?.uid]);

  // Auto-sync on page refresh if connected to Google Sheets
  useEffect(() => {
    // Auto-sync should run when component mounts and user is authenticated
    if (currentUser?.uid && !isLoading) {
      const autoSync = async () => {
        console.log('🔄 Auto-syncing CRM data on page refresh...');
        try {
          const service = new CRMGoogleSheetsService();
          const data = await service.fetchCRMData();
          await handleGoogleSheetsDataLoaded(data);
          console.log('✅ Auto-sync completed successfully');
        } catch (error) {
          console.error('❌ Auto-sync failed:', error);
          // Don't show error to user for auto-sync, but log it
          console.log('📱 Auto-sync failed, using stored data');
        }
      };

      // Small delay to ensure component is fully loaded
      const timer = setTimeout(autoSync, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.uid, isLoading]); // Removed isConnectedToGoogleSheets dependency

  // Handle Google Sheets data loading
  const handleGoogleSheetsDataLoaded = async (data) => {
    if (data && typeof data === 'object') {
      // Update the leads state with the fetched data
      setWarmLeads(data.warmLeads || []);
      setContactedClients(data.contactedClients || []);
      setColdLeads(data.coldLeads || []);
      
      // Update connection status
      setIsConnectedToGoogleSheets(true);
      const syncTime = new Date().toLocaleString();
      setLastSyncTime(syncTime);
      
      // Save data to local storage for persistence
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, {
          warmLeads: data.warmLeads || [],
          contactedClients: data.contactedClients || [],
          coldLeads: data.coldLeads || [],
          lastSyncTime: syncTime,
          isConnectedToGoogleSheets: true
        });
        console.log('💾 CRM data saved to Firebase for user:', currentUser.uid);
      } catch (error) {
        console.error('❌ Error saving CRM data to Firebase:', error);
      }
      
      console.log('✅ CRM data loaded from Google Sheets:', {
        warmLeads: data.warmLeads?.length || 0,
        contactedClients: data.contactedClients?.length || 0,
        coldLeads: data.coldLeads?.length || 0
      });
    }
  };

  const handleConnectionStatusChange = (isConnected) => {
    setIsConnectedToGoogleSheets(isConnected);
    if (!isConnected) {
      setLastSyncTime(null);
      // Clear Firebase CRM data when disconnecting
      clearFirebaseCRMData();
    }
    console.log('🔄 CRM connection status changed:', isConnected);
  };

  // Clear Firebase CRM data
  const clearFirebaseCRMData = async () => {
    try {
      if (currentUser?.uid) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, {
          warmLeads: [],
          contactedClients: [],
          coldLeads: [],
          lastSyncTime: null,
          isConnectedToGoogleSheets: false
        }, { merge: true });
        console.log('🗑️ Cleared Firebase CRM data for user:', currentUser.uid);
      }
    } catch (error) {
      console.error('❌ Error clearing Firebase CRM data:', error);
    }
  };

  // Manual sync with Google Sheets
  const handleManualSync = async () => {
    if (!isConnectedToGoogleSheets) {
      setShowGoogleSheetsSetup(true);
      return;
    }

    setIsLoading(true);
    try {
      const service = new CRMGoogleSheetsService();
      const data = await service.fetchCRMData();
      handleGoogleSheetsDataLoaded(data);
      setLastSyncTime(new Date().toLocaleString());
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      // Start with empty arrays on error
      setWarmLeads([]);
      setContactedClients([]);
      setColdLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

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
    const newLeadData = {
      id: Date.now() + Math.random(),
      contactName: newLead.contactName || '',
      email: newLead.email || '',
      type: newLead.type || CLIENT_TYPE.NA,
      addedToCrmAt: new Date().toISOString(),
      phone: newLead.phone || '',
      instagram: newLead.instagram || '',
      organization: newLead.organization || '',
      website: newLead.website || '',
      notes: newLead.notes || '',
      status: 'New Lead',
      lastContact: new Date().toISOString(),
      category: selectedTabKeys[0]
    };
    const credentials = await loadServiceAccountCredentials();
    if (credentials) {
      const service = new CRMGoogleSheetsService();
      service.setServiceAccountCredentials(credentials);
      const results = await Promise.allSettled(
        selectedTabKeys.map(tabKey => service.addNewLead(newLead, { [tabKey]: true }))
      );
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') {
          console.error(`❌ Failed to add to ${selectedTabKeys[index]}:`, result.reason);
        }
      });
    }
    if (selectedTabKeys.includes('warmLeads')) setWarmLeads(prev => [newLeadData, ...prev]);
    if (selectedTabKeys.includes('contactedClients')) setContactedClients(prev => [newLeadData, ...prev]);
    if (selectedTabKeys.includes('coldLeads')) setColdLeads(prev => [newLeadData, ...prev]);
    const nextWarm = selectedTabKeys.includes('warmLeads') ? [newLeadData, ...warmLeads] : warmLeads;
    const nextContacted = selectedTabKeys.includes('contactedClients') ? [newLeadData, ...contactedClients] : contactedClients;
    const nextCold = selectedTabKeys.includes('coldLeads') ? [newLeadData, ...coldLeads] : coldLeads;
    await saveCRMDataToFirebase({ warmLeads: nextWarm, contactedClients: nextContacted, coldLeads: nextCold });
    showToast(credentials
      ? `✅ Lead added to ${selectedTabKeys.length} tab(s): ${selectedTabKeys.join(', ')}`
      : `✅ Lead added locally (connect Google Sheets in settings to sync).`);
    resetNewLeadForm();
    setShowAddModal(false);
    setPossibleExistingMatches([]);
  };

  // Add new lead to Google Sheets
  const handleAddNewLead = async () => {
    if (!newLead.contactName || !newLead.email) {
      toast.error('Please fill in at least Contact Name and Email');
      return;
    }
    if (Object.values(selectedTabs).filter(Boolean).length === 0) {
      toast.error('Please select at least one tab to add the lead to');
      return;
    }

    const matches = findPotentialMatchesForContact(fullContactsList, {
      name: newLead.contactName,
      email: newLead.email
    });
    if (matches.length > 0) {
      setPossibleExistingMatches(matches);
      return;
    }

    setIsAddingLead(true);
    try {
      await doAddNewLead();
    } catch (error) {
      console.error('❌ Error adding new lead:', error);
      showToast(`❌ Error adding lead: ${error.message}`, 'error');
    } finally {
      setIsAddingLead(false);
    }
  };

  // Save CRM data to Firebase (optional override when state may not have flushed yet)
  const saveCRMDataToFirebase = async (override) => {
    if (!currentUser?.uid) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const data = override || {
        warmLeads,
        contactedClients,
        coldLeads
      };
      await setDoc(userDocRef, {
        crmData: {
          ...data,
          lastSyncTime: new Date().toLocaleString()
        }
      }, { merge: true });
      console.log('💾 CRM data saved to Firebase');
    } catch (error) {
      console.error('Error saving CRM data to Firebase:', error);
    }
  };

  // Reset new lead form
  const resetNewLeadForm = () => {
    setNewLead({
      contactName: '',
      email: '',
      type: CLIENT_TYPE.NA,
      phone: '',
      instagram: '',
      organization: '',
      website: '',
      notes: ''
    });
    setSelectedTabs({
      warmLeads: false,
      contactedClients: false,
      coldLeads: false
    });
  };

  // Open edit modal
  const openEditModal = (client) => {
    setEditingClient(client);
    setEditForm({
      contactName: client.contactName || '',
      email: client.email || '',
      type: client.type || CLIENT_TYPE.NA,
      phone: client.phone || '',
      instagram: client.instagram || '',
      organization: client.organization || '',
      website: client.website || '',
      notes: client.notes || ''
    });
    setShowEditModal(true);
  };

  // Handle edit submit
  const handleEditSubmit = async () => {
    if (!editingClient) return;

    try {
      // Update the client data in Google Sheets via Google Apps Script
      const params = new URLSearchParams({
        action: 'updateLead',
        leadData: JSON.stringify({
          id: editingClient.id,
          contactName: editForm.contactName,
          email: editForm.email,
          type: editForm.type || CLIENT_TYPE.NA,
          phone: editForm.phone,
          instagram: editForm.instagram,
          organization: editForm.organization,
          website: editForm.website,
          notes: editForm.notes
        })
      });

      const response = await fetch(`${crmService.googleAppsScriptUrl}?${params.toString()}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to update lead: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Update failed');
      }

      // Update local state
      const updateClientInArray = (array, setArray) => {
        setArray(prev => prev.map(client => 
          client.id === editingClient.id 
            ? { ...client, ...editForm }
            : client
        ));
      };

      // Update in all arrays (in case the lead is in multiple tabs)
      updateClientInArray(warmLeads, setWarmLeads);
      updateClientInArray(contactedClients, setContactedClients);
      updateClientInArray(coldLeads, setColdLeads);

      // Save to Firebase
      await saveCRMDataToFirebase();

      showToast(`✅ Lead "${editForm.contactName}" updated successfully!`);
      
      // Close modal and reset state
      setShowEditModal(false);
      setEditingClient(null);
      setEditForm({
        contactName: '',
        email: '',
        phone: '',
        instagram: '',
        organization: '',
        website: '',
        notes: ''
      });

    } catch (error) {
      console.error('Error updating lead:', error);
      showToast(`❌ Error updating lead: ${error.message}`, 'error');
    }
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingClient(null);
    setEditForm({
      contactName: '',
      email: '',
      phone: '',
      instagram: '',
      organization: '',
      website: '',
      notes: ''
    });
  };

  // Handle edit from LeadDetailModal
  const handleEditLead = async (updatedLead) => {
    if (!updatedLead?.id) return;

    try {
      // Update the client data in Google Sheets via Google Apps Script
      const params = new URLSearchParams({
        action: 'updateLead',
        leadData: JSON.stringify({
          id: updatedLead.id,
          contactName: updatedLead.contactName,
          email: updatedLead.email,
          type: updatedLead.type || CLIENT_TYPE.NA,
          phone: updatedLead.phone,
          instagram: updatedLead.instagram,
          organization: updatedLead.organization,
          website: updatedLead.website,
          notes: updatedLead.notes,
          status: updatedLead.status
        })
      });

      if (crmService.config?.scriptUrl) {
        await fetch(`${crmService.config.scriptUrl}?${params.toString()}`);
      }

      // Update in local arrays
      const updateClientInArray = (arr, setArr) => {
        setArr(prev => prev.map(c => c.id === updatedLead.id ? { ...c, ...updatedLead } : c));
      };

      updateClientInArray(warmLeads, setWarmLeads);
      updateClientInArray(contactedClients, setContactedClients);
      updateClientInArray(coldLeads, setColdLeads);

      // Save to Firebase
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
      // Delete from Google Sheets via Google Apps Script
      const params = new URLSearchParams({
        action: 'deleteLead',
        leadData: JSON.stringify({
          id: client.id,
          contactName: client.contactName
        })
      });

      const response = await fetch(`${crmService.googleAppsScriptUrl}?${params.toString()}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete lead: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }

      // Remove from all local arrays
      setWarmLeads(prev => prev.filter(c => c.id !== client.id));
      setContactedClients(prev => prev.filter(c => c.id !== client.id));
      setColdLeads(prev => prev.filter(c => c.id !== client.id));

      // Save to Firebase
      await saveCRMDataToFirebase();

      showToast(`✅ Lead "${client.contactName}" deleted successfully!`);
      
      // Close modal if it was open
      if (showEditModal && editingClient?.id === client.id) {
        setShowEditModal(false);
        setEditingClient(null);
      }

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
      title: 'Graduate to Client',
      message: `Create a client from "${lead.contactName || lead.email}"? You will be asked to upload a day-one social screenshot (required) next.`,
      confirmText: 'Continue',
      variant: 'default'
    });
    if (!confirmed) return;

    try {
      const clientData = {
        clientName: lead.contactName || lead.name || lead.email.split('@')[0] || 'Unknown',
        clientEmail: lead.email,
        clientType: lead.type || CLIENT_TYPE.NA,
        phone: lead.phone || '',
        notes: lead.notes || '',
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
      showToast(`✅ Day-one screenshot saved. Lead graduated to client.`);
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
    return !q || name.includes(q) || email.includes(q) || org.includes(q) || ig.includes(q) || web.includes(q);
  };

  // Single combined list: warm + contacted + cold + existing, with type for filtering
  const allContacts = [
    ...warmLeads.map(c => ({ ...c, _type: 'warm', isExisting: false })),
    ...contactedClients.map(c => ({ ...c, _type: 'contacted', isExisting: false })),
    ...coldLeads.map(c => ({ ...c, _type: 'cold', isExisting: false })),
    ...existingClients.map(c => ({ ...c, _type: 'clients', isExisting: true, type: c.clientType || c.type || CLIENT_TYPE.NA }))
  ]
    .filter(c => matchesSearch(c, c.isExisting))
    .filter(c => statusFilter === 'all' || c._type === statusFilter)
    .filter(c => typeFilter === 'all' || (c.type || CLIENT_TYPE.NA) === typeFilter)
    .sort((a, b) => {
      const nameA = (a.contactName || a.clientName || a.email || '').toLowerCase();
      const nameB = (b.contactName || b.clientName || b.email || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const totalWarmLeads = warmLeads.length;
  const totalContacted = contactedClients.length;
  const totalColdLeads = coldLeads.length;
  const totalExistingClients = existingClients.length;
  const totalLeads = totalWarmLeads + totalContacted + totalColdLeads;

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
              Type: {client.type || CLIENT_TYPE.NA}
            </span>
          </div>
        </div>
        
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
            View Details
          </button>
          {!isExisting && (
            <button 
              onClick={() => openEditModal(client)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
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
          {client.type || CLIENT_TYPE.NA}
        </span>
      </td>
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
          {!isExisting && (
            <button
              onClick={() => openEditModal(client)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  const renderLeadList = (items, isExistingDefault = false) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Name</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Email</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Type</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Phone</th>
            <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
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
          {isConnectedToGoogleSheets && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="w-4 h-4 text-[#34c759]" />
              <span className="text-[13px] text-[#34c759]">Connected to Google Sheets</span>
              {lastSyncTime && (
                <span className="text-[11px] text-[#86868b]">
                  • Last synced: {lastSyncTime}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowGoogleSheetsSetup(!showGoogleSheetsSetup)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
          >
            <Database className="w-4 h-4" />
            {showGoogleSheetsSetup ? 'Hide Setup' : 'Setup'}
          </button>
          <button
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/1wM8g4bPituJoJFVp_Ndlv7o4p3NZMNEM2-WwuUnGvyE/edit', '_blank')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-medium hover:bg-[#0071e3]/20 transition-colors"
          >
            📊 Open Sheets
          </button>
          <button
            onClick={handleManualSync}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Sync'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#34c759] text-white text-[13px] font-medium hover:bg-[#2db14e] transition-colors">
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Google Sheets Setup */}
      {showGoogleSheetsSetup && (
        <CRMGoogleSheetsSetup
          onDataLoaded={handleGoogleSheetsDataLoaded}
          onConnectionStatusChange={handleConnectionStatusChange}
        />
      )}

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

      {/* Search and view toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative max-w-xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#86868b] w-4 h-4" />
          <input
            type="text"
            placeholder="Search leads and clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-[#2c2c2e] text-[#0071e3] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
              viewMode === 'card'
                ? 'bg-white dark:bg-[#2c2c2e] text-[#0071e3] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Card
          </button>
        </div>
      </div>

      {/* Filter: single list, filter by type */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[13px] text-[#86868b] mr-1">Filter:</span>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-[#0071e3] text-white'
              : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('warm')}
          className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
            statusFilter === 'warm'
              ? 'bg-[#34c759] text-white'
              : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
          }`}
        >
          Warm leads ({totalWarmLeads})
        </button>
        <button
          onClick={() => setStatusFilter('cold')}
          className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
            statusFilter === 'cold'
              ? 'bg-[#86868b] text-white'
              : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
          }`}
        >
          Cold leads ({totalColdLeads})
        </button>
        <button
          onClick={() => setStatusFilter('contacted')}
          className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
            statusFilter === 'contacted'
              ? 'bg-[#0071e3] text-white'
              : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
          }`}
        >
          Contacted ({totalContacted})
        </button>
        <button
          onClick={() => setStatusFilter('clients')}
          className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
            statusFilter === 'clients'
              ? 'bg-[#5856d6] text-white'
              : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
          }`}
        >
          Existing clients ({totalExistingClients})
        </button>
      </div>

      {/* Type filter: SMM, PP, BOTH, N/A */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[13px] text-[#86868b] mr-1">Type:</span>
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
            typeFilter === 'all'
              ? 'bg-[#0071e3] text-white'
              : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
          }`}
        >
          All
        </button>
        {CLIENT_TYPE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTypeFilter(value)}
            className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
              typeFilter === value
                ? 'bg-[#5856d6] text-white'
                : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
            }`}
          >
            {label}
          </button>
        ))}
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
                  setIsAddingLead(true);
                  try {
                    await doAddNewLead();
                  } catch (error) {
                    console.error('❌ Error adding new lead:', error);
                    showToast(`❌ Error adding lead: ${error.message}`, 'error');
                  } finally {
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New Lead</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetNewLeadForm();
                }}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b] transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-[13px] text-[#86868b] mb-4">
              This is the same process used across the site. This lead will automatically be added to your CRM and the date will be recorded.
            </p>
            
            <div className="space-y-4">
              {/* Tab Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e7] mb-2">Select Tabs to Add Lead To:</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTabs.warmLeads}
                      onChange={(e) => setSelectedTabs(prev => ({ ...prev, warmLeads: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-[#e5e5e7]">Warm Leads</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTabs.contactedClients}
                      onChange={(e) => setSelectedTabs(prev => ({ ...prev, contactedClients: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-[#e5e5e7]">Contacted Clients</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTabs.coldLeads}
                      onChange={(e) => setSelectedTabs(prev => ({ ...prev, coldLeads: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-[#e5e5e7]">Cold Leads</span>
                  </label>
                </div>
              </div>

              {/* Type - required */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e7] mb-1">Type *</label>
                <select
                  value={newLead.type || CLIENT_TYPE.NA}
                  onChange={(e) => setNewLead(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CLIENT_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e7] mb-1">Contact Name *</label>
                  <input
                    type="text"
                    value={newLead.contactName}
                    onChange={(e) => setNewLead(prev => ({ ...prev, contactName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e7] mb-1">Email *</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e7] mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newLead.phone}
                    onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e7] mb-1">Instagram</label>
                  <input
                    type="text"
                    value={newLead.instagram}
                    onChange={(e) => setNewLead(prev => ({ ...prev, instagram: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Instagram handle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#e5e5e7] mb-1">Organization</label>
                  <input
                    type="text"
                    value={newLead.organization}
                    onChange={(e) => setNewLead(prev => ({ ...prev, organization: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter organization name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={newLead.website}
                    onChange={(e) => setNewLead(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter website URL"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newLead.notes}
                  onChange={(e) => setNewLead(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Enter any additional notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4">
                <button 
                  onClick={handleAddNewLead}
                  disabled={isAddingLead}
                  className="px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                >
                  {isAddingLead ? 'Adding...' : 'Add Lead'}
                </button>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    resetNewLeadForm();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Client Detail Modal - for existing clients */}
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
          showManagerAssignment={false}
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
              Upload a screenshot of followers/insights for {graduateScreenshotModal.clientName}. This completes the graduate flow.
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

      {/* Edit Modal */}
      {showEditModal && editingClient && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-6 w-full max-w-md mx-4 border border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Lead</h3>
              <button
                onClick={handleEditCancel}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={editForm.contactName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, contactName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={editForm.type || CLIENT_TYPE.NA}
                  onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CLIENT_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram
                </label>
                <input
                  type="text"
                  value={editForm.instagram}
                  onChange={(e) => setEditForm(prev => ({ ...prev, instagram: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  value={editForm.organization}
                  onChange={(e) => setEditForm(prev => ({ ...prev, organization: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-md bg-white dark:bg-white/5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleEditSubmit}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={handleEditCancel}
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Delete Button */}
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => deleteLead(editingClient)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff3b30] text-white text-[14px] font-medium hover:bg-[#e5342b] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Lead
              </button>
            </div>
          </div>
        </div>,
        document.body
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
