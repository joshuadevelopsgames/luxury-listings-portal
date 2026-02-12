import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  Users, 
  Package, 
  Calendar, 
  DollarSign, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  Archive,
  Plus,
  Minus,
  Filter,
  Search,
  Mail,
  AlertCircle,
  Clock,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { PERMISSIONS } from '../entities/Permissions';
import { toast } from 'react-hot-toast';
import { API_KEYS, GOOGLE_SHEETS_CONFIG } from '../config/apiKeys';
import { firestoreService } from '../services/firestoreService';
import PlatformIcons from '../components/PlatformIcons';
import ClientLink from '../components/ui/ClientLink';
import ClientDetailModal from '../components/client/ClientDetailModal';
import { useOpenClientCard } from '../hooks/useOpenClientCard';
import { Camera } from 'lucide-react';
import { openEmailInGmail } from '../utils/gmailCompose';
import { addContactToCRM, getCrmLeadsForCurrentUser, CLIENT_TYPE, CLIENT_TYPE_OPTIONS } from '../services/crmService';

// Posts per page: 4 columns for reporting (backward compat: client.postedOn can still be a summary string from Sheets)
const POST_PAGES = [
  { key: 'postsLuxuryListings', label: 'Luxury Listings' },
  { key: 'postsIgMansions', label: 'IG Mansions' },
  { key: 'postsIgInteriors', label: 'IG Interiors' },
  { key: 'postsLuxuryHomes', label: 'Luxury Homes' }
];
function getPostsPerPageSummary(c) {
  if (!c) return '—';
  const a = POST_PAGES.map(({ key, label }) => {
    const n = c[key] != null ? Number(c[key]) : 0;
    return n ? `${n} ${label.replace(/^IG /, '')}` : null;
  }).filter(Boolean);
  return a.length ? a.join(', ') : (c.postedOn || '—');
}

