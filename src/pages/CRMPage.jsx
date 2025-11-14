import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
  X
} from 'lucide-react';
import CRMGoogleSheetsSetup from '../components/CRMGoogleSheetsSetup';
import { CRMGoogleSheetsService } from '../services/crmGoogleSheetsService';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PERMISSIONS } from '../entities/Permissions';
import { toast } from 'react-hot-toast';

const CRMPage = () => {
  const { currentUser, currentRole, hasPermission } = useAuth();
  
  // Check permissions
  const canManageCRM = hasPermission(PERMISSIONS.MANAGE_CRM);
  const canManageLeads = hasPermission(PERMISSIONS.MANAGE_LEADS);
  const canViewLeads = hasPermission(PERMISSIONS.VIEW_LEADS);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('warm-leads');
  const [selectedClient, setSelectedClient] = useState(null);
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

  // Add New Lead modal state
  const [newLead, setNewLead] = useState({
    contactName: '',
    email: '',
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

  // Mock CRM data as fallback
  const mockData = {
    warmLeads: [
      {
        id: 1,
        contactName: 'Eddie Escobido',
        phone: '(623) 225-8893',
        email: 'eddie.escobido@theagencyre.com',
        instagram: 'escobidoluxurygroup',
        status: 'warm',
        lastContact: '2025-08-15',
        notes: 'Interested in luxury listings, has high-end clientele'
      },
      {
        id: 2,
        contactName: 'Shawnalei Tamayose',
        phone: '(808) 339-0254',
        email: 'shawna@apt212.com',
        instagram: 'shawnalei808',
        status: 'warm',
        lastContact: '2025-08-12',
        notes: 'Looking for luxury properties in Hawaii market'
      },
      {
        id: 3,
        contactName: 'ATR Luxury Homes',
        phone: '(786) 723-6041',
        email: 'morella@atrluxuryhomes.com',
        instagram: 'atrluxuryhomes',
        status: 'warm',
        lastContact: '2025-08-10',
        notes: 'Corporate client, multiple property portfolio'
      },
      {
        id: 4,
        contactName: 'Devin Kay',
        phone: '(301) 602-1172',
        email: 'Devin.Kay@elliman.com',
        instagram: 'devin__kay',
        status: 'warm',
        lastContact: '2025-08-08',
        notes: 'Douglas Elliman agent, luxury market specialist'
      },
      {
        id: 5,
        contactName: 'Shawn Shirdel',
        phone: '(310) 770-2262',
        email: 'shawn@shawnshirdel.com',
        instagram: 'shawnshirdel',
        status: 'warm',
        lastContact: '2025-08-05',
        notes: 'Luxury real estate specialist, Beverly Hills market'
      }
    ],
    contactedClients: [
      {
        id: 6,
        contactName: 'Maritt Bird',
        phone: '(310) 555-0123',
        email: 'maritt@luxuryrealty.com',
        instagram: 'marittbird',
        status: 'contacted',
        lastContact: '2025-08-14',
        notes: 'Follow up scheduled for next week'
      }
    ],
    coldLeads: [
      {
        id: 7,
        contactName: 'Alex Johnson',
        phone: '(212) 555-0456',
        email: 'alex@premiumproperties.com',
        instagram: 'alexjohnson',
        status: 'cold',
        lastContact: 'Never',
        notes: 'New lead from website inquiry'
      }
    ]
  };

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
        console.log('📂 No stored CRM data found, using mock data');
        setWarmLeads(mockData.warmLeads);
        setContactedClients(mockData.contactedClients);
        setColdLeads(mockData.coldLeads);
      }
    } catch (error) {
      console.error('Error loading stored CRM data:', error);
      // Fallback to mock data
      setWarmLeads(mockData.warmLeads);
      setContactedClients(mockData.contactedClients);
      setColdLeads(mockData.coldLeads);
    }
  };

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
          console.log('📱 Auto-sync failed, using stored data or mock data');
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
      // Fall back to mock data on error
      setWarmLeads(mockData.warmLeads);
      setContactedClients(mockData.contactedClients);
      setColdLeads(mockData.coldLeads);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new lead to Google Sheets
  const handleAddNewLead = async () => {
    if (!newLead.contactName || !newLead.email) {
      alert('Please fill in at least Contact Name and Email');
      return;
    }

    if (Object.values(selectedTabs).filter(Boolean).length === 0) {
      alert('Please select at least one tab to add the lead to');
      return;
    }

    setIsAddingLead(true);

    try {
      // Load service account credentials for write operations
      const credentials = await loadServiceAccountCredentials();
      if (!credentials) {
        throw new Error('Service account credentials not found. Please set up Google Sheets integration first.');
      }

      console.log('🔐 Service account credentials loaded:', credentials.client_email);

      // Create a new service instance with credentials
      const service = new CRMGoogleSheetsService();
      service.setServiceAccountCredentials(credentials);

      console.log('🔐 Service instance created with credentials');
      console.log('➕ Adding new lead to Google Sheets:', newLead);
      console.log('📋 Selected tabs:', selectedTabs);

      // Add lead to each selected tab
      const selectedTabKeys = Object.entries(selectedTabs)
        .filter(([key, value]) => value)
        .map(([key]) => key);
      
      console.log('📋 Processing selected tab keys:', selectedTabKeys);
      
      const results = await Promise.allSettled(
        selectedTabKeys.map(tabKey => 
          service.addNewLead(newLead, { [tabKey]: true })
        )
      );

      // Check results
      const successfulTabs = [];
      const failedTabs = [];

      results.forEach((result, index) => {
        const tabKey = selectedTabKeys[index];
        if (result.status === 'fulfilled') {
          successfulTabs.push(tabKey);
        } else {
          failedTabs.push(tabKey);
          console.error(`❌ Failed to add to ${tabKey}:`, result.reason);
        }
      });

      if (successfulTabs.length > 0) {
        // Create new lead data object
        const newLeadData = {
          id: Date.now() + Math.random(), // Generate unique ID
          contactName: newLead.contactName || '',
          email: newLead.email || '',
          phone: newLead.phone || '',
          instagram: newLead.instagram || '',
          organization: newLead.organization || '',
          website: newLead.website || '',
          notes: newLead.notes || '',
          status: 'New Lead',
          lastContact: new Date().toISOString(),
          category: successfulTabs[0] // Use first successful tab as category
        };

        // Add to ALL selected tabs (not just the first one)
        if (successfulTabs.includes('warmLeads')) {
          setWarmLeads(prev => [newLeadData, ...prev]);
        }
        if (successfulTabs.includes('contactedClients')) {
          setContactedClients(prev => [newLeadData, ...prev]);
        }
        if (successfulTabs.includes('coldLeads')) {
          setColdLeads(prev => [newLeadData, ...prev]);
        }

        // Debug: Log the newLeadData to see what's in it
        console.log('🔍 New lead data being added to state:', newLeadData);

        // Save to Firebase
        await saveCRMDataToFirebase();

        showToast(`✅ Lead added successfully to ${successfulTabs.length} tab(s): ${successfulTabs.join(', ')}`);
        
        // Reset form and close modal
        resetNewLeadForm();
        setShowAddModal(false);
        setIsAddingLead(false);
      } else {
        throw new Error('Failed to add lead to any tabs');
      }

      if (failedTabs.length > 0) {
        console.warn(`⚠️ Failed to add to ${failedTabs.length} tab(s): ${failedTabs.join(', ')}`);
      }

    } catch (error) {
      console.error('❌ Error adding new lead:', error);
      showToast(`❌ Error adding lead: ${error.message}`, 'error');
    } finally {
      setIsAddingLead(false);
    }
  };

  // Save CRM data to Firebase
  const saveCRMDataToFirebase = async () => {
    if (!currentUser?.uid) return;

    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, {
        crmData: {
          warmLeads,
          contactedClients,
          coldLeads,
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

  // Delete lead
  const deleteLead = async (client) => {
    if (!client) return;

    if (!window.confirm(`Are you sure you want to permanently delete "${client.contactName}"? This action cannot be undone.`)) {
      return;
    }

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

  const getStatusColor = (status) => {
    const colors = {
      warm: 'bg-red-100 text-red-800',
      contacted: '!bg-purple-100 !text-purple-800',
      cold: '!bg-blue-100 !text-blue-600'
    };
    return colors[status] || colors.cold;
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

  const filteredWarmLeads = warmLeads.filter(client => 
    (client.contactName && client.contactName.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.instagram && client.instagram.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.organization && client.organization.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.website && client.website.toLowerCase().includes((searchTerm || '').toLowerCase()))
  );

  const filteredContactedClients = contactedClients.filter(client => 
    (client.contactName && client.contactName.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.instagram && client.instagram.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.organization && client.organization.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.website && client.website.toLowerCase().includes((searchTerm || '').toLowerCase()))
  );

  const filteredColdLeads = coldLeads.filter(client => 
    (client.contactName && client.contactName.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.instagram && client.instagram.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.organization && client.organization.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
    (client.website && client.website.toLowerCase().includes((searchTerm || '').toLowerCase()))
  );

  const totalWarmLeads = warmLeads.length;
  const totalContacted = contactedClients.length;
  const totalColdLeads = coldLeads.length;
  const totalLeads = totalWarmLeads + totalContacted + totalColdLeads;

  const renderClientCard = (client) => (
    <Card key={client.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6 pt-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{client.contactName}</h4>
            
            {/* Organization - New prominent field */}
            {client.organization && (
              <div className="flex items-center gap-2 mt-2">
                <Building className="w-3 h-3 text-gray-400" />
                <p className="text-sm text-gray-600 font-medium">{client.organization}</p>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <Mail className="w-3 h-3 text-gray-400" />
              <p className="text-sm text-gray-600">{client.email}</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Phone className="w-3 h-3 text-gray-400" />
              <p className="text-sm text-gray-600">{client.phone}</p>
            </div>
            {client.instagram && (
              <div className="flex items-center gap-2 mt-2">
                <Instagram className="w-3 h-3 text-gray-400" />
                <p className="text-sm text-gray-600">@{client.instagram}</p>
              </div>
            )}
            
            {/* Website - New prominent field */}
            {client.website && (
              <div className="flex items-center gap-2 mt-2">
                <ExternalLink className="w-3 h-3 text-gray-400" />
                <p className="text-sm text-gray-600">{client.website}</p>
              </div>
            )}
          </div>
          <Badge className={getStatusColor(client.status)}>
            {client.status ? client.status.charAt(0).toUpperCase() + client.status.slice(1) : 'Unknown'}
          </Badge>
        </div>
        
        <div className="space-y-3 mb-5">
          {/* Notes section - now cleaner without organization/website clutter */}
          {client.notes && client.notes !== 'No additional information' && (
            <p className="text-sm text-gray-700">{client.notes}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedClient(client)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => openEditModal(client)}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your leads and client relationships</p>
          {isConnectedToGoogleSheets && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">Connected to Google Sheets</span>
              {lastSyncTime && (
                <span className="text-xs text-gray-500">
                  • Last synced: {lastSyncTime}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowGoogleSheetsSetup(!showGoogleSheetsSetup)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            {showGoogleSheetsSetup ? 'Hide Setup' : 'Google Sheets Setup'}
          </Button>
          <Button
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/1wM8g4bPituJoJFVp_Ndlv7o4p3NZMNEM2-WwuUnGvyE/edit', '_blank')}
            variant="outline"
            className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            📊 Open CRM Sheets
          </Button>
          <Button
            onClick={handleManualSync}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isLoading ? 'Syncing...' : 'Sync Data'}
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Lead
          </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Warm Leads</p>
                <p className="text-3xl font-bold text-green-900">{totalWarmLeads}</p>
              </div>
              <div className="p-3 rounded-full bg-green-200">
                <Star className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-2">Contacted</p>
                <p className="text-3xl font-bold text-blue-900">{totalContacted}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-200">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Cold Leads</p>
                <p className="text-3xl font-bold text-gray-900">{totalColdLeads}</p>
              </div>
              <div className="p-3 rounded-full bg-gray-200">
                <Clock className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-2">Total Leads</p>
                <p className="text-3xl font-bold text-purple-900">{totalLeads}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-200">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search leads by name, email, or Instagram..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('warm-leads')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'warm-leads'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Warm Leads ({totalWarmLeads})
          </button>
          <button
            onClick={() => setActiveTab('contacted')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contacted'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Contacted Before ({totalContacted})
          </button>
          <button
            onClick={() => setActiveTab('cold-leads')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cold-leads'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cold Leads ({totalColdLeads})
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'warm-leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Warm Leads</h2>
            <p className="text-sm text-gray-600">Leads showing interest and engagement</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWarmLeads.map(renderClientCard)}
          </div>
        </div>
      )}

      {activeTab === 'contacted' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Clients We've Contacted Before</h2>
            <p className="text-sm text-gray-600">Leads with previous communication history</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContactedClients.map(renderClientCard)}
          </div>
        </div>
      )}

      {activeTab === 'cold-leads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Cold Leads</h2>
            <p className="text-sm text-gray-600">Leads requiring initial outreach or re-engagement</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredColdLeads.map(renderClientCard)}
          </div>
        </div>
      )}

      {/* Add New Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 w-screen h-screen bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add New Lead</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddModal(false);
                  resetNewLeadForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* Tab Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Tabs to Add Lead To:</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTabs.warmLeads}
                      onChange={(e) => setSelectedTabs(prev => ({ ...prev, warmLeads: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Warm Leads</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTabs.contactedClients}
                      onChange={(e) => setSelectedTabs(prev => ({ ...prev, contactedClients: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Contacted Clients</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTabs.coldLeads}
                      onChange={(e) => setSelectedTabs(prev => ({ ...prev, coldLeads: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Cold Leads</span>
                  </label>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    value={newLead.contactName}
                    onChange={(e) => setNewLead(prev => ({ ...prev, contactName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newLead.phone}
                    onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                  <input
                    type="text"
                    value={newLead.instagram}
                    onChange={(e) => setNewLead(prev => ({ ...prev, instagram: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Instagram handle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  <input
                    type="text"
                    value={newLead.organization}
                    onChange={(e) => setNewLead(prev => ({ ...prev, organization: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter organization name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={newLead.website}
                    onChange={(e) => setNewLead(prev => ({ ...prev, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter website URL"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newLead.notes}
                  onChange={(e) => setNewLead(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Enter any additional notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4">
                <Button 
                  onClick={handleAddNewLead}
                  disabled={isAddingLead}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isAddingLead ? 'Adding...' : 'Add Lead'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    resetNewLeadForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 w-screen h-screen bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Lead Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClient(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <p className="text-gray-900">{selectedClient.contactName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Badge className={getStatusColor(selectedClient.status)}>
                    {selectedClient.status ? selectedClient.status.charAt(0).toUpperCase() + selectedClient.status.slice(1) : 'Unknown'}
                  </Badge>
                </div>
                
                {/* Organization - New prominent field */}
                {selectedClient.organization && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                    <p className="text-gray-900">{selectedClient.organization}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{selectedClient.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{selectedClient.phone}</p>
                </div>
                {selectedClient.instagram && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                    <p className="text-gray-900">@{selectedClient.instagram}</p>
                  </div>
                )}
                
                {/* Website - New prominent field */}
                {selectedClient.website && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <p className="text-gray-900">{selectedClient.website}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Contact</label>
                  <p className="text-gray-900">{selectedClient.lastContact}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <p className="text-gray-900">{selectedClient.notes}</p>
              </div>

              {selectedClient.followUpDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow Up Date</label>
                  <p className="text-gray-900">{selectedClient.followUpDate}</p>
                </div>
              )}

              {selectedClient.nextOutreach && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Outreach</label>
                  <p className="text-gray-900">{selectedClient.nextOutreach}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 pt-4">
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (selectedClient.phone) {
                      window.open(`tel:${selectedClient.phone.replace(/\D/g, '')}`, '_self');
                    } else {
                      alert('No phone number available for this lead');
                    }
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Lead
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    if (selectedClient.email) {
                      const subject = encodeURIComponent(`Follow up - ${selectedClient.contactName}`);
                      const body = encodeURIComponent(`Hi ${selectedClient.contactName},\n\nI hope this email finds you well. I wanted to follow up regarding our previous conversation.\n\nBest regards,\n[Your Name]`);
                      
                      // Try multiple Gmail URL formats to ensure it opens Gmail
                      const gmailUrls = [
                        `https://mail.google.com/mail/u/0/#compose?to=${encodeURIComponent(selectedClient.email)}&subject=${subject}&body=${body}`,
                        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedClient.email)}&su=${subject}&body=${body}`,
                        `https://mail.google.com/mail/u/0/#compose?to=${encodeURIComponent(selectedClient.email)}&su=${subject}&body=${body}`
                      ];
                      
                      // Try the first URL, if it fails, fall back to mailto
                      const gmailWindow = window.open(gmailUrls[0], '_blank');
                      
                      // Fallback: if Gmail doesn't open properly, use mailto
                      setTimeout(() => {
                        if (!gmailWindow || gmailWindow.closed) {
                          const mailtoUrl = `mailto:${selectedClient.email}?subject=${subject}&body=${body}`;
                          window.open(mailtoUrl, '_self');
                        }
                      }, 1000);
                    } else {
                      alert('No email address available for this lead');
                    }
                  }}
                  title="Opens Gmail compose with pre-filled details (fallback to default email client)"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Create Google Calendar event
                    const eventTitle = encodeURIComponent(`Meeting with ${selectedClient.contactName}`);
                    const eventDetails = encodeURIComponent(`Follow up meeting with ${selectedClient.contactName}\n\nNotes: ${selectedClient.notes || 'No additional notes'}`);
                    const startDate = new Date();
                    startDate.setDate(startDate.getDate() + 1); // Tomorrow
                    startDate.setHours(10, 0, 0, 0); // 10 AM
                    
                    const endDate = new Date(startDate);
                    endDate.setHours(11, 0, 0, 0); // 11 AM
                    
                    // Include lead's email as attendee if available
                    const attendees = selectedClient.email ? `&add=${encodeURIComponent(selectedClient.email)}` : '';
                    
                    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&details=${eventDetails}&dates=${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}${attendees}`;
                    
                    window.open(googleCalendarUrl, '_blank');
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Meeting
                </Button>
                {selectedClient.instagram && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const instagramUrl = `https://www.instagram.com/${selectedClient.instagram.replace('@', '')}`;
                      window.open(instagramUrl, '_blank');
                    }}
                  >
                    <Instagram className="w-4 h-4 mr-2" />
                    View Instagram
                  </Button>
                )}
              </div>

              {/* Quick Actions Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      if (selectedClient.website) {
                        window.open(selectedClient.website.startsWith('http') ? selectedClient.website : `https://${selectedClient.website}`, '_blank');
                      } else {
                        alert('No website available for this lead');
                      }
                    }}
                    className="text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Visit Website
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const notes = `Follow up with ${selectedClient.contactName} - ${new Date().toLocaleDateString()}`;
                      navigator.clipboard.writeText(notes).then(() => {
                        alert('Notes copied to clipboard!');
                      });
                    }}
                    className="text-xs"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Copy Notes
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const contactInfo = `Name: ${selectedClient.contactName}\nEmail: ${selectedClient.email}\nPhone: ${selectedClient.phone}\nInstagram: ${selectedClient.instagram || 'N/A'}\nWebsite: ${selectedClient.website || 'N/A'}`;
                      navigator.clipboard.writeText(contactInfo).then(() => {
                        alert('Contact info copied to clipboard!');
                      });
                    }}
                    className="text-xs"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Copy Contact Info
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingClient && (
        <div className="fixed inset-0 w-screen h-screen bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Lead</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <Button
                onClick={handleEditSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                onClick={handleEditCancel}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>

            {/* Delete Button */}
            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={() => deleteLead(editingClient)}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Lead
              </Button>
            </div>
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