export default function PostingPackages() {
  const [searchParams] = useSearchParams();
  const { currentUser, hasPermission } = useAuth();
  const { confirm } = useConfirm();
  
  // Check permissions
  const canManagePackages = hasPermission(PERMISSIONS.MANAGE_POSTING_PACKAGES);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packageTypeFilter, setPackageTypeFilter] = useState('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalLoading, setApprovalLoading] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const { clientForModal, openClientCard, closeClientCard } = useOpenClientCard();
  const [employees, setEmployees] = useState([]);
  const [crmClients, setCrmClients] = useState([]);
  const [crmLeads, setCrmLeads] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    selectedCrmClientId: null,
    clientSearchFilter: '',
    clientName: '',
    clientEmail: '',
    clientType: CLIENT_TYPE.NA,
    profilePhoto: '',
    brokerage: '',
    platforms: { instagram: false, youtube: false, tiktok: false, facebook: false, x: false, other: false },
    packageType: 'Standard',
    packageSize: 1,
    postsUsed: 0,
    postsRemaining: 1,
    postsLuxuryListings: 0,
    postsIgMansions: 0,
    postsIgInteriors: 0,
    postsLuxuryHomes: 0,
    paymentStatus: 'Pending',
    approvalStatus: 'Pending',
    notes: '',
    startDate: new Date().toISOString().split('T')[0],
    lastContact: new Date().toISOString().split('T')[0],
    customPrice: 0,
    overduePosts: 0
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [scriptTestResult, setScriptTestResult] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState({});
  const [archiveLoading, setArchiveLoading] = useState({});
  const [activeTab, setActiveTab] = useState('clients'); // 'clients', 'monthly', or 'archives'
  const [archivedClients, setArchivedClients] = useState([]);
  const [monthlyClients, setMonthlyClients] = useState([]);
  const [archivesLoading, setArchivesLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState({});
  const [deleteArchivedLoading, setDeleteArchivedLoading] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [autoResetChecked, setAutoResetChecked] = useState(false);

  // Google Sheets API configuration (using secure config)
  const GOOGLE_SHEETS_API_KEY = API_KEYS.GOOGLE_SHEETS_API_KEY || 'AIzaSyDxiQTlAv1UHxGYRXaZvxi2HulXBHTca3E'; // Fallback for backward compatibility
  const SPREADSHEET_ID = GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID;
  const SHEET_NAME = GOOGLE_SHEETS_CONFIG.SHEET_NAME;
  const SHEET_GID = '0'; // Main sheet GID is 0
  
  // Alternative sheet name formats to try
  const SHEET_NAME_ENCODED = encodeURIComponent(SHEET_NAME);
  const SHEET_NAME_QUOTED = `"${SHEET_NAME}"`;
  
  // Google Apps Script Web App URL (using secure config)
  const GOOGLE_APPS_SCRIPT_URL = GOOGLE_SHEETS_CONFIG.GOOGLE_APPS_SCRIPT_URL;

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    if (clientForModal && employees.length === 0) {
      firestoreService.getApprovedUsers().then(setEmployees).catch(() => {});
    }
  }, [clientForModal]);

  useEffect(() => {
    firestoreService.getClients().then(setCrmClients).catch(() => setCrmClients([]));
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setCrmLeads([]);
      return;
    }
    getCrmLeadsForCurrentUser().then(setCrmLeads).catch(() => setCrmLeads([]));
  }, [currentUser?.uid]);

  // Test function to verify the script is working
  const testGoogleAppsScript = async () => {
    try {
      console.log('🧪 Testing Google Apps Script connection...');
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL);
      const result = await response.json();
      console.log('✅ Google Apps Script test result:', result);
      setScriptTestResult(result);
      return result.success;
    } catch (error) {
      console.error('❌ Google Apps Script test failed:', error);
      setScriptTestResult({ success: false, error: error.message });
      return false;
    }
  };

  // Enhanced test function with detailed diagnostics
  const testGoogleAppsScriptDetailed = async () => {
    try {
      console.log('🔍 Running detailed Google Apps Script diagnostics...');
      
      // Test 1: Basic connectivity
      console.log('📡 Testing basic connectivity...');
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL);
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);
      
      // Test 2: Parse response
      const result = await response.json();
      console.log('📡 Response body:', result);
      
      // Test 3: Check for specific errors
      if (result.error) {
        console.error('❌ Google Apps Script error:', result.error);
        if (result.error.includes('insertRow')) {
          console.error('❌ insertRow function not found - script may not be properly deployed');
        }
      }
      
      setScriptTestResult(result);
      return result.success;
    } catch (error) {
      console.error('❌ Detailed test failed:', error);
      setScriptTestResult({ 
        success: false, 
        error: error.message,
        details: 'Check if Google Apps Script is properly deployed and accessible'
      });
      return false;
    }
  };

  // Test GET request specifically
  const testPostRequest = async () => {
    try {
      console.log('🧪 Testing GET request to Google Apps Script...');
      
      const testData = {
        action: 'test',
        clientData: { id: 1, clientName: 'Test' }
      };
      
      console.log('📤 Sending data:', testData);
      
      // Use GET request with URL parameters to avoid CORS
      const params = new URLSearchParams({
        action: testData.action,
        clientData: JSON.stringify(testData.clientData)
      });
      
      const url = `${GOOGLE_APPS_SCRIPT_URL}?${params}`;
      console.log('🔗 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET'
      });
      
      console.log('📊 GET test response status:', response.status);
      const result = await response.json();
      console.log('📊 GET test response:', result);
      
      if (result.success) {
        toast.success(`GET Test Successful: ${result.message}`);
      } else {
        toast.error(`GET Test Failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ GET test failed:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      toast.error(`GET Test Failed: ${error.message}`);
    }
  };

  // Test actual update functionality
  const testUpdateFunction = async () => {
    try {
      console.log('🧪 Testing actual update functionality...');
      const testUpdateData = {
        action: 'update',
        clientData: {
          id: 0, // First row (after header)
          clientName: 'Test Client', // Use a real client name from your sheet
          packageType: 'Test Package',
          packageSize: 5,
          postsUsed: 2,
          postsRemaining: 3,
          postedOn: 'Test Page',
          paymentStatus: 'Test Status',
          approvalStatus: 'Test Approval',
          notes: 'Test update from app',
          startDate: new Date().toISOString().split('T')[0],
          lastContact: new Date().toISOString().split('T')[0]
        }
      };
      
      // Use GET request with URL parameters to avoid CORS
      const params = new URLSearchParams({
        action: testUpdateData.action,
        clientData: JSON.stringify(testUpdateData.clientData)
      });
      
      const url = `${GOOGLE_APPS_SCRIPT_URL}?${params}`;
      console.log('🔗 URL:', url);
      
      const response = await fetch(url, {
        method: 'GET'
      });
      
      console.log('📊 Update test response status:', response.status);
      const result = await response.json();
      console.log('📊 Update test response:', result);
      
      if (result.success) {
        toast.success(`Update Test Successful: ${result.message}`);
      } else {
        toast.error(`Update Test Failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Update test failed:', error);
      toast.error(`Update Test Failed: ${error.message}`);
    }
  };

  const fetchClients = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      
      console.log('🔍 Starting Google Sheets fetch...');
      console.log('📋 Config:', { SPREADSHEET_ID, SHEET_NAME, GOOGLE_SHEETS_API_KEY: GOOGLE_SHEETS_API_KEY.substring(0, 10) + '...' });
      
      // Try different approaches: sheet name and sheet ID (GID)
      const approaches = [
        { type: 'name', value: SHEET_NAME, url: `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${GOOGLE_SHEETS_API_KEY}` },
        { type: 'name', value: SHEET_NAME_ENCODED, url: `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME_ENCODED}?key=${GOOGLE_SHEETS_API_KEY}` },
        { type: 'name', value: SHEET_NAME_QUOTED, url: `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME_QUOTED}?key=${GOOGLE_SHEETS_API_KEY}` },
        { type: 'gid', value: SHEET_GID, url: `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1?key=${GOOGLE_SHEETS_API_KEY}` }
      ];
      
      let response = null;
      let successfulApproach = null;
      
      for (const approach of approaches) {
        try {
          console.log(`🔄 Trying approach: ${approach.type} - ${approach.value}`);
          response = await fetch(approach.url);
          console.log(`📊 Response status: ${response.status} for ${approach.type}`);
          
          if (response.ok) {
            successfulApproach = approach;
            console.log(`✅ Success with approach: ${approach.type} - ${approach.value}`);
            break;
          } else {
            const errorText = await response.text();
            console.log(`❌ Failed with approach ${approach.type}: ${response.status} - ${errorText}`);
          }
        } catch (fetchError) {
          console.log(`🚫 Network error with approach ${approach.type}:`, fetchError.message);
          // Continue to next approach
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`Failed to fetch from all approaches. Last status: ${response?.status || 'No response'}`);
      }
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Raw API response:', data);
      
      if (!data.values || data.values.length === 0) {
        throw new Error('No data found in spreadsheet');
      }
      
      // Parse the data (assuming first row contains headers)
      const headers = data.values[0];
      const rows = data.values.slice(1);
      
      console.log('Headers:', headers);
      console.log('Data rows:', rows);
      
      // Create dynamic column mapping based on your actual sheet structure
      const columnMap = {};
      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase().trim();
        console.log(`Mapping header "${header}" (${headerLower}) to index ${index}`);
        
        if (headerLower.includes('client') && headerLower.includes('name')) columnMap.clientName = index;
        else if (headerLower === 'email') columnMap.clientEmail = index;
        else if (headerLower.includes('package') && headerLower.includes('type')) columnMap.packageType = index;
        else if (headerLower.includes('package') && headerLower.includes('size')) columnMap.packageSize = index;
        else if (headerLower.includes('posts') && headerLower.includes('used')) columnMap.postsUsed = index;
        else if (headerLower.includes('posts') && headerLower.includes('remaining')) columnMap.postsRemaining = index;
        else if (headerLower.includes('posted') && headerLower.includes('page')) columnMap.postedOn = index;
        else if ((headerLower.includes('posts') || headerLower.includes('luxury')) && headerLower.includes('listings')) columnMap.postsLuxuryListings = index;
        else if ((headerLower.includes('posts') || headerLower.includes('ig')) && headerLower.includes('mansions')) columnMap.postsIgMansions = index;
        else if ((headerLower.includes('posts') || headerLower.includes('ig')) && headerLower.includes('interiors')) columnMap.postsIgInteriors = index;
        else if ((headerLower.includes('posts') || headerLower.includes('luxury')) && headerLower.includes('homes')) columnMap.postsLuxuryHomes = index;
        else if (headerLower.includes('payment') && headerLower.includes('status')) columnMap.paymentStatus = index;
        else if (headerLower.includes('approval') && headerLower.includes('status')) columnMap.approvalStatus = index;
        else if (headerLower.includes('notes')) columnMap.notes = index;
        else if (headerLower.includes('date') && headerLower.includes('added')) columnMap.startDate = index;
        else if (headerLower.includes('last') && headerLower.includes('post')) columnMap.lastContact = index;
        else if (headerLower.includes('price') && headerLower.includes('paid')) columnMap.customPrice = index;
        else if (headerLower.includes('overdue') && headerLower.includes('posts')) columnMap.overduePosts = index;
      });
      
      console.log('🔍 Column mapping:', columnMap);
      console.log('📋 Headers found:', headers);
      console.log('📧 Email column index:', columnMap.clientEmail);
      
      // Map the data to our client structure
      const fetchedClients = rows
        .filter(row => row.length > 0 && row[0]) // Filter out empty rows
        .map((row, index) => {
          // Create a dynamic mapping based on your actual sheet structure
          const postsLL = columnMap.postsLuxuryListings != null ? parseInt(row[columnMap.postsLuxuryListings]) || 0 : 0;
          const postsM = columnMap.postsIgMansions != null ? parseInt(row[columnMap.postsIgMansions]) || 0 : 0;
          const postsI = columnMap.postsIgInteriors != null ? parseInt(row[columnMap.postsIgInteriors]) || 0 : 0;
          const postsH = columnMap.postsLuxuryHomes != null ? parseInt(row[columnMap.postsLuxuryHomes]) || 0 : 0;
          const hasPostsPerPage = columnMap.postsLuxuryListings != null || columnMap.postsIgMansions != null || columnMap.postsIgInteriors != null || columnMap.postsLuxuryHomes != null;
          const client = {
            id: index + 1,
            clientName: row[columnMap.clientName] || 'Unknown Client',
            clientEmail: row[columnMap.clientEmail] || '',
            packageType: row[columnMap.packageType] || 'Standard',
            packageSize: parseInt(row[columnMap.packageSize]) || 0,
            postsUsed: parseInt(row[columnMap.postsUsed]) || 0,
            postsRemaining: parseInt(row[columnMap.postsRemaining]) || 0,
            postsLuxuryListings: hasPostsPerPage ? postsLL : 0,
            postsIgMansions: hasPostsPerPage ? postsM : 0,
            postsIgInteriors: hasPostsPerPage ? postsI : 0,
            postsLuxuryHomes: hasPostsPerPage ? postsH : 0,
            postedOn: hasPostsPerPage ? null : (row[columnMap.postedOn] || 'Luxury Listings'),
            paymentStatus: row[columnMap.paymentStatus] || 'Pending',
            approvalStatus: row[columnMap.approvalStatus] || 'Pending',
            notes: row[columnMap.notes] || '',
            startDate: row[columnMap.startDate] || new Date().toISOString().split('T')[0],
            lastContact: row[columnMap.lastContact] || new Date().toISOString().split('T')[0],
            customPrice: parseFloat(row[columnMap.customPrice]) || 0,
            overduePosts: columnMap.overduePosts !== undefined ? parseInt(row[columnMap.overduePosts]) || 0 : 0,
          };
          
          // Calculate remaining posts if not provided
          if (client.postsRemaining === 0 && client.packageSize > 0) {
            client.postsRemaining = Math.max(0, client.packageSize - client.postsUsed);
          }
          
          // Determine status based on data
          client.status = determineStatus(client.approvalStatus, client.paymentStatus, client.postsRemaining);
          
          // Debug email data
          if (client.clientName && client.clientName !== 'Unknown Client') {
            console.log(`📧 Client: ${client.clientName}, Email: "${client.clientEmail}", Email column index: ${columnMap.clientEmail}, Raw row data:`, row);
          }
          
          return client;
        });
      
      setClients(fetchedClients);
      setLastSync(new Date());
      console.log('Successfully fetched clients from Google Sheets:', fetchedClients);
      
    } catch (error) {
      console.error('Error fetching clients from Google Sheets:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Fallback to mock data if API fails
      const fallbackClients = [
        {
          id: 1,
          clientName: "Sarah Johnson",
          packageType: "Gold",
          packageSize: 6,
          postsUsed: 2,
          postsRemaining: 4,
          postsLuxuryListings: 0,
          postsIgMansions: 0,
          postsIgInteriors: 0,
          postsLuxuryHomes: 0,
          postedOn: "Luxury Listings",
          paymentStatus: "Paid",
          approvalStatus: "Approved",
          status: "active",
          notes: "Loves luxury lifestyle content, prefers evening posting times",
          startDate: "2024-01-15",
          lastContact: "2024-01-20"
        },
        {
          id: 2,
          clientName: "Michael Chen",
          packageType: "Silver",
          packageSize: 3,
          postsUsed: 3,
          postsRemaining: 0,
          postsLuxuryListings: 0,
          postsIgMansions: 0,
          postsIgInteriors: 0,
          postsLuxuryHomes: 0,
          postedOn: "Mansions",
          paymentStatus: "Paid",
          approvalStatus: "Approved",
          status: "completed",
          notes: "Interested in upgrading to Gold package",
          startDate: "2024-01-10",
          lastContact: "2024-01-18"
        }
      ];
      
      setClients(fallbackClients);
      toast.error(`Could not fetch from Google Sheets. Using fallback data.`);
      
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchArchivedClients = async () => {
    try {
      setArchivesLoading(true);
      console.log('📦 Fetching archived clients from Archived Clients tab...');
      
      // Fetch from Archived Clients tab using Google Sheets API
      const archiveUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Archived%20Clients?key=${GOOGLE_SHEETS_API_KEY}`;
      
      const response = await fetch(archiveUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch archived clients: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Archive API response:', data);
      
      if (!data.values || data.values.length === 0) {
        console.log('📦 No archived clients found');
        setArchivedClients([]);
        return;
      }
      
      // Parse the archived data (assuming first row contains headers)
      const headers = data.values[0];
      const rows = data.values.slice(1);
      
      console.log('📦 Archive headers:', headers);
      console.log('📦 Archive data rows:', rows);
      
      // Create dynamic column mapping for archive data
      const archiveColumnMap = {};
      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase().trim();
        console.log(`📦 Mapping archive header "${header}" (${headerLower}) to index ${index}`);
        
        // Map based on your actual archive structure A-R
        if (headerLower.includes('client') && headerLower.includes('name')) archiveColumnMap.clientName = index;
        else if (headerLower.includes('package') && headerLower.includes('type')) archiveColumnMap.packageType = index;
        else if (headerLower.includes('email')) archiveColumnMap.clientEmail = index;
        else if (headerLower.includes('date') && headerLower.includes('added')) archiveColumnMap.startDate = index;
        else if (headerLower.includes('posted') && headerLower.includes('page')) archiveColumnMap.postedOn = index;
        else if (headerLower.includes('payment') && headerLower.includes('status')) archiveColumnMap.paymentStatus = index;
        else if (headerLower.includes('sales') && headerLower.includes('stage')) archiveColumnMap.salesStage = index;
        else if (headerLower.includes('approval') && headerLower.includes('status')) archiveColumnMap.approvalStatus = index;
        else if (headerLower.includes('notes')) archiveColumnMap.notes = index;
        else if (headerLower.includes('status') && headerLower.includes('change') && headerLower.includes('date')) archiveColumnMap.statusChangeDate = index;
        else if (headerLower.includes('package') && headerLower.includes('size')) archiveColumnMap.packageSize = index;
        else if (headerLower.includes('posts') && headerLower.includes('used')) archiveColumnMap.postsUsed = index;
        else if (headerLower.includes('last') && headerLower.includes('post') && headerLower.includes('date')) archiveColumnMap.lastPostDate = index;
        else if (headerLower.includes('posts') && headerLower.includes('remaining')) archiveColumnMap.postsRemaining = index;
        else if (headerLower.includes('package') && headerLower.includes('completed')) archiveColumnMap.packageCompleted = index;
        else if (headerLower.includes('approval') && headerLower.includes('email') && headerLower.includes('recipient')) archiveColumnMap.approvalEmailRecipient = index;
        else if (headerLower.includes('price') && headerLower.includes('paid')) archiveColumnMap.pricePaid = index;
        else if (headerLower.includes('post') && headerLower.includes('insights') && headerLower.includes('sent')) archiveColumnMap.postInsightsSent = index;
      });
      
      console.log('📦 Archive column mapping:', archiveColumnMap);
      
      // Map the archived data to our client structure
      const fetchedArchivedClients = rows
        .filter(row => row.length > 0 && row[0]) // Filter out empty rows
        .map((row, index) => {
          const archivedClient = {
            id: `archived-${index + 1}`,
            clientName: row[archiveColumnMap.clientName] || 'Unknown Client',
            clientEmail: row[archiveColumnMap.clientEmail] || '',
            packageType: row[archiveColumnMap.packageType] || 'Standard',
            packageSize: parseInt(row[archiveColumnMap.packageSize]) || 0,
            postsUsed: parseInt(row[archiveColumnMap.postsUsed]) || 0,
            postsRemaining: parseInt(row[archiveColumnMap.postsRemaining]) || 0,
            postedOn: row[archiveColumnMap.postedOn] || 'Luxury Listings',
            paymentStatus: row[archiveColumnMap.paymentStatus] || 'Pending',
            salesStage: row[archiveColumnMap.salesStage] || '',
            approvalStatus: row[archiveColumnMap.approvalStatus] || 'Pending',
            notes: row[archiveColumnMap.notes] || '',
            startDate: row[archiveColumnMap.startDate] || new Date().toISOString().split('T')[0],
            statusChangeDate: row[archiveColumnMap.statusChangeDate] || new Date().toISOString().split('T')[0],
            lastPostDate: row[archiveColumnMap.lastPostDate] || '',
            packageCompleted: row[archiveColumnMap.packageCompleted] || 'FALSE',
            approvalEmailRecipient: row[archiveColumnMap.approvalEmailRecipient] || '',
            pricePaid: row[archiveColumnMap.pricePaid] || '',
            postInsightsSent: row[archiveColumnMap.postInsightsSent] || 'FALSE',
            isArchived: true
          };
          
          // Calculate remaining posts if not provided
          if (archivedClient.postsRemaining === 0 && archivedClient.packageSize > 0) {
            archivedClient.postsRemaining = Math.max(0, archivedClient.packageSize - archivedClient.postsUsed);
          }
          
          return archivedClient;
        });
      
      console.log('📦 Mapped archived clients:', fetchedArchivedClients);
      setArchivedClients(fetchedArchivedClients);
      
    } catch (error) {
      console.error('❌ Error fetching archived clients:', error);
      setArchivedClients([]);
    } finally {
      setArchivesLoading(false);
    }
  };

  const fetchMonthlyClients = async () => {
    try {
      setMonthlyLoading(true);
      console.log('📅 Fetching monthly recurring clients from Monthly Recurring tab...');
      
      // Fetch from Monthly Recurring tab using Google Sheets API
      const monthlyUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Monthly%20Recurring?key=${GOOGLE_SHEETS_API_KEY}`;
      
      const response = await fetch(monthlyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch monthly clients: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📅 Monthly API response:', data);
      
      if (!data.values || data.values.length === 0) {
        console.log('📅 No monthly clients found');
        setMonthlyClients([]);
        return;
      }
      
      // Parse the monthly data (assuming first row contains headers)
      const headers = data.values[0];
      const rows = data.values.slice(1);
      
      console.log('📅 Monthly headers:', headers);
      console.log('📅 Monthly data rows:', rows);
      
      // Create dynamic column mapping for monthly data
      const monthlyColumnMap = {};
      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase().trim();
        console.log(`📅 Mapping monthly header "${header}" (${headerLower}) to index ${index}`);
        
        if (headerLower.includes('client') && headerLower.includes('name')) monthlyColumnMap.clientName = index;
        else if (headerLower.includes('package') && headerLower.includes('type')) monthlyColumnMap.packageType = index;
        else if (headerLower.includes('email')) monthlyColumnMap.clientEmail = index;
        else if (headerLower.includes('date') && headerLower.includes('added')) monthlyColumnMap.startDate = index;
        else if (headerLower.includes('posted') && headerLower.includes('page')) monthlyColumnMap.postedOn = index;
        else if (headerLower.includes('payment') && headerLower.includes('status')) monthlyColumnMap.paymentStatus = index;
        else if (headerLower.includes('approval') && headerLower.includes('status')) monthlyColumnMap.approvalStatus = index;
        else if (headerLower.includes('notes')) monthlyColumnMap.notes = index;
        else if (headerLower.includes('package') && headerLower.includes('size')) monthlyColumnMap.packageSize = index;
        else if (headerLower.includes('posts') && headerLower.includes('used')) monthlyColumnMap.postsUsed = index;
        else if (headerLower.includes('posts') && headerLower.includes('remaining')) monthlyColumnMap.postsRemaining = index;
        else if (headerLower.includes('last') && headerLower.includes('contact')) monthlyColumnMap.lastContact = index;
        else if (headerLower.includes('next') && headerLower.includes('billing')) monthlyColumnMap.nextBillingDate = index;
        else if (headerLower.includes('billing') && headerLower.includes('cycle')) monthlyColumnMap.billingCycle = index;
        else if (headerLower.includes('price') && headerLower.includes('paid')) monthlyColumnMap.monthlyPrice = index;
        else if (headerLower.includes('auto') && headerLower.includes('renew')) monthlyColumnMap.autoRenew = index;
      });
      
      console.log('📅 Monthly column mapping:', monthlyColumnMap);
      
      // Map the monthly data to our client structure
      const fetchedMonthlyClients = rows
        .filter(row => row.length > 0 && row[0]) // Filter out empty rows
        .map((row, index) => {
          const monthlyClient = {
            id: `monthly-${index + 1}`,
            clientName: row[monthlyColumnMap.clientName] || 'Unknown Client',
            clientEmail: row[monthlyColumnMap.clientEmail] || '',
            packageType: row[monthlyColumnMap.packageType] || 'Monthly Standard',
            packageSize: parseInt(row[monthlyColumnMap.packageSize]) || 0,
            postsUsed: parseInt(row[monthlyColumnMap.postsUsed]) || 0,
            postsRemaining: parseInt(row[monthlyColumnMap.postsRemaining]) || 0,
            postedOn: row[monthlyColumnMap.postedOn] || 'Luxury Listings',
            paymentStatus: row[monthlyColumnMap.paymentStatus] || 'Pending',
            approvalStatus: row[monthlyColumnMap.approvalStatus] || 'Pending',
            notes: row[monthlyColumnMap.notes] || '',
            startDate: row[monthlyColumnMap.startDate] || new Date().toISOString().split('T')[0],
            lastContact: row[monthlyColumnMap.lastContact] || new Date().toISOString().split('T')[0],
            nextBillingDate: row[monthlyColumnMap.nextBillingDate] || '',
            billingCycle: row[monthlyColumnMap.billingCycle] || 'Monthly',
            monthlyPrice: parseFloat(row[monthlyColumnMap.monthlyPrice]) || 0,
            autoRenew: row[monthlyColumnMap.autoRenew] || 'TRUE',
            isMonthly: true
          };
          
          // Calculate remaining posts if not provided
          if (monthlyClient.postsRemaining === 0 && monthlyClient.packageSize > 0) {
            monthlyClient.postsRemaining = Math.max(0, monthlyClient.packageSize - monthlyClient.postsUsed);
          }
          
          // Determine status based on data
          monthlyClient.status = determineStatus(monthlyClient.approvalStatus, monthlyClient.paymentStatus, monthlyClient.postsRemaining);
          
          return monthlyClient;
        });
      
      console.log('📅 Mapped monthly clients:', fetchedMonthlyClients);
      setMonthlyClients(fetchedMonthlyClients);
      
    } catch (error) {
      console.error('❌ Error fetching monthly clients:', error);
      setMonthlyClients([]);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchArchivedClients(); // Fetch archived clients on mount
    fetchMonthlyClients(); // Fetch monthly clients on mount
  }, []);

  // Auto-select client from URL query parameter
  useEffect(() => {
    const clientId = searchParams.get('client');
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setSelectedClient(client);
        // Scroll to the client card if possible
        setTimeout(() => {
          const element = document.getElementById(`client-${clientId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [searchParams, clients]);

  // Check for auto-reset when clients are loaded
  useEffect(() => {
    if (clients.length > 0 && !autoResetChecked) {
      checkAndAutoResetMonthly();
    }
  }, [clients, autoResetChecked]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'archives' && archivedClients.length === 0) {
      fetchArchivedClients();
    }
    if (tab === 'monthly' && monthlyClients.length === 0) {
      fetchMonthlyClients();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-[#34c759]/10 text-[#34c759]';
      case 'completed': return 'bg-[#0071e3]/10 text-[#0071e3]';
      case 'pending': return 'bg-[#ff9500]/10 text-[#ff9500]';
      case 'overdue': return 'bg-[#ff3b30]/10 text-[#ff3b30]';
      default: return 'bg-black/5 dark:bg-white/10 text-[#86868b]';
    }
  };

  const getPackageTypeColor = (type) => {
    switch (type) {
      case 'Platinum': return 'bg-[#af52de]/10 text-[#af52de]';
      case 'Gold': return 'bg-[#ff9500]/10 text-[#ff9500]';
      case 'Silver': return 'bg-[#8e8e93]/10 text-[#8e8e93]';
      case 'Standard': return 'bg-[#0071e3]/10 text-[#0071e3]';
      case 'Seven': return 'bg-[#5856d6]/10 text-[#5856d6]';
      case 'Custom': return 'bg-[#ff2d55]/10 text-[#ff2d55]';
      case 'Monthly': return 'bg-[#34c759]/10 text-[#34c759]';
      default: return 'bg-black/5 dark:bg-white/10 text-[#86868b]';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-[#34c759]/10 text-[#34c759]';
      case 'Pending': return 'bg-[#ff9500]/10 text-[#ff9500]';
      case 'Partial': return 'bg-[#0071e3]/10 text-[#0071e3]';
      case 'Overdue': return 'bg-[#ff3b30]/10 text-[#ff3b30]';
      default: return 'bg-black/5 dark:bg-white/10 text-[#86868b]';
    }
  };

  const determineStatus = (approvalStatus, paymentStatus, postsRemaining) => {
    if (approvalStatus === 'Pending') return 'pending';
    if (postsRemaining === 0) return 'completed';
    if (paymentStatus === 'Overdue') return 'overdue';
    return 'active';
  };

  const openApprovalModal = (client, action) => {
    setSelectedClient(client);
    setApprovalNotes('');
    setShowApprovalModal(true);
  };

  const handleApproval = async (approved) => {
    if (!selectedClient) return;
    
    setApprovalLoading({ ...approvalLoading, [selectedClient.id]: true });
    
    try {
      const newStatus = approved ? 'Approved' : 'Rejected';
      setClients(prevClients =>
        prevClients.map(client =>
          client.id === selectedClient.id
            ? {
                ...client,
                approvalStatus: newStatus,
                status: determineStatus(newStatus, client.paymentStatus, client.postsRemaining)
              }
            : client
        )
      );
      setShowApprovalModal(false);
      setSelectedClient(null);
      setApprovalNotes('');
      showToast(`Package ${approved ? 'approved' : 'rejected'} for ${selectedClient.clientName}`);
    } finally {
      setApprovalLoading({ ...approvalLoading, [selectedClient.id]: false });
    }
  };

  const archiveCompletedPackage = async (client) => {
    if (!client) return;
    
    const confirmed = await confirm({
      title: 'Archive Client',
      message: `Are you sure you want to archive ${client.clientName}? This will move them to the Archive tab.`,
      confirmText: 'Archive',
      variant: 'warning'
    });
    if (!confirmed) return;
    
    setArchiveLoading({ ...archiveLoading, [client.id]: true });
    try {
      setClients(prevClients => prevClients.filter(c => c.id !== client.id));
      showToast(`${client.clientName} has been archived successfully!`);
    } finally {
      setArchiveLoading({ ...archiveLoading, [client.id]: false });
    }
  };

  const deleteClient = async (client) => {
    if (!client) return;
    
    const confirmed = await confirm({
      title: 'Delete Client',
      message: `Are you sure you want to permanently delete ${client.clientName}? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    
    setDeleteLoading({ ...deleteLoading, [client.id]: true });
    try {
      setClients(prevClients => prevClients.filter(c => c.id !== client.id));
      showToast(`${client.clientName} has been deleted successfully!`);
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error(`Error deleting client: ${error.message}`);
    } finally {
      setDeleteLoading({ ...deleteLoading, [client.id]: false });
    }
  };

  const restoreClient = async (archivedClient) => {
    if (!archivedClient) return;
    
    const confirmed = await confirm({
      title: 'Restore Client',
      message: `Are you sure you want to restore ${archivedClient.clientName}? This will bring them back to the active client list.`,
      confirmText: 'Restore',
      variant: 'default'
    });
    if (!confirmed) return;
    
    setRestoreLoading({ ...restoreLoading, [archivedClient.id]: true });
    try {
      const restored = { ...archivedClient, status: determineStatus(archivedClient.approvalStatus, archivedClient.paymentStatus, archivedClient.postsRemaining ?? 0) };
      setArchivedClients(prev => prev.filter(c => c.id !== archivedClient.id));
      setClients(prev => [...prev, restored]);
      showToast(`${archivedClient.clientName} has been restored successfully!`);
    } catch (error) {
      console.error('Error restoring client:', error);
      toast.error(`Error restoring client: ${error.message}`);
    } finally {
      setRestoreLoading({ ...restoreLoading, [archivedClient.id]: false });
    }
  };

  const deleteArchivedClient = async (archivedClient) => {
    if (!archivedClient) return;
    
    const confirmed = await confirm({
      title: 'Delete Archived Client',
      message: `Are you sure you want to permanently delete ${archivedClient.clientName} from the archive? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    
    setDeleteArchivedLoading({ ...deleteArchivedLoading, [archivedClient.id]: true });
    try {
      setArchivedClients(prev => prev.filter(c => c.id !== archivedClient.id));
      showToast(`${archivedClient.clientName} has been permanently deleted from the archive!`);
    } catch (error) {
      console.error('Error deleting archived client:', error);
      toast.error(`Error deleting archived client: ${error.message}`);
    } finally {
      setDeleteArchivedLoading({ ...deleteArchivedLoading, [archivedClient.id]: false });
    }
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setEditForm({
      clientEmail: client.clientEmail || '',
      profilePhoto: client.profilePhoto || '',
      brokerage: client.brokerage || '',
      platforms: client.platforms || { instagram: false, youtube: false, tiktok: false, facebook: false, x: false, other: false },
      packageType: client.packageType,
      packageSize: client.packageSize,
      postsUsed: client.postsUsed,
      postsRemaining: client.postsRemaining,
      notes: client.notes || '',
      postsLuxuryListings: client.postsLuxuryListings ?? 0,
      postsIgMansions: client.postsIgMansions ?? 0,
      postsIgInteriors: client.postsIgInteriors ?? 0,
      postsLuxuryHomes: client.postsLuxuryHomes ?? 0,
      paymentStatus: client.paymentStatus,
      customPrice: client.customPrice || 0,
      overduePosts: client.overduePosts || 0
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editingClient) return;
    
    setApprovalLoading({ ...approvalLoading, [editingClient.id]: true });
    
    try {
      // Validate form data
      if (editForm.postsUsed + editForm.postsRemaining !== editForm.packageSize) {
        toast.error('Posts Used + Posts Remaining must equal Package Size');
        return;
      }

      // Validate custom price for Custom and Monthly packages
      if ((editForm.packageType === 'Custom' || editForm.packageType === 'Monthly') && (!editForm.customPrice || editForm.customPrice <= 0)) {
        toast.error(`Please enter a valid ${editForm.packageType === 'Monthly' ? 'monthly' : 'custom'} price`);
        return;
      }
      
      const editPostedSummary = getPostsPerPageSummary(editForm);
      setClients(prevClients =>
        prevClients.map(client =>
          client.id === editingClient.id
            ? {
                ...client,
                clientEmail: editForm.clientEmail,
                profilePhoto: editForm.profilePhoto || client.profilePhoto,
                brokerage: editForm.brokerage || client.brokerage,
                platforms: editForm.platforms || client.platforms,
                packageType: editForm.packageType,
                packageSize: editForm.packageSize,
                postsUsed: editForm.postsUsed,
                postsRemaining: editForm.postsRemaining,
                postsLuxuryListings: editForm.postsLuxuryListings ?? 0,
                postsIgMansions: editForm.postsIgMansions ?? 0,
                postsIgInteriors: editForm.postsIgInteriors ?? 0,
                postsLuxuryHomes: editForm.postsLuxuryHomes ?? 0,
                postedOn: editPostedSummary,
                paymentStatus: editForm.paymentStatus,
                notes: editForm.notes,
                lastContact: editForm.lastContact ?? client.lastContact,
                customPrice: editForm.customPrice || 0,
                overduePosts: editForm.overduePosts ?? 0,
                status: determineStatus(client.approvalStatus, editForm.paymentStatus, editForm.postsRemaining)
              }
            : client
        )
      );
      setShowEditModal(false);
      setEditingClient(null);
      setEditForm({});
      showToast(`Package for ${editingClient.clientName} has been updated.`);
    } catch (error) {
      console.error('Error updating package:', error);
      showToast(`❌ Error: ${error.message}`, 'error');
      toast.error(`Error updating package for ${editingClient.clientName}: ${error.message}`);
    } finally {
      setApprovalLoading({ ...approvalLoading, [editingClient.id]: false });
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingClient(null);
    setEditForm({});
  };

  const handleAddClient = () => {
    setShowAddModal(true);
  };

  // Add client to CRM (Sheets) when new package is added
  const addClientToCRMSheets = async (clientData) => {
    try {
      console.log('🔄 Adding client to CRM (Sheets):', clientData);
      const leadData = {
        contactName: clientData.clientName,
        email: clientData.clientEmail || '',
        organization: '',
        phone: '',
        instagram: '',
        website: '',
        notes: `New ${clientData.packageType} package client - ${clientData.notes || 'No additional notes'}`
      };
      const selectedTabs = { warmLeads: true, contactedClients: false, coldLeads: false };
      const params = new URLSearchParams({
        action: 'addLead',
        leadData: JSON.stringify(leadData),
        selectedTabs: JSON.stringify(selectedTabs)
      });
      const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`, { method: 'GET' });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ CRM (Sheets) add failed:', errorText);
        return { success: false, error: errorText };
      }
      const result = await response.json();
      console.log('✅ CRM (Sheets) add result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error adding client to CRM (Sheets):', error);
      return { success: false, error: error.message };
    }
  };

  const handleAddSubmit = async () => {
    if (addForm.selectedCrmClientId !== 'new' && !addForm.selectedCrmClientId) {
      toast.error('Please select a client or lead from the CRM, or choose Add new client');
      return;
    }
    if (addForm.selectedCrmClientId === 'new' && !addForm.clientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    if (addForm.postsUsed + addForm.postsRemaining !== addForm.packageSize) {
      toast.error('Posts Used + Posts Remaining must equal Package Size');
      return;
    }

    // Validate custom price for Custom and Monthly packages
    if ((addForm.packageType === 'Custom' || addForm.packageType === 'Monthly') && (!addForm.customPrice || addForm.customPrice <= 0)) {
      toast.error(`Please enter a valid ${addForm.packageType === 'Monthly' ? 'monthly' : 'custom'} price`);
      return;
    }

    setApprovalLoading({ ...approvalLoading, 'new': true });

    try {
      const postedOnSummary = getPostsPerPageSummary(addForm);
      const newId = `local-${Date.now()}`;
      const newClient = {
        id: newId,
        clientName: addForm.clientName,
        clientEmail: addForm.clientEmail || '',
        profilePhoto: addForm.profilePhoto || '',
        brokerage: addForm.brokerage || '',
        platforms: addForm.platforms || {},
        packageType: addForm.packageType,
        packageSize: addForm.packageSize,
        postsUsed: addForm.postsUsed,
        postsRemaining: addForm.postsRemaining,
        postsLuxuryListings: addForm.postsLuxuryListings ?? 0,
        postsIgMansions: addForm.postsIgMansions ?? 0,
        postsIgInteriors: addForm.postsIgInteriors ?? 0,
        postsLuxuryHomes: addForm.postsLuxuryHomes ?? 0,
        postedOn: postedOnSummary,
        paymentStatus: addForm.paymentStatus,
        approvalStatus: addForm.approvalStatus,
        notes: addForm.notes || '',
        startDate: addForm.startDate,
        lastContact: addForm.lastContact,
        customPrice: addForm.customPrice || 0,
        overduePosts: addForm.overduePosts || 0,
        status: determineStatus(addForm.approvalStatus, addForm.paymentStatus, addForm.postsRemaining)
      };
      setClients(prev => [...prev, newClient]);
      if (addForm.selectedCrmClientId === 'new') {
        await addContactToCRM({
          clientName: addForm.clientName,
          clientEmail: addForm.clientEmail,
          type: addForm.clientType || CLIENT_TYPE.NA,
          notes: addForm.notes
        }, 'warmLeads');
        showToast(`New client "${addForm.clientName}" has been added to CRM!`);
      } else {
        showToast(`Package added for ${addForm.clientName}`);
      }
      setAddForm(prev => ({ ...prev, selectedCrmClientId: null, clientSearchFilter: '', clientName: '', clientEmail: '', clientType: CLIENT_TYPE.NA, profilePhoto: '', brokerage: '', platforms: { instagram: false, youtube: false, tiktok: false, facebook: false, x: false, other: false }, packageType: 'Standard', packageSize: 1, postsUsed: 0, postsRemaining: 1, postsLuxuryListings: 0, postsIgMansions: 0, postsIgInteriors: 0, postsLuxuryHomes: 0, paymentStatus: 'Pending', approvalStatus: 'Pending', notes: '', startDate: new Date().toISOString().split('T')[0], lastContact: new Date().toISOString().split('T')[0], customPrice: 0, overduePosts: 0 }));
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error(`Error adding client: ${error.message}`);
    } finally {
      setApprovalLoading({ ...approvalLoading, 'new': false });
    }
  };

  const handleMonthlyReset = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || client.packageType !== 'Monthly') {
      toast.error('This function is only available for Monthly packages');
      return;
    }

    const confirmed = await confirm({
      title: 'Reset Monthly Posts',
      message: `Reset monthly posts for ${client.clientName}? This will reset posts used to 0, add ${client.postsRemaining} posts to overdue, and reset posts remaining to ${client.packageSize}.`,
      confirmText: 'Reset',
      variant: 'warning'
    });
    if (!confirmed) return;

    setApprovalLoading({ ...approvalLoading, [clientId]: true });
    try {
      const newOverduePosts = (client.overduePosts || 0) + client.postsRemaining;
      setClients(prev =>
        prev.map(c =>
          c.id === clientId
            ? {
                ...c,
                postsUsed: 0,
                postsRemaining: c.packageSize,
                overduePosts: newOverduePosts
              }
            : c
        )
      );
      toast.success(`Monthly reset successful for ${client.clientName}`);
    } catch (error) {
      console.error('❌ Error resetting monthly posts:', error);
      toast.error('Failed to reset monthly posts. Please try again.');
    } finally {
      setApprovalLoading({ ...approvalLoading, [clientId]: false });
    }
  };

  const checkAndAutoResetMonthly = async () => {
    // Check if we've already done auto-reset today
    const today = new Date().toDateString();
    const lastAutoReset = localStorage.getItem('lastAutoReset');
    
    if (lastAutoReset === today) {
      return; // Already checked today
    }

    // Check if it's the first day of the month
    const now = new Date();
    const isFirstDayOfMonth = now.getDate() === 1;
    
    if (!isFirstDayOfMonth) {
      return; // Not the first day of the month
    }

    // Get all Monthly packages that need reset
    const monthlyPackages = clients.filter(client => 
      client.packageType === 'Monthly' && 
      (client.postsUsed > 0 || client.postsRemaining < client.packageSize)
    );

    if (monthlyPackages.length === 0) {
      setAutoResetChecked(true);
      localStorage.setItem('lastAutoReset', today);
      return; // No Monthly packages need reset
    }

    // Show notification about auto-reset
    const confirmed = await confirm({
      title: 'Monthly Reset Detected',
      message: `It's the first day of the month and ${monthlyPackages.length} Monthly package(s) need to be reset. Would you like to automatically reset all Monthly packages now?`,
      confirmText: 'Reset All',
      variant: 'info'
    });

    if (!confirmed) {
      setAutoResetChecked(true);
      localStorage.setItem('lastAutoReset', today);
      return;
    }

    // Auto-reset all Monthly packages (local state only)
    setClients(prev =>
      prev.map(c => {
        if (c.packageType !== 'Monthly' || (c.postsUsed <= 0 && c.postsRemaining >= c.packageSize)) return c;
        const newOverduePosts = (c.overduePosts || 0) + c.postsRemaining;
        return {
          ...c,
          postsUsed: 0,
          postsRemaining: c.packageSize,
          overduePosts: newOverduePosts
        };
      })
    );
    showToast(`✅ Auto-reset complete! ${monthlyPackages.length} Monthly package(s) reset successfully.`, 'success');

    // Mark as checked for today
    setAutoResetChecked(true);
    localStorage.setItem('lastAutoReset', today);
  };

  // Upload photo to ImgBB
  const handlePhotoUpload = async (file, formType) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise((resolve) => { reader.onload = resolve; });
      const base64 = reader.result.split(',')[1];
      const formData = new FormData();
      formData.append('image', base64);
      const resp = await fetch('https://api.imgbb.com/1/upload?key=1e52042b16f9d095084295e32d073030', { method: 'POST', body: formData });
      const data = await resp.json();
      if (data.success) {
        const url = data.data.url;
        if (formType === 'add') {
          setAddForm(prev => ({ ...prev, profilePhoto: url }));
        } else {
          setEditForm(prev => ({ ...prev, profilePhoto: url }));
        }
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleQuickPostsChange = async (client, delta) => {
    const newUsed = Math.max(0, Math.min(client.packageSize, (client.postsUsed || 0) + delta));
    const newRemaining = client.packageSize - newUsed;
    setApprovalLoading((prev) => ({ ...prev, [client.id]: true }));
    try {
      setClients((prev) =>
        prev.map((c) =>
          c.id === client.id
            ? {
                ...c,
                postsUsed: newUsed,
                postsRemaining: newRemaining,
                status: determineStatus(c.approvalStatus, c.paymentStatus, newRemaining)
              }
            : c
        )
      );
      if (String(client.id).startsWith('monthly-')) {
        setMonthlyClients((prev) =>
          prev.map((c) =>
            c.id === client.id ? { ...c, postsUsed: newUsed, postsRemaining: newRemaining } : c
          )
        );
      }
      toast.success(delta > 0 ? 'Post logged' : 'Post unlogged');
    } catch (err) {
      console.error(err);
      toast.error('Could not update posts');
    } finally {
      setApprovalLoading((prev) => ({ ...prev, [client.id]: false }));
    }
  };

  const handleAddCancel = () => {
    setShowAddModal(false);
    setAddForm({
      selectedCrmClientId: null,
      clientSearchFilter: '',
      clientName: '',
      clientEmail: '',
      clientType: CLIENT_TYPE.NA,
      profilePhoto: '',
      brokerage: '',
      platforms: { instagram: false, youtube: false, tiktok: false, facebook: false, x: false, other: false },
      packageType: 'Standard',
      packageSize: 1,
      postsUsed: 0,
      postsRemaining: 1,
      postsLuxuryListings: 0,
      postsIgMansions: 0,
      postsIgInteriors: 0,
      postsLuxuryHomes: 0,
      paymentStatus: 'Pending',
      approvalStatus: 'Pending',
      notes: '',
      startDate: new Date().toISOString().split('T')[0],
      lastContact: new Date().toISOString().split('T')[0],
      customPrice: 0,
      overduePosts: 0
    });
  };

  const openFollowUpEmail = (client) => {
    const subject = `Follow-up: ${client.packageType} Package - ${client.clientName}`;
    const body = `Hi ${client.clientName},\n\nI hope this email finds you well. I wanted to follow up on your ${client.packageType} package.\n\nCurrent Status:\n- Package: ${client.packageType} (${client.packageSize} posts)\n- Posts Used: ${client.postsUsed}\n- Posts Remaining: ${client.postsRemaining}\n- Payment Status: ${client.paymentStatus}\n\n${client.notes ? `Notes: ${client.notes}\n\n` : ''}Please let me know if you have any questions or if there's anything else I can assist you with.\n\nBest regards,\n[Your Name]\nLuxury Listings Team`;
    
    openEmailInGmail(client.clientEmail, { subject, body });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.packageType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesPackageType = packageTypeFilter === 'all' || client.packageType === packageTypeFilter;
    
    return matchesSearch && matchesStatus && matchesPackageType;
  });

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    pending: clients.filter(c => c.status === 'pending').length,
    completed: clients.filter(c => c.status === 'completed').length,
    revenue: clients.reduce((sum, c) => {
      const packageValues = { Standard: 199, Silver: 1689, Gold: 3190, Platinum: 1299, Seven: 899, Custom: 1500, Monthly: 299 };
      // Use custom price if available for Custom or Monthly packages, otherwise use default package value
      const price = (c.packageType === 'Custom' || c.packageType === 'Monthly') && c.customPrice ? c.customPrice : (packageValues[c.packageType] || 0);
      return sum + price;
    }, 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7] dark:bg-[#1d1d1f]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#86868b] text-sm">Loading client packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">
            Posting Packages
          </h1>
          <p className="text-[15px] sm:text-[17px] text-[#86868b]">
            Manage posting packages for @luxury_listings features
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={testGoogleAppsScriptDetailed}
            className="h-9 px-3 rounded-xl bg-[#ff9500]/10 text-[#ff9500] text-[13px] font-medium hover:bg-[#ff9500]/20 transition-colors flex items-center gap-1.5"
          >
            🔧 Test Script
          </button>
          <button
            onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`, '_blank')}
            className="h-9 px-3 rounded-xl bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-medium hover:bg-[#0071e3]/20 transition-colors flex items-center gap-1.5"
          >
            📊 Open Sheets
          </button>
        </div>
      </div>
      
      {scriptTestResult && (
        <div className={`p-3 rounded-xl text-[13px] ${scriptTestResult.success 
          ? 'bg-[#34c759]/10 text-[#34c759] border border-[#34c759]/20' 
          : 'bg-[#ff3b30]/10 text-[#ff3b30] border border-[#ff3b30]/20'}`}>
          {scriptTestResult.success 
            ? `✅ Script working: ${scriptTestResult.message || 'Connection successful'}`
            : `❌ Script error: ${scriptTestResult.error || 'Unknown error'}`}
          {scriptTestResult.details && <div className="mt-1 text-[11px] opacity-80">{scriptTestResult.details}</div>}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 hover:shadow-lg transition-all">
          <Users className="w-5 h-5 text-[#0071e3] mb-2" strokeWidth={1.5} />
          <p className="text-[24px] sm:text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">{stats.total}</p>
          <p className="text-[12px] sm:text-[13px] text-[#86868b]">Total Clients</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 hover:shadow-lg transition-all">
          <CheckCircle className="w-5 h-5 text-[#34c759] mb-2" strokeWidth={1.5} />
          <p className="text-[24px] sm:text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">{stats.active}</p>
          <p className="text-[12px] sm:text-[13px] text-[#86868b]">Active Packages</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 hover:shadow-lg transition-all">
          <Clock className="w-5 h-5 text-[#ff9500] mb-2" strokeWidth={1.5} />
          <p className="text-[24px] sm:text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">{stats.pending}</p>
          <p className="text-[12px] sm:text-[13px] text-[#86868b]">Pending Approval</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 hover:shadow-lg transition-all">
          <Package className="w-5 h-5 text-[#5856d6] mb-2" strokeWidth={1.5} />
          <p className="text-[24px] sm:text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">{stats.completed}</p>
          <p className="text-[12px] sm:text-[13px] text-[#86868b]">Completed</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] col-span-2 sm:col-span-1 hover:shadow-lg transition-all">
          <DollarSign className="w-5 h-5 text-white/80 mb-2" strokeWidth={1.5} />
          <p className="text-[24px] sm:text-[28px] font-semibold text-white tracking-[-0.02em]">${stats.revenue.toLocaleString()}</p>
          <p className="text-[12px] sm:text-[13px] text-white/70">Total Revenue</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl overflow-x-auto">
        <button
          onClick={() => handleTabChange('clients')}
          className={`flex-1 min-w-fit py-2.5 px-4 rounded-lg text-[13px] font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'clients'
              ? 'bg-white dark:bg-[#2c2c2e] text-[#0071e3] shadow-sm'
              : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="hidden sm:inline">Single Packages</span>
          <span className="sm:hidden">Single</span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[11px]">{clients.length}</span>
        </button>
        <button
          onClick={() => handleTabChange('monthly')}
          className={`flex-1 min-w-fit py-2.5 px-4 rounded-lg text-[13px] font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'monthly'
              ? 'bg-white dark:bg-[#2c2c2e] text-[#0071e3] shadow-sm'
              : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Monthly Recurring</span>
          <span className="sm:hidden">Monthly</span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[11px]">{monthlyClients.length}</span>
        </button>
        <button
          onClick={() => handleTabChange('archives')}
          className={`flex-1 min-w-fit py-2.5 px-4 rounded-lg text-[13px] font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'archives'
              ? 'bg-white dark:bg-[#2c2c2e] text-[#0071e3] shadow-sm'
              : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Archives</span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[11px]">{archivedClients.length}</span>
        </button>
      </div>

      {/* Filters and Search */}
      {activeTab === 'clients' && (
        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#86868b] w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search clients or packages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-black/5 dark:bg-white/5 border-0 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 bg-black/5 dark:bg-white/5 border-0 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
              
              <select
                value={packageTypeFilter}
                onChange={(e) => setPackageTypeFilter(e.target.value)}
                className="h-10 px-3 bg-black/5 dark:bg-white/5 border-0 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="all">All Packages</option>
                <option value="Standard">Standard</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
                <option value="Seven">Seven</option>
                <option value="Custom">Custom</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => fetchClients(false)}
                disabled={refreshing}
                className="h-10 px-4 rounded-xl bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Sync'}</span>
              </button>
              <button 
                onClick={handleAddClient}
                disabled={!canManagePackages}
                title={!canManagePackages ? 'You need MANAGE_POSTING_PACKAGES permission' : ''}
                className="h-10 px-4 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Client</span>
              </button>
            </div>
          </div>
          
          {/* Sync Status */}
          {lastSync && (
            <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 text-center">
              <p className="text-[12px] text-[#86868b]">
                Last synced: {lastSync.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Client List */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {filteredClients.map(client => (
          <div key={client.id} id={`client-${client.id}`} className={`rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-4 sm:p-6 hover:shadow-lg transition-all ${selectedClient?.id === client.id ? 'ring-2 ring-[#0071e3]' : ''}`}>
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
              {/* Client Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-[17px] sm:text-[19px] font-semibold mb-1 truncate">
                      <ClientLink client={client} showId />
                    </h3>
                    {client.clientEmail && (
                      <p className="text-[13px] text-[#86868b] mb-2 truncate">
                        📧 {client.clientEmail}
                      </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getPackageTypeColor(client.packageType)}`}>
                        {client.packageType}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getStatusColor(client.status)}`}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getPaymentStatusColor(client.paymentStatus)}`}>
                        {client.paymentStatus}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right flex-shrink-0">
                    <div className="text-[12px] text-[#86868b] mb-1">Package Progress</div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        disabled={approvalLoading[client.id] || (client.postsUsed || 0) <= 0}
                        onClick={() => handleQuickPostsChange(client, -1)}
                        className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 disabled:opacity-40 disabled:pointer-events-none"
                        aria-label="Decrease posts used"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-[24px] font-semibold text-[#0071e3] min-w-[4rem] text-center">
                        {client.postsUsed}/{client.packageSize}
                      </span>
                      <button
                        type="button"
                        disabled={approvalLoading[client.id] || (client.postsUsed || 0) >= client.packageSize}
                        onClick={() => handleQuickPostsChange(client, 1)}
                        className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 disabled:opacity-40 disabled:pointer-events-none"
                        aria-label="Increase posts used"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="w-24 h-2 bg-black/5 dark:bg-white/10 rounded-full mt-2 overflow-hidden ml-auto">
                      <div 
                        className="h-full bg-[#0071e3] rounded-full transition-all"
                        style={{ width: `${Math.min(((client.postsUsed || 0) / client.packageSize) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="text-[11px] text-[#86868b] mb-0.5">Posts Remaining</div>
                    <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{client.postsRemaining}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="text-[11px] text-[#86868b] mb-0.5">Posted On</div>
                    <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">{getPostsPerPageSummary(client)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="text-[11px] text-[#86868b] mb-0.5">Start Date</div>
                    <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{new Date(client.startDate).toLocaleDateString()}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                    <div className="text-[11px] text-[#86868b] mb-0.5">Last Contact</div>
                    <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{new Date(client.lastContact).toLocaleDateString()}</div>
                  </div>
                </div>
                
                {client.notes && (
                  <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                    <div className="text-[11px] text-[#86868b] mb-1">Notes:</div>
                    <div className="text-[13px] text-[#1d1d1f] dark:text-white">{client.notes}</div>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex flex-row lg:flex-col gap-2 flex-wrap lg:flex-nowrap lg:min-w-[140px]">
                {canManagePackages ? (
                  <>
                    {client.approvalStatus === 'Pending' && (
                      <>
                        <button 
                          className="h-9 px-3 rounded-xl bg-[#34c759] text-white text-[12px] font-medium hover:bg-[#30d158] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          onClick={() => openApprovalModal(client, 'approve')}
                          disabled={approvalLoading[client.id]}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button 
                          className="h-9 px-3 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          onClick={() => openApprovalModal(client, 'reject')}
                          disabled={approvalLoading[client.id]}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </>
                    )}
                    
                    <button 
                      className="h-9 px-3 rounded-xl bg-[#0071e3]/10 text-[#0071e3] text-[12px] font-medium hover:bg-[#0071e3]/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      onClick={() => openEditModal(client)}
                      disabled={approvalLoading[client.id]}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    
                    <button 
                      onClick={() => openFollowUpEmail(client)}
                      className="h-9 px-3 rounded-xl bg-black/5 dark:bg-white/5 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </button>
                    
                    <button 
                      className="h-9 px-3 rounded-xl bg-black/5 dark:bg-white/5 text-[#86868b] text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      onClick={() => archiveCompletedPackage(client)}
                      disabled={archiveLoading[client.id]}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archive
                    </button>
                    
                    <button 
                      className="h-9 px-3 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      onClick={() => deleteClient(client)}
                      disabled={deleteLoading[client.id]}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </>
                ) : (
                  <div className="text-[13px] text-[#86868b] text-center py-4">
                    <p>View Only</p>
                    <p className="text-[11px] mt-1">Contact admin for edit access</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {filteredClients.length === 0 && (
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[#0071e3]" />
            </div>
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">No clients found</h3>
            <p className="text-[14px] text-[#86868b] mb-6 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || packageTypeFilter !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'Get started by adding your first client package'
              }
            </p>
            <button 
              onClick={handleAddClient}
              disabled={!canManagePackages}
              title={!canManagePackages ? 'You need MANAGE_POSTING_PACKAGES permission' : ''}
              className="h-10 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add New Client
            </button>
          </div>
        )}
      </div>
      )}

      {/* Monthly Recurring Tab Content */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          {/* Monthly Header */}
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-1">Monthly Recurring Packages</h2>
                <p className="text-[13px] text-[#86868b]">Manage ongoing monthly subscription packages</p>
                {autoResetChecked && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-[#34c759] rounded-full"></div>
                    <span className="text-[12px] text-[#34c759]">Auto-reset checked for today</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={fetchMonthlyClients}
                  disabled={monthlyLoading}
                  className="h-9 px-3 rounded-xl bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${monthlyLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{monthlyLoading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
                <button 
                  onClick={handleAddClient}
                  disabled={!canManagePackages}
                  title={!canManagePackages ? 'You need MANAGE_POSTING_PACKAGES permission' : ''}
                  className="h-9 px-3 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Monthly</span>
                </button>
              </div>
            </div>
          </div>

          {/* Monthly List */}
          <div className="space-y-4">
            {monthlyLoading ? (
              <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-12 text-center">
                <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[14px] text-[#86868b]">Loading monthly clients...</p>
              </div>
            ) : monthlyClients.length === 0 ? (
              <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-8 sm:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#5856d6]/10 flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-[#5856d6]" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">No monthly clients</h3>
                <p className="text-[14px] text-[#86868b] mb-6 max-w-sm mx-auto">
                  Monthly recurring clients will appear here when you add them to the Monthly Recurring tab in Google Sheets.
                </p>
                <button 
                  onClick={handleAddClient}
                  disabled={!canManagePackages}
                  title={!canManagePackages ? 'You need MANAGE_POSTING_PACKAGES permission' : ''}
                  className="h-10 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Monthly Client
                </button>
              </div>
            ) : (
              monthlyClients.map(client => (
                <div key={client.id} className="rounded-2xl bg-gradient-to-r from-[#5856d6]/5 to-transparent dark:from-[#5856d6]/10 border border-[#5856d6]/20 dark:border-[#5856d6]/30 p-4 sm:p-6 hover:shadow-lg transition-all">
                  <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-[17px] sm:text-[19px] font-semibold truncate">
                              <ClientLink client={client} showId />
                            </h3>
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#5856d6]/10 text-[#5856d6]">
                              Monthly
                            </span>
                          </div>
                          {client.clientEmail && (
                            <p className="text-[13px] text-[#86868b] mb-2 truncate">
                              📧 {client.clientEmail}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getPackageTypeColor(client.packageType)}`}>
                              {client.packageType}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getStatusColor(client.status)}`}>
                              {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getPaymentStatusColor(client.paymentStatus)}`}>
                              {client.paymentStatus}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${client.autoRenew === 'TRUE' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-black/5 dark:bg-white/10 text-[#86868b]'}`}>
                              {client.autoRenew === 'TRUE' ? 'Auto Renew' : 'Manual'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-left sm:text-right flex-shrink-0">
                          <div className="text-[12px] text-[#86868b] mb-1">Monthly Progress</div>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              disabled={approvalLoading[client.id] || (client.postsUsed || 0) <= 0}
                              onClick={() => handleQuickPostsChange(client, -1)}
                              className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 disabled:opacity-40 disabled:pointer-events-none"
                              aria-label="Decrease posts used"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-[24px] font-semibold text-[#5856d6] min-w-[4rem] text-center">
                              {client.postsUsed}/{client.packageSize}
                            </span>
                            <button
                              type="button"
                              disabled={approvalLoading[client.id] || (client.postsUsed || 0) >= client.packageSize}
                              onClick={() => handleQuickPostsChange(client, 1)}
                              className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 disabled:opacity-40 disabled:pointer-events-none"
                              aria-label="Increase posts used"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="w-24 h-2 bg-black/5 dark:bg-white/10 rounded-full mt-2 overflow-hidden ml-auto">
                            <div 
                              className="h-full bg-[#5856d6] rounded-full transition-all"
                              style={{ width: `${Math.min(((client.postsUsed || 0) / client.packageSize) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10">
                          <div className="text-[11px] text-[#86868b] mb-0.5">Posts Left</div>
                          <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{client.postsRemaining}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10">
                          <div className="text-[11px] text-[#86868b] mb-0.5">Overdue</div>
                          <div className={`text-[15px] font-semibold ${(client.overduePosts || 0) > 0 ? 'text-[#ff3b30]' : 'text-[#1d1d1f] dark:text-white'}`}>
                            {client.overduePosts || 0}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10">
                          <div className="text-[11px] text-[#86868b] mb-0.5">Price</div>
                          <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">${client.monthlyPrice || 'N/A'}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10">
                          <div className="text-[11px] text-[#86868b] mb-0.5">Next Billing</div>
                          <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
                            {client.nextBillingDate ? new Date(client.nextBillingDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10">
                          <div className="text-[11px] text-[#86868b] mb-0.5">Cycle</div>
                          <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{client.billingCycle || 'Monthly'}</div>
                        </div>
                      </div>
                      
                      {client.notes && (
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10 border border-[#5856d6]/10">
                          <div className="text-[11px] text-[#86868b] mb-1">Notes:</div>
                          <div className="text-[13px] text-[#1d1d1f] dark:text-white">{client.notes}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Monthly Actions */}
                    <div className="flex flex-row lg:flex-col gap-2 flex-wrap lg:flex-nowrap lg:min-w-[140px]">
                      {canManagePackages ? (
                        <>
                          {client.approvalStatus === 'Pending' && (
                            <>
                              <button 
                                className="h-9 px-3 rounded-xl bg-[#34c759] text-white text-[12px] font-medium hover:bg-[#30d158] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                onClick={() => openApprovalModal(client, 'approve')}
                                disabled={approvalLoading[client.id]}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button 
                                className="h-9 px-3 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                onClick={() => openApprovalModal(client, 'reject')}
                                disabled={approvalLoading[client.id]}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                          
                          <button 
                            className="h-9 px-3 rounded-xl bg-[#5856d6]/10 text-[#5856d6] text-[12px] font-medium hover:bg-[#5856d6]/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            onClick={() => openEditModal(client)}
                            disabled={approvalLoading[client.id]}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          
                          <button 
                            onClick={() => openFollowUpEmail(client)}
                            className="h-9 px-3 rounded-xl bg-black/5 dark:bg-white/5 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email
                          </button>
                          
                          <button 
                            className="h-9 px-3 rounded-xl bg-[#ff9500]/10 text-[#ff9500] text-[12px] font-medium hover:bg-[#ff9500]/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            onClick={() => handleMonthlyReset(client.id)}
                            disabled={approvalLoading[client.id]}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reset
                          </button>
                          
                          <button 
                            className="h-9 px-3 rounded-xl bg-black/5 dark:bg-white/5 text-[#86868b] text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            onClick={() => archiveCompletedPackage(client)}
                            disabled={archiveLoading[client.id]}
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archive
                          </button>
                        </>
                      ) : (
                        <div className="text-[13px] text-[#86868b] text-center py-4">
                          <p>View Only</p>
                          <p className="text-[11px] mt-1">Contact admin for edit access</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Archives Tab Content */}
      {activeTab === 'archives' && (
        <div className="space-y-4">
          {/* Archives Header */}
          <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-1">Archived Posting Packages</h2>
                <p className="text-[13px] text-[#86868b]">View and manage archived posting packages</p>
              </div>
              <button 
                onClick={fetchArchivedClients}
                disabled={archivesLoading}
                className="h-9 px-3 rounded-xl bg-black/5 dark:bg-white/5 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${archivesLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{archivesLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Archives List */}
          <div className="space-y-4">
            {archivesLoading ? (
              <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-12 text-center">
                <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[14px] text-[#86868b]">Loading archived clients...</p>
              </div>
            ) : archivedClients.length === 0 ? (
              <div className="rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-8 sm:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#86868b]/10 flex items-center justify-center mx-auto mb-4">
                  <Archive className="w-8 h-8 text-[#86868b]" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">No archived clients</h3>
                <p className="text-[14px] text-[#86868b] max-w-sm mx-auto">
                  Archived clients will appear here when you archive them from the main client list.
                </p>
              </div>
            ) : (
              archivedClients.map(client => (
                <div key={client.id} className="rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 p-4 sm:p-6 hover:shadow-md transition-all">
                  <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                    {/* Client Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-[17px] sm:text-[19px] font-semibold truncate">
                              <ClientLink client={client} showId />
                            </h3>
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#86868b]/10 text-[#86868b]">
                              Archived
                            </span>
                          </div>
                          {client.clientEmail && (
                            <p className="text-[13px] text-[#86868b] mb-2 truncate">
                              📧 {client.clientEmail}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getPackageTypeColor(client.packageType)}`}>
                              {client.packageType}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getPaymentStatusColor(client.paymentStatus)}`}>
                              {client.paymentStatus}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#0071e3]/10 text-[#0071e3]">
                              {client.postsUsed}/{client.packageSize} Posts
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-left sm:text-right flex-shrink-0">
                          <div className="text-[12px] text-[#86868b] mb-1">Archive Date</div>
                          <div className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">
                            {client.statusChangeDate ? new Date(client.statusChangeDate).toLocaleDateString() : 'Unknown'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10">
                          <div className="text-[11px] text-[#86868b] mb-0.5">Posts Left</div>
                          <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{client.postsRemaining}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10">
                          <div className="text-[11px] text-[#86868b] mb-0.5">Posted On</div>
                          <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">{getPostsPerPageSummary(client)}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10">
                          <div className="text-[11px] text-[#86868b] mb-0.5">Start Date</div>
                          <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{new Date(client.startDate).toLocaleDateString()}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10">
                          <div className="text-[11px] text-[#86868b] mb-0.5">Last Contact</div>
                          <div className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{client.statusChangeDate ? new Date(client.statusChangeDate).toLocaleDateString() : 'Unknown'}</div>
                        </div>
                      </div>
                      
                      {client.notes && (
                        <div className="p-3 rounded-xl bg-white/50 dark:bg-black/10 border border-black/5 dark:border-white/5">
                          <div className="text-[11px] text-[#86868b] mb-1">Notes:</div>
                          <div className="text-[13px] text-[#1d1d1f] dark:text-white">{client.notes}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Archive Actions */}
                    <div className="flex flex-row lg:flex-col gap-2 flex-wrap lg:flex-nowrap lg:min-w-[120px]">
                      <button 
                        className="h-9 px-3 rounded-xl bg-[#0071e3] text-white text-[12px] font-medium hover:bg-[#0077ed] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        onClick={() => restoreClient(client)}
                        disabled={restoreLoading[client.id]}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${restoreLoading[client.id] ? 'animate-spin' : ''}`} />
                        {restoreLoading[client.id] ? 'Restoring' : 'Restore'}
                      </button>
                      
                      <button 
                        className="h-9 px-3 rounded-xl bg-black/5 dark:bg-white/5 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
                        onClick={() => openFollowUpEmail(client)}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </button>
                      
                      <button 
                        className="h-9 px-3 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        onClick={() => deleteArchivedClient(client)}
                        disabled={deleteArchivedLoading[client.id]}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleteArchivedLoading[client.id] ? 'Deleting' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Unified client card modal */}
      {clientForModal && (
        <ClientDetailModal
          client={clientForModal}
          onClose={closeClientCard}
          onClientUpdate={() => {}}
          employees={employees}
          showManagerAssignment={true}
        />
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedClient && createPortal(
        <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-3">
              {selectedClient.approvalStatus === 'Pending' ? 'Approve' : 'Reject'} Package
            </h3>
            <p className="text-[14px] text-[#86868b] mb-4">
              {selectedClient.approvalStatus === 'Pending' 
                ? `Approve the ${selectedClient.packageType} package for ${selectedClient.clientName}?`
                : `Reject the ${selectedClient.packageType} package for ${selectedClient.clientName}?`
              }
            </p>
            
            <div className="mb-5">
              <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                Notes (optional)
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-4 py-3 bg-black/5 dark:bg-white/5 border-0 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                rows={3}
                placeholder="Add any notes about this decision..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleApproval(selectedClient.approvalStatus === 'Pending')}
                disabled={approvalLoading[selectedClient.id]}
                className={`flex-1 h-11 rounded-xl text-[14px] font-medium transition-all disabled:opacity-50 ${
                  selectedClient.approvalStatus === 'Pending' 
                    ? 'bg-[#34c759] hover:bg-[#30d158] text-white' 
                    : 'bg-[#ff3b30] hover:bg-[#ff453a] text-white'
                }`}
              >
                {approvalLoading[selectedClient.id] ? 'Processing...' : 
                  selectedClient.approvalStatus === 'Pending' ? 'Approve' : 'Reject'
                }
              </button>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/5 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Edit Package Modal */}
      {showEditModal && editingClient && createPortal(
        <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 flex-shrink-0">
              <div>
                <h3 className="text-[19px] font-semibold text-[#1d1d1f] dark:text-white">
                  Edit Package
                </h3>
                <p className="text-[13px] text-[#86868b] mt-0.5">{editingClient.clientName}</p>
              </div>
              <button
                onClick={handleEditCancel}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[#86868b] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* CLIENT PROFILE SECTION */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0071e3]" />
                    <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">Client Profile</h4>
                  </div>
                  <p className="text-[11px] text-[#86868b] mt-0.5">Contact information and details</p>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Profile Photo */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex-shrink-0">
                      {editForm.profilePhoto ? (
                        <img src={editForm.profilePhoto} alt="Client" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#86868b]">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2 truncate">{editingClient.clientName}</p>
                      <div className="flex items-center gap-2">
                        <label className={`h-8 px-3 rounded-lg bg-[#0071e3]/10 text-[#0071e3] text-[12px] font-medium cursor-pointer hover:bg-[#0071e3]/20 transition-colors flex items-center gap-1.5 ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                          <Camera className="w-3.5 h-3.5" />
                          {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(e.target.files[0], 'edit')}
                          />
                        </label>
                        {editForm.profilePhoto && (
                          <button
                            onClick={() => setEditForm({...editForm, profilePhoto: ''})}
                            className="h-8 px-3 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email & Brokerage Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editForm.clientEmail}
                        onChange={(e) => setEditForm({...editForm, clientEmail: e.target.value})}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                        placeholder="client@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        Brokerage
                      </label>
                      <input
                        type="text"
                        value={editForm.brokerage || ''}
                        onChange={(e) => setEditForm({...editForm, brokerage: e.target.value})}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                        placeholder="e.g. RE/MAX, Sotheby's"
                      />
                    </div>
                  </div>

                  {/* Platforms Managed */}
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                      Platforms We Manage
                    </label>
                    <PlatformIcons
                      platforms={editForm.platforms || {}}
                      editable
                      onChange={(platforms) => setEditForm({...editForm, platforms})}
                    />
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* PACKAGE DETAILS SECTION */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#5856d6]" />
                    <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">Package Details</h4>
                  </div>
                  <p className="text-[11px] text-[#86868b] mt-0.5">Package type, progress, and payment</p>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Package Type & Size Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        Package Type
                      </label>
                      <select
                        value={editForm.packageType}
                        onChange={(e) => setEditForm({...editForm, packageType: e.target.value})}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                      >
                        <option value="Standard">Standard</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold">Gold</option>
                        <option value="Platinum">Platinum</option>
                        <option value="Seven">Seven</option>
                        <option value="Custom">Custom</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        Package Size
                      </label>
                      <select
                        value={editForm.packageSize}
                        onChange={(e) => {
                          const newSize = parseInt(e.target.value);
                          const newRemaining = newSize - editForm.postsUsed;
                          setEditForm({
                            ...editForm, 
                            packageSize: newSize,
                            postsRemaining: Math.max(0, newRemaining)
                          });
                        }}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                      >
                        {[...Array(15)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1} post{i + 1 !== 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Posts Progress */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-medium text-[#86868b]">Package Progress</span>
                      <span className="text-[14px] font-semibold text-[#0071e3]">{editForm.postsUsed}/{editForm.packageSize} posts</span>
                    </div>
                    <div className="w-full h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full bg-[#0071e3] rounded-full transition-all"
                        style={{ width: `${Math.min((editForm.postsUsed / editForm.packageSize) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-[#86868b] mb-1">Posts Used</label>
                        <select
                          value={editForm.postsUsed}
                          onChange={(e) => {
                            const newUsed = parseInt(e.target.value);
                            const newRemaining = editForm.packageSize - newUsed;
                            setEditForm({
                              ...editForm, 
                              postsUsed: newUsed,
                              postsRemaining: Math.max(0, newRemaining)
                            });
                          }}
                          className="w-full h-9 px-3 bg-black/5 dark:bg-white/5 border-0 rounded-lg text-[13px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        >
                          {[...Array(editForm.packageSize + 1)].map((_, i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#86868b] mb-1">Posts Remaining</label>
                        <div className="h-9 px-3 bg-black/5 dark:bg-white/5 rounded-lg flex items-center text-[13px] text-[#1d1d1f] dark:text-white">
                          {editForm.postsRemaining} <span className="text-[#86868b] ml-1">(auto)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Posts per page */}
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                      Posts per page
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {POST_PAGES.map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-[11px] text-[#86868b] mb-0.5">{label}</label>
                          <input
                            type="number"
                            min={0}
                            value={editForm[key] ?? 0}
                            onChange={(e) => setEditForm({ ...editForm, [key]: parseInt(e.target.value, 10) || 0 })}
                            className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                      Payment Status
                    </label>
                    <select
                      value={editForm.paymentStatus}
                      onChange={(e) => setEditForm({...editForm, paymentStatus: e.target.value})}
                      className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>

                  {/* Custom/Monthly Price */}
                  {(editForm.packageType === 'Custom' || editForm.packageType === 'Monthly') && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                          {editForm.packageType === 'Monthly' ? 'Monthly Price' : 'Custom Price'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]">$</span>
                          <input
                            type="number"
                            value={editForm.customPrice}
                            onChange={(e) => setEditForm({...editForm, customPrice: parseFloat(e.target.value) || 0})}
                            className="w-full h-10 pl-7 pr-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      {editForm.packageType === 'Monthly' && (
                        <div>
                          <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                            Overdue Posts
                          </label>
                          <input
                            type="number"
                            value={editForm.overduePosts || 0}
                            onChange={(e) => setEditForm({...editForm, overduePosts: parseInt(e.target.value) || 0})}
                            className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                      Package Notes
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Add notes about this package..."
                    />
                  </div>
                </div>
              </div>

              {/* Validation Message */}
              {editForm.postsUsed + editForm.postsRemaining !== editForm.packageSize && (
                <div className="p-3 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20">
                  <p className="text-[13px] text-[#ff3b30]">
                    ⚠️ Posts Used ({editForm.postsUsed}) + Posts Remaining ({editForm.postsRemaining}) must equal Package Size ({editForm.packageSize})
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-5 border-t border-black/5 dark:border-white/5 flex-shrink-0">
              <button
                onClick={handleEditCancel}
                className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/5 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={approvalLoading[editingClient.id] || editForm.postsUsed + editForm.postsRemaining !== editForm.packageSize}
                className="flex-1 h-11 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                {approvalLoading[editingClient.id] ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Add New Client Modal */}
      {showAddModal && createPortal(
        <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-black/5 dark:border-white/5 flex-shrink-0">
              <div>
                <h3 className="text-[19px] font-semibold text-[#1d1d1f] dark:text-white">
                  Add New Client
                </h3>
                <p className="text-[13px] text-[#86868b] mt-0.5">Create a new client and package</p>
              </div>
              <button
                onClick={handleAddCancel}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[#86868b] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* SELECT CLIENT (CRM) or ADD NEW */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0071e3]" />
                    <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">Client</h4>
                  </div>
                  <p className="text-[11px] text-[#86868b] mt-0.5">Select a client or lead from CRM, or add a new client</p>
                </div>
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={addForm.clientSearchFilter}
                    onChange={(e) => setAddForm({ ...addForm, clientSearchFilter: e.target.value })}
                    placeholder="Search by name or email..."
                    className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  />
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
                    <button
                      type="button"
                      onClick={() => setAddForm({ ...addForm, selectedCrmClientId: 'new', clientSearchFilter: '', clientName: '', clientEmail: '' })}
                      className={`w-full text-left px-3 py-2.5 text-[13px] font-medium transition-colors ${addForm.selectedCrmClientId === 'new' ? 'bg-[#34c759]/10 text-[#34c759]' : 'text-[#0071e3] hover:bg-[#0071e3]/10'}`}
                    >
                      ＋ Add new client
                    </button>
                    {[...crmLeads, ...crmClients]
                      .filter(c => {
                        const q = (addForm.clientSearchFilter || '').toLowerCase();
                        if (!q) return true;
                        const name = (c.clientName || c.name || '').toLowerCase();
                        const email = (c.clientEmail || c.email || '').toLowerCase();
                        return name.includes(q) || email.includes(q);
                      })
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setAddForm({
                            ...addForm,
                            selectedCrmClientId: c.id,
                            clientName: c.clientName || c.name || '',
                            clientEmail: c.clientEmail || c.email || '',
                            clientSearchFilter: ''
                          })}
                          className={`w-full text-left px-3 py-2.5 text-[13px] transition-colors ${addForm.selectedCrmClientId === c.id ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                          <span className="font-medium">{c.clientName || c.name || '—'}</span>
                          {(c.clientEmail || c.email) && <span className="text-[#86868b] ml-2">{c.clientEmail || c.email}</span>}
                          {c.source === 'lead' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">Lead</span>}
                        </button>
                      ))}
                  </div>
                  {addForm.selectedCrmClientId && addForm.selectedCrmClientId !== 'new' && (
                    <p className="text-[12px] text-[#86868b]">
                      Selected: <span className="font-medium text-[#1d1d1f] dark:text-white">{addForm.clientName}</span>
                      <button type="button" onClick={() => setAddForm({ ...addForm, selectedCrmClientId: null, clientName: '', clientEmail: '' })} className="ml-2 text-[#0071e3] hover:underline">Change</button>
                    </p>
                  )}
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* CLIENT PROFILE SECTION (only when Add new client) */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              {addForm.selectedCrmClientId === 'new' && (
              <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0071e3]" />
                    <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">New Client Profile</h4>
                  </div>
                  <p className="text-[11px] text-[#86868b] mt-0.5">Basic client information</p>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Profile Photo & Name Row */}
                  <div className="flex items-start gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex-shrink-0">
                      {addForm.profilePhoto ? (
                        <img src={addForm.profilePhoto} alt="Client" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#86868b]">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <input
                        type="text"
                        value={addForm.clientName}
                        onChange={(e) => setAddForm({...addForm, clientName: e.target.value})}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                        placeholder="Client name *"
                      />
                      <div className="flex items-center gap-2">
                        <label className={`h-8 px-3 rounded-lg bg-[#0071e3]/10 text-[#0071e3] text-[12px] font-medium cursor-pointer hover:bg-[#0071e3]/20 transition-colors flex items-center gap-1.5 ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                          <Camera className="w-3.5 h-3.5" />
                          {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(e.target.files[0], 'add')}
                          />
                        </label>
                        {addForm.profilePhoto && (
                          <button
                            onClick={() => setAddForm({...addForm, profilePhoto: ''})}
                            className="h-8 px-3 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Email & Brokerage Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={addForm.clientEmail}
                        onChange={(e) => setAddForm({...addForm, clientEmail: e.target.value})}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                        placeholder="client@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        Brokerage
                      </label>
                      <input
                        type="text"
                        value={addForm.brokerage}
                        onChange={(e) => setAddForm({...addForm, brokerage: e.target.value})}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                        placeholder="e.g. RE/MAX, Sotheby's"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Type *</label>
                    <select
                      value={addForm.clientType || CLIENT_TYPE.NA}
                      onChange={(e) => setAddForm({...addForm, clientType: e.target.value})}
                      className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                    >
                      {CLIENT_TYPE_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#86868b] mt-1">This will add the client to your CRM and record today&apos;s date.</p>
                  </div>

                  {/* Platforms Managed */}
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                      Platforms We Manage
                    </label>
                    <PlatformIcons
                      platforms={addForm.platforms}
                      editable
                      onChange={(platforms) => setAddForm({...addForm, platforms})}
                    />
                  </div>
                </div>
              </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* PACKAGE DETAILS SECTION */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#5856d6]" />
                    <h4 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white">Package Details</h4>
                  </div>
                  <p className="text-[11px] text-[#86868b] mt-0.5">Package type and configuration</p>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Package Type & Size Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        Package Type
                      </label>
                      <select
                        value={addForm.packageType}
                        onChange={(e) => setAddForm({...addForm, packageType: e.target.value})}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                      >
                        <option value="Standard">Standard</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold">Gold</option>
                        <option value="Platinum">Platinum</option>
                        <option value="Seven">Seven</option>
                        <option value="Custom">Custom</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        Package Size
                      </label>
                      <select
                        value={addForm.packageSize}
                        onChange={(e) => {
                          const newSize = parseInt(e.target.value);
                          setAddForm({
                            ...addForm, 
                            packageSize: newSize,
                            postsRemaining: newSize - addForm.postsUsed
                          });
                        }}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                      >
                        {[...Array(15)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1} post{i + 1 !== 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Posts Progress */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#1d1d1f] border border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-medium text-[#86868b]">Initial Progress</span>
                      <span className="text-[14px] font-semibold text-[#0071e3]">{addForm.postsUsed}/{addForm.packageSize} posts</span>
                    </div>
                    <div className="w-full h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full bg-[#0071e3] rounded-full transition-all"
                        style={{ width: `${Math.min((addForm.postsUsed / addForm.packageSize) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-[#86868b] mb-1">Posts Used</label>
                        <select
                          value={addForm.postsUsed}
                          onChange={(e) => {
                            const newUsed = parseInt(e.target.value);
                            setAddForm({
                              ...addForm, 
                              postsUsed: newUsed,
                              postsRemaining: addForm.packageSize - newUsed
                            });
                          }}
                          className="w-full h-9 px-3 bg-black/5 dark:bg-white/5 border-0 rounded-lg text-[13px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                        >
                          {[...Array(addForm.packageSize + 1)].map((_, i) => (
                            <option key={i} value={i}>{i}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#86868b] mb-1">Posts Remaining</label>
                        <div className="h-9 px-3 bg-black/5 dark:bg-white/5 rounded-lg flex items-center text-[13px] text-[#1d1d1f] dark:text-white">
                          {addForm.postsRemaining} <span className="text-[#86868b] ml-1">(auto)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Posts per page (Luxury Listings, IG Mansions, IG Interiors, Luxury Homes) */}
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                      Posts per page
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {POST_PAGES.map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-[11px] text-[#86868b] mb-0.5">{label}</label>
                          <input
                            type="number"
                            min={0}
                            value={addForm[key] ?? 0}
                            onChange={(e) => setAddForm({ ...addForm, [key]: parseInt(e.target.value, 10) || 0 })}
                            className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                      Payment Status
                    </label>
                    <select
                      value={addForm.paymentStatus}
                      onChange={(e) => setAddForm({...addForm, paymentStatus: e.target.value})}
                      className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>

                  {/* Approval & Start Date Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        Approval Status
                      </label>
                      <select
                        value={addForm.approvalStatus}
                        onChange={(e) => setAddForm({...addForm, approvalStatus: e.target.value})}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={addForm.startDate}
                        onChange={(e) => setAddForm({...addForm, startDate: e.target.value})}
                        className="w-full h-10 px-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Custom/Monthly Price */}
                  {(addForm.packageType === 'Custom' || addForm.packageType === 'Monthly') && (
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                        {addForm.packageType === 'Monthly' ? 'Monthly Price' : 'Custom Price'} *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]">$</span>
                        <input
                          type="number"
                          value={addForm.customPrice || ''}
                          onChange={(e) => setAddForm({...addForm, customPrice: parseFloat(e.target.value) || 0})}
                          className="w-full h-10 pl-7 pr-3 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                      Notes
                    </label>
                    <textarea
                      value={addForm.notes}
                      onChange={(e) => setAddForm({...addForm, notes: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white dark:bg-[#1d1d1f] border border-black/10 dark:border-white/10 rounded-xl text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Add notes about this client..."
                    />
                  </div>
                </div>
              </div>

              {/* Validation Messages */}
              {addForm.postsUsed + addForm.postsRemaining !== addForm.packageSize && (
                <div className="p-3 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20">
                  <p className="text-[13px] text-[#ff3b30]">
                    ⚠️ Posts Used ({addForm.postsUsed}) + Posts Remaining ({addForm.postsRemaining}) must equal Package Size ({addForm.packageSize})
                  </p>
                </div>
              )}
              
              {(addForm.packageType === 'Custom' || addForm.packageType === 'Monthly') && (!addForm.customPrice || addForm.customPrice <= 0) && (
                <div className="p-3 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20">
                  <p className="text-[13px] text-[#ff3b30]">
                    ⚠️ Please enter a valid {addForm.packageType === 'Monthly' ? 'monthly' : 'custom'} price
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 p-5 border-t border-black/5 dark:border-white/5 flex-shrink-0">
              <button
                onClick={handleAddCancel}
                className="flex-1 h-11 rounded-xl bg-black/5 dark:bg-white/5 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubmit}
                disabled={
                  approvalLoading['new'] ||
                  !addForm.selectedCrmClientId ||
                  (addForm.selectedCrmClientId === 'new' && !addForm.clientName.trim()) ||
                  addForm.postsUsed + addForm.postsRemaining !== addForm.packageSize ||
                  ((addForm.packageType === 'Custom' || addForm.packageType === 'Monthly') && (!addForm.customPrice || addForm.customPrice <= 0))
                }
                className="flex-1 h-11 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {approvalLoading['new'] ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 backdrop-blur-xl ${
          toast.type === 'success' 
            ? 'bg-[#34c759] text-white' 
            : toast.type === 'error' 
            ? 'bg-[#ff3b30] text-white' 
            : 'bg-[#0071e3] text-white'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-base">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <span className="text-[14px] font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
