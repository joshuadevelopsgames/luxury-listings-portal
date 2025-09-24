import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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
  Filter,
  Search,
  Mail,
  AlertCircle,
  Clock,
  RefreshCw,
  Trash2
} from 'lucide-react';

export default function ClientPackages() {
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    clientName: '',
    clientEmail: '',
    packageType: 'Standard',
    packageSize: 1,
    postsUsed: 0,
    postsRemaining: 1,
    postedOn: 'Luxury Listings',
    paymentStatus: 'Pending',
    approvalStatus: 'Pending',
    notes: '',
    startDate: new Date().toISOString().split('T')[0],
    lastContact: new Date().toISOString().split('T')[0],
    customPrice: 0
  });
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

  // Google Sheets API configuration
  const GOOGLE_SHEETS_API_KEY = 'AIzaSyDxiQTlAv1UHxGYRXaZvxi2HulXBHTca3E';
  const SPREADSHEET_ID = '10MGYVVpccxgCsvcYIBeWNtu3xWvlT8GlXNecv8LAQ6g';
  const SHEET_NAME = 'Social Media Packages';
  const SHEET_GID = '802756732';
  
  // Alternative sheet name formats to try
  const SHEET_NAME_ENCODED = encodeURIComponent('Social Media Packages');
  const SHEET_NAME_QUOTED = '"Social Media Packages"';
  
  // Google Apps Script Web App URL
  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwLSYk9XRwTSZkA0KScaBYD5kttD0uPg7NX0AzSHtytzNhskrmI-DLiZTFuQFozBwh3mg/exec';

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

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
        alert(`✅ GET Test Successful: ${result.message}`);
      } else {
        alert(`❌ GET Test Failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ GET test failed:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      alert(`GET Test Failed: ${error.message}`);
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
        alert(`✅ Update Test Successful: ${result.message}`);
      } else {
        alert(`❌ Update Test Failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Update test failed:', error);
      alert(`Update Test Failed: ${error.message}`);
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
        else if (headerLower.includes('payment') && headerLower.includes('status')) columnMap.paymentStatus = index;
        else if (headerLower.includes('approval') && headerLower.includes('status')) columnMap.approvalStatus = index;
        else if (headerLower.includes('notes')) columnMap.notes = index;
        else if (headerLower.includes('date') && headerLower.includes('added')) columnMap.startDate = index;
        else if (headerLower.includes('last') && headerLower.includes('post')) columnMap.lastContact = index;
        else if (headerLower.includes('price') && headerLower.includes('paid')) columnMap.customPrice = index;
      });
      
      console.log('🔍 Column mapping:', columnMap);
      console.log('📋 Headers found:', headers);
      console.log('📧 Email column index:', columnMap.clientEmail);
      
      // Map the data to our client structure
      const fetchedClients = rows
        .filter(row => row.length > 0 && row[0]) // Filter out empty rows
        .map((row, index) => {
          // Create a dynamic mapping based on your actual sheet structure
          const client = {
            id: index + 1,
            clientName: row[columnMap.clientName] || 'Unknown Client',
            clientEmail: row[columnMap.clientEmail] || '',
            packageType: row[columnMap.packageType] || 'Standard',
            packageSize: parseInt(row[columnMap.packageSize]) || 0,
            postsUsed: parseInt(row[columnMap.postsUsed]) || 0,
            postsRemaining: parseInt(row[columnMap.postsRemaining]) || 0,
            postedOn: row[columnMap.postedOn] || 'Luxury Listings',
            paymentStatus: row[columnMap.paymentStatus] || 'Pending',
            approvalStatus: row[columnMap.approvalStatus] || 'Pending',
            notes: row[columnMap.notes] || '',
            startDate: row[columnMap.startDate] || new Date().toISOString().split('T')[0],
            lastContact: row[columnMap.lastContact] || new Date().toISOString().split('T')[0],
            customPrice: parseFloat(row[columnMap.customPrice]) || 0,
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
      alert(`Could not fetch from Google Sheets: ${error.message}\n\nUsing fallback data. Check console for detailed error information.`);
      
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
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPackageTypeColor = (type) => {
    switch (type) {
      case 'Platinum': return 'bg-purple-100 text-purple-800';
      case 'Gold': return 'bg-yellow-100 text-yellow-800';
      case 'Silver': return 'bg-gray-100 text-gray-800';
      case 'Standard': return 'bg-blue-100 text-blue-800';
      case 'Seven': return 'bg-indigo-100 text-indigo-800';
      case 'Custom': return 'bg-pink-100 text-pink-800';
      case 'Monthly': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Partial': return 'bg-blue-100 text-blue-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
      // Calculate the row number in Google Sheets
      const rowNumber = selectedClient.id + 1;
      
      // Get current row data to preserve other fields
      const currentRow = [
        selectedClient.clientName,     // Client Name (A)
        selectedClient.packageType,    // Package Type (B)
        selectedClient.packageSize,    // Package Size (C)
        selectedClient.postsUsed,      // Posts Used (D)
        selectedClient.postsRemaining, // Posts Remaining (E)
        selectedClient.postedOn,       // Posted On (F)
        selectedClient.paymentStatus,  // Payment Status (G)
        approved ? 'Approved' : 'Rejected', // Approval Status (H) - UPDATE THIS
        selectedClient.notes || '',    // Notes (I)
        selectedClient.startDate,      // Start Date (J)
        selectedClient.lastContact     // Last Contact (K)
      ];
      
      // Update Google Sheets using Google Apps Script with GET request
      const params = new URLSearchParams({
        action: 'approve',
        clientData: JSON.stringify({
          id: selectedClient.id,
          approved: approved
        })
      });
      
      const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update Google Sheets: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Google Apps Script approval result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Approval failed');
      }
      
      // Update local state
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === selectedClient.id 
            ? { 
                ...client, 
                approvalStatus: approved ? 'Approved' : 'Rejected',
                status: determineStatus(
                  approved ? 'Approved' : 'Rejected',
                  client.paymentStatus,
                  client.postsRemaining
                )
              }
            : client
        )
      );
      
      setShowApprovalModal(false);
      setSelectedClient(null);
      setApprovalNotes('');
      
      showToast(`Package ${approved ? 'approved' : 'rejected'} for ${selectedClient.clientName} in Google Sheets!`);
      
    } catch (error) {
      console.error('Error updating approval status in Google Sheets:', error);
      alert(`❌ Error updating Google Sheets: ${error.message}\n\nPlease try again or check your internet connection.`);
    } finally {
      setApprovalLoading({ ...approvalLoading, [selectedClient.id]: false });
    }
  };

  const archiveCompletedPackage = async (client) => {
    if (!client) return;
    
    if (!window.confirm(`Are you sure you want to archive ${client.clientName}? This will move them to the Archive tab.`)) {
      return;
    }
    
    setArchiveLoading({ ...archiveLoading, [client.id]: true });
    
    try {
      // Send archive request to Google Apps Script
      const requestBody = {
        action: 'archive',
        clientData: {
          clientName: client.clientName
        }
      };
      
      console.log('📦 Sending archive request to Google Apps Script:', requestBody);
      
      // Use GET with URL parameters to avoid CORS issues
      const params = new URLSearchParams({
        action: requestBody.action,
        clientData: JSON.stringify(requestBody.clientData)
      });
      
      const url = `${GOOGLE_APPS_SCRIPT_URL}?${params}`;
      console.log('🔗 Archive URL:', url);
      
      const response = await fetch(url, {
        method: 'GET'
      });
      
      console.log('📊 Archive response status:', response.status);
      const result = await response.json();
      console.log('📊 Archive response:', result);
      
      if (result.success) {
        // Remove from active clients list
        setClients(prevClients => prevClients.filter(c => c.id !== client.id));
        showToast(`${client.clientName} has been archived successfully!`);
      } else {
        throw new Error(result.error || 'Archive failed');
      }
      
    } catch (error) {
      console.error('Error archiving package:', error);
      alert(`❌ Error archiving package: ${error.message}`);
    } finally {
      setArchiveLoading({ ...archiveLoading, [client.id]: false });
    }
  };

  const deleteClient = async (client) => {
    if (!client) return;
    
    if (!window.confirm(`Are you sure you want to permanently delete ${client.clientName}? This action cannot be undone.`)) {
      return;
    }
    
    setDeleteLoading({ ...deleteLoading, [client.id]: true });
    
    try {
      // Send delete request to Google Apps Script
      const requestBody = {
        action: 'delete',
        clientData: {
          clientName: client.clientName
        }
      };
      
      console.log('🗑️ Sending delete request to Google Apps Script:', requestBody);
      
      // Use GET with URL parameters to avoid CORS issues
      const params = new URLSearchParams({
        action: requestBody.action,
        clientData: JSON.stringify(requestBody.clientData)
      });
      
      const url = `${GOOGLE_APPS_SCRIPT_URL}?${params}`;
      console.log('🔗 Delete URL:', url);
      
      const response = await fetch(url, {
        method: 'GET'
      });
      
      console.log('📊 Delete response status:', response.status);
      const result = await response.json();
      console.log('📊 Delete response:', result);
      console.log('📊 Delete response error:', result.error);
      console.log('📊 Delete response success:', result.success);
      
      if (result.success) {
        // Remove from active clients list
        setClients(prevClients => prevClients.filter(c => c.id !== client.id));
        showToast(`${client.clientName} has been deleted successfully!`);
      } else {
        // Handle specific error cases
        if (result.error && result.error.includes('not found')) {
          // Client not found in sheet, remove from local state anyway
          setClients(prevClients => prevClients.filter(c => c.id !== client.id));
          window.alert(`⚠️ ${client.clientName} was not found in Google Sheets but has been removed from the local list. The sheet may have been modified externally.`);
        } else {
          throw new Error(result.error || 'Delete failed');
        }
      }
      
    } catch (error) {
      console.error('Error deleting client:', error);
              window.alert(`❌ Error deleting client: ${error.message}`);
    } finally {
      setDeleteLoading({ ...deleteLoading, [client.id]: false });
    }
  };

  const restoreClient = async (archivedClient) => {
    if (!archivedClient) return;
    
    if (!window.confirm(`Are you sure you want to restore ${archivedClient.clientName}? This will bring them back to the active client list.`)) {
      return;
    }
    
    setRestoreLoading({ ...restoreLoading, [archivedClient.id]: true });
    
    try {
      // Send restore request to Google Apps Script
      const requestBody = {
        action: 'restore',
        clientData: {
          clientName: archivedClient.clientName,
          packageType: archivedClient.packageType,
          packageSize: archivedClient.packageSize,
          postsUsed: archivedClient.postsUsed,
          postsRemaining: archivedClient.postsRemaining,
          postedOn: archivedClient.postedOn,
          paymentStatus: archivedClient.paymentStatus,
          approvalStatus: archivedClient.approvalStatus,
          notes: archivedClient.notes,
          startDate: archivedClient.startDate,
          statusChangeDate: archivedClient.statusChangeDate
        }
      };
      
      console.log('🔄 Sending restore request to Google Apps Script:', requestBody);
      
      // Use GET with URL parameters to avoid CORS issues
      const params = new URLSearchParams({
        action: requestBody.action,
        clientData: JSON.stringify(requestBody.clientData)
      });
      
      const url = `${GOOGLE_APPS_SCRIPT_URL}?${params}`;
      console.log('🔗 Restore URL:', url);
      
      const response = await fetch(url, {
        method: 'GET'
      });
      
      console.log('📊 Restore response status:', response.status);
      const result = await response.json();
      console.log('📊 Restore response:', result);
      
      if (result.success) {
        // Remove from archived clients list
        setArchivedClients(prevArchived => prevArchived.filter(c => c.id !== archivedClient.id));
        
        // Refresh both lists to get the latest data from Google Sheets
        fetchClients(false);
        fetchArchivedClients();
        
        showToast(`${archivedClient.clientName} has been restored successfully!`);
      } else {
        throw new Error(result.error || 'Restore failed');
      }
      
    } catch (error) {
      console.error('Error restoring client:', error);
              window.alert(`❌ Error restoring client: ${error.message}`);
    } finally {
      setRestoreLoading({ ...restoreLoading, [archivedClient.id]: false });
    }
  };

  const deleteArchivedClient = async (archivedClient) => {
    if (!archivedClient) return;
    
    if (!window.confirm(`Are you sure you want to permanently delete ${archivedClient.clientName} from the archive? This action cannot be undone.`)) {
      return;
    }
    
    setDeleteArchivedLoading({ ...deleteArchivedLoading, [archivedClient.id]: true });
    
    try {
      // Send delete archived request to Google Apps Script
      const requestBody = {
        action: 'deleteArchived',
        clientData: {
          clientName: archivedClient.clientName
        }
      };
      
      console.log('🗑️ Sending delete archived request to Google Apps Script:', requestBody);
      
      // Use GET with URL parameters to avoid CORS issues
      const params = new URLSearchParams({
        action: requestBody.action,
        clientData: JSON.stringify(requestBody.clientData)
      });
      
      const url = `${GOOGLE_APPS_SCRIPT_URL}?${params}`;
      console.log('🔗 Delete Archived URL:', url);
      
      const response = await fetch(url, {
        method: 'GET'
      });
      
      console.log('📊 Delete Archived response status:', response.status);
      const result = await response.json();
      console.log('📊 Delete Archived response:', result);
      
      if (result.success) {
        // Remove from archived clients list
        setArchivedClients(prevArchived => prevArchived.filter(c => c.id !== archivedClient.id));
        showToast(`${archivedClient.clientName} has been permanently deleted from the archive!`);
      } else {
        throw new Error(result.error || 'Delete archived failed');
      }
      
    } catch (error) {
      console.error('Error deleting archived client:', error);
              window.alert(`❌ Error deleting archived client: ${error.message}`);
    } finally {
      setDeleteArchivedLoading({ ...deleteArchivedLoading, [archivedClient.id]: false });
    }
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setEditForm({
      clientEmail: client.clientEmail || '',
      packageType: client.packageType,
      packageSize: client.packageSize,
      postsUsed: client.postsUsed,
      postsRemaining: client.postsRemaining,
      notes: client.notes || '',
      postedOn: client.postedOn,
      paymentStatus: client.paymentStatus,
      customPrice: client.customPrice || 0
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editingClient) return;
    
    setApprovalLoading({ ...approvalLoading, [editingClient.id]: true });
    
    try {
      // Validate form data
      if (editForm.postsUsed + editForm.postsRemaining !== editForm.packageSize) {
        alert('Posts Used + Posts Remaining must equal Package Size');
        return;
      }

      // Validate custom price for Custom and Monthly packages
      if ((editForm.packageType === 'Custom' || editForm.packageType === 'Monthly') && (!editForm.customPrice || editForm.customPrice <= 0)) {
        alert(`Please enter a valid ${editForm.packageType === 'Monthly' ? 'monthly' : 'custom'} price`);
        return;
      }
      
      // Calculate the row number in Google Sheets (add 2 for header row + 0-based index)
      const rowNumber = editingClient.id + 1;
      
      // Prepare the updated row data
      const updatedRow = [
        editingClient.clientName, // Client Name (A)
        editForm.packageType,     // Package Type (B)
        editForm.packageSize,     // Package Size (C)
        editForm.postsUsed,       // Posts Used (D)
        editForm.postsRemaining,  // Posts Remaining (E)
        editForm.postedOn,        // Posted On (F)
        editForm.paymentStatus,   // Payment Status (G)
        editingClient.approvalStatus, // Approval Status (H) - keep existing
        editForm.notes,           // Notes (I)
        editingClient.startDate,  // Start Date (J) - keep existing
        editingClient.lastContact // Last Contact (K) - keep existing
      ];
      
      // Update Google Sheets using Google Apps Script
      const requestBody = {
        action: 'update',
        clientData: {
          id: editingClient.id,
          clientName: editingClient.clientName,
          clientEmail: editForm.clientEmail,
          packageType: editForm.packageType,
          packageSize: editForm.packageSize,
          postsUsed: editForm.postsUsed,
          postsRemaining: editForm.postsRemaining,
          postedOn: editForm.postedOn,
          paymentStatus: editForm.paymentStatus,
          approvalStatus: editingClient.approvalStatus,
          notes: editForm.notes,
          startDate: editingClient.startDate,
          lastContact: editingClient.lastContact,
          customPrice: editForm.customPrice || 0
        }
      };
      
      console.log('🔄 Sending update request to Google Apps Script:', requestBody);
      
      // Use GET with URL parameters to avoid CORS issues
      const params = new URLSearchParams({
        action: requestBody.action,
        clientData: JSON.stringify(requestBody.clientData)
      });
      
      const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`, {
        method: 'GET'
      });
      
      console.log('📊 Update response status:', response.status);
      console.log('📊 Update response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update failed - Response text:', errorText);
        throw new Error(`Failed to update Google Sheets: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Google Apps Script update result:', result);
      
      if (!result.success) {
        console.error('❌ Google Apps Script returned error:', result);
        throw new Error(result.error || 'Update failed');
      }
      
      console.log('✅ Google Apps Script update successful:', result);
      
      // Update local state
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === editingClient.id 
            ? { 
                ...client, 
                clientEmail: editForm.clientEmail,
                packageType: editForm.packageType,
                packageSize: editForm.packageSize,
                postsUsed: editForm.postsUsed,
                postsRemaining: editForm.postsRemaining,
                notes: editForm.notes,
                postedOn: editForm.postedOn,
                paymentStatus: editForm.paymentStatus,
                customPrice: editForm.customPrice || 0,
                // Update status based on new data
                status: determineStatus(client.approvalStatus, editForm.paymentStatus, editForm.postsRemaining)
              }
            : client
        )
      );
      
      // Close modal and reset state
      setShowEditModal(false);
      setEditingClient(null);
      setEditForm({});
      
      // Show success message
              showToast(`Package for ${editingClient.clientName} has been updated in Google Sheets!`);
      
    } catch (error) {
      console.error('Error updating Google Sheets:', error);
      alert(`❌ Error updating Google Sheets: ${error.message}\n\nPlease try again or check your internet connection.`);
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

  // Add client to CRM when new package is added
  const addClientToCRM = async (clientData) => {
    try {
      console.log('🔄 Adding client to CRM:', clientData);
      
      // Prepare lead data for CRM
      const leadData = {
        contactName: clientData.clientName,
        email: clientData.clientEmail || '',
        organization: '', // Will be empty for now
        phone: '', // Will be empty for now
        instagram: '', // Will be empty for now
        website: '', // Will be empty for now
        notes: `New ${clientData.packageType} package client - ${clientData.notes || 'No additional notes'}`
      };
      
      // Default to adding to "Warm Leads" tab
      const selectedTabs = {
        warmLeads: true,
        contactedClients: false,
        coldLeads: false
      };
      
      // Use the same Google Apps Script URL but with addLead action
      const params = new URLSearchParams({
        action: 'addLead',
        leadData: JSON.stringify(leadData),
        selectedTabs: JSON.stringify(selectedTabs)
      });
      
      const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ CRM add failed:', errorText);
        return { success: false, error: errorText };
      }
      
      const result = await response.json();
      console.log('✅ CRM add result:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error adding client to CRM:', error);
      return { success: false, error: error.message };
    }
  };

  const handleAddSubmit = async () => {
    if (!addForm.clientName.trim()) {
      alert('Please enter a client name');
      return;
    }

    if (addForm.postsUsed + addForm.postsRemaining !== addForm.packageSize) {
      alert('Posts Used + Posts Remaining must equal Package Size');
      return;
    }

    // Validate custom price for Custom and Monthly packages
    if ((addForm.packageType === 'Custom' || addForm.packageType === 'Monthly') && (!addForm.customPrice || addForm.customPrice <= 0)) {
      alert(`Please enter a valid ${addForm.packageType === 'Monthly' ? 'monthly' : 'custom'} price`);
      return;
    }

    setApprovalLoading({ ...approvalLoading, 'new': true });

    try {
      // Prepare the new row data
      const newRow = [
        addForm.clientName,
        addForm.packageType,
        addForm.packageSize,
        addForm.postsUsed,
        addForm.postsRemaining,
        addForm.postedOn,
        addForm.paymentStatus,
        addForm.approvalStatus,
        addForm.notes,
        addForm.startDate,
        addForm.lastContact
      ];

      // Add to Google Sheets using Google Apps Script with GET request
      const params = new URLSearchParams({
        action: 'add',
        clientData: JSON.stringify({
          clientName: addForm.clientName,
          clientEmail: addForm.clientEmail,
          packageType: addForm.packageType,
          packageSize: addForm.packageSize,
          postsUsed: addForm.postsUsed,
          postsRemaining: addForm.postsRemaining,
          postedOn: addForm.postedOn,
          paymentStatus: addForm.paymentStatus,
          approvalStatus: addForm.approvalStatus,
          notes: addForm.notes,
          startDate: addForm.startDate,
          lastContact: addForm.lastContact,
          customPrice: addForm.customPrice
        })
      });
      
      // Try to fetch with error handling for CORS
      let result;
      try {
        const response = await fetch(`${GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`, {
          method: 'GET'
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to add to Google Sheets: ${response.status} - ${errorText}`);
        }

        result = await response.json();
        console.log('Google Apps Script add result:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Add failed');
        }
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        
        // If it's a CORS error, try using a different approach
        if (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch')) {
          // Try using a simple image request to trigger the action
          const img = new Image();
          img.onload = async () => {
            console.log('✅ Add request sent successfully via image method');
            // Refresh the client list after a short delay
            setTimeout(async () => {
              await fetchClients(false);
              
              // Add client to CRM
              const crmResult = await addClientToCRM({
                clientName: addForm.clientName,
                clientEmail: addForm.clientEmail,
                packageType: addForm.packageType,
                notes: addForm.notes
              });
              
              // Reset form and close modal
              setAddForm({
                clientName: '',
                clientEmail: '',
                packageType: 'Standard',
                packageSize: 1,
                postsUsed: 0,
                postsRemaining: 1,
                postedOn: 'Luxury Listings',
                paymentStatus: 'Pending',
                approvalStatus: 'Pending',
                notes: '',
                startDate: new Date().toISOString().split('T')[0],
                lastContact: new Date().toISOString().split('T')[0]
              });
              setShowAddModal(false);
              
              if (crmResult.success) {
                showToast(`New client "${addForm.clientName}" has been added to Google Sheets and CRM!`);
              } else {
                showToast(`New client "${addForm.clientName}" has been added to Google Sheets! (CRM add failed: ${crmResult.error})`);
              }
            }, 1000);
          };
          img.onerror = async () => {
            console.log('✅ Add request sent successfully via image method (error expected)');
            // Refresh the client list after a short delay
            setTimeout(async () => {
              await fetchClients(false);
              
              // Add client to CRM
              const crmResult = await addClientToCRM({
                clientName: addForm.clientName,
                clientEmail: addForm.clientEmail,
                packageType: addForm.packageType,
                notes: addForm.notes
              });
              
              // Reset form and close modal
              setAddForm({
                clientName: '',
                clientEmail: '',
                packageType: 'Standard',
                packageSize: 1,
                postsUsed: 0,
                postsRemaining: 1,
                postedOn: 'Luxury Listings',
                paymentStatus: 'Pending',
                approvalStatus: 'Pending',
                notes: '',
                startDate: new Date().toISOString().split('T')[0],
                lastContact: new Date().toISOString().split('T')[0]
              });
              setShowAddModal(false);
              
              if (crmResult.success) {
                showToast(`New client "${addForm.clientName}" has been added to Google Sheets and CRM!`);
              } else {
                showToast(`New client "${addForm.clientName}" has been added to Google Sheets! (CRM add failed: ${crmResult.error})`);
              }
            }, 1000);
          };
          img.src = `${GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`;
          return; // Exit early since we're handling it asynchronously
        } else {
          throw fetchError; // Re-throw if it's not a CORS error
        }
      }

      // Refresh the client list to get the updated data
      await fetchClients(false);

      // Add client to CRM
      const crmResult = await addClientToCRM({
        clientName: addForm.clientName,
        clientEmail: addForm.clientEmail,
        packageType: addForm.packageType,
        notes: addForm.notes
      });

      // Reset form and close modal
      setAddForm({
        clientName: '',
        clientEmail: '',
        packageType: 'Standard',
        packageSize: 1,
        postsUsed: 0,
        postsRemaining: 1,
        postedOn: 'Luxury Listings',
        paymentStatus: 'Pending',
        approvalStatus: 'Pending',
        notes: '',
        startDate: new Date().toISOString().split('T')[0],
        lastContact: new Date().toISOString().split('T')[0]
      });
      setShowAddModal(false);

      // Show success message with CRM status
      if (crmResult.success) {
        showToast(`New client "${addForm.clientName}" has been added to Google Sheets and CRM!`);
      } else {
        showToast(`New client "${addForm.clientName}" has been added to Google Sheets! (CRM add failed: ${crmResult.error})`);
      }

    } catch (error) {
      console.error('Error adding client to Google Sheets:', error);
      alert(`❌ Error adding to Google Sheets: ${error.message}\n\nPlease try again or check your internet connection.`);
    } finally {
      setApprovalLoading({ ...approvalLoading, 'new': false });
    }
  };

  const handleAddCancel = () => {
    setShowAddModal(false);
    setAddForm({
      clientName: '',
      packageType: 'Standard',
      packageSize: 1,
      postsUsed: 0,
      postsRemaining: 1,
      postedOn: 'Luxury Listings',
      paymentStatus: 'Pending',
      approvalStatus: 'Pending',
      notes: '',
      startDate: new Date().toISOString().split('T')[0],
      lastContact: new Date().toISOString().split('T')[0]
    });
  };

  const openFollowUpEmail = (client) => {
    const subject = `Follow-up: ${client.packageType} Package - ${client.clientName}`;
    const body = `Hi ${client.clientName},\n\nI hope this email finds you well. I wanted to follow up on your ${client.packageType} package.\n\nCurrent Status:\n- Package: ${client.packageType} (${client.packageSize} posts)\n- Posts Used: ${client.postsUsed}\n- Posts Remaining: ${client.postsRemaining}\n- Payment Status: ${client.paymentStatus}\n\n${client.notes ? `Notes: ${client.notes}\n\n` : ''}Please let me know if you have any questions or if there's anything else I can assist you with.\n\nBest regards,\n[Your Name]\nLuxury Listings Team`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading client packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Client Packages</h1>
        <p className="text-slate-600">Manage luxury real estate client relationships and package delivery</p>
        
        {/* Google Apps Script Test Button */}
        <div className="mt-4 flex gap-3 justify-center">
          <Button
            onClick={testGoogleAppsScriptDetailed}
            variant="outline"
            className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
          >
            🔧 Test Google Apps Script
          </Button>
          <Button
            onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`, '_blank')}
            variant="outline"
            className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            📊 Open Google Sheets
          </Button>
        </div>
        {scriptTestResult && (
          <div className="mt-2 p-2 text-sm rounded">
            {scriptTestResult.success ? (
              <div className="text-green-700 bg-green-50 border border-green-200 rounded p-2">
                ✅ Script working: {scriptTestResult.message || 'Connection successful'}
              </div>
            ) : (
              <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2">
                ❌ Script error: {scriptTestResult.error || 'Unknown error'}
                {scriptTestResult.details && (
                  <div className="mt-1 text-xs">{scriptTestResult.details}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Clients</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active Packages</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending Approval</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">${stats.revenue.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => handleTabChange('clients')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'clients'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Package className="w-4 h-4 inline mr-2" />
          Single Packages ({clients.length})
        </button>
        <button
          onClick={() => handleTabChange('monthly')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'monthly'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Monthly Recurring ({monthlyClients.length})
        </button>
        <button
          onClick={() => handleTabChange('archives')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'archives'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Archive className="w-4 h-4 inline mr-2" />
          Archives ({archivedClients.length})
        </button>
      </div>

      {/* Filters and Search */}
      {activeTab === 'clients' && (
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search clients or packages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Package Types</option>
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
              <Button 
                onClick={() => fetchClients(false)}
                disabled={refreshing}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Syncing...' : 'Sync from Sheets'}
              </Button>
              <Button 
                onClick={handleAddClient}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Client
              </Button>
            </div>
          </div>
          
          {/* Sync Status */}
          {lastSync && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Last synced: {lastSync.toLocaleString()}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Client List */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {filteredClients.map(client => (
          <Card key={client.id} className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Client Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {client.clientName}
                    </h3>
                    {client.clientEmail && (
                      <p className="text-sm text-gray-600 mb-2">
                        📧 {client.clientEmail}
                      </p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={getPackageTypeColor(client.packageType)}>
                        {client.packageType}
                      </Badge>
                      <Badge className={getStatusColor(client.status)}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </Badge>
                      <Badge className={getPaymentStatusColor(client.paymentStatus)}>
                        {client.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Package Progress</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {client.postsUsed}/{client.packageSize}
                    </div>
                    <Progress 
                      value={(client.postsUsed / client.packageSize) * 100} 
                      className="w-24 mt-2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500">Posts Remaining</div>
                    <div className="font-semibold">{client.postsRemaining}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Posted On</div>
                    <div className="font-semibold">{client.postedOn}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Start Date</div>
                    <div className="font-semibold">{new Date(client.startDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Last Contact</div>
                    <div className="font-semibold">{new Date(client.lastContact).toLocaleDateString()}</div>
                  </div>
                </div>
                
                {client.notes && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-sm text-gray-600 mb-1">Notes:</div>
                    <div className="text-sm">{client.notes}</div>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex flex-col gap-2 min-w-fit">
                {client.approvalStatus === 'Pending' && (
                  <>
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => openApprovalModal(client, 'approve')}
                      disabled={approvalLoading[client.id]}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => openApprovalModal(client, 'reject')}
                      disabled={approvalLoading[client.id]}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => openEditModal(client)}
                  disabled={approvalLoading[client.id]}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Package
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openFollowUpEmail(client)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Follow Up
                </Button>
                
                {/* Archive and Delete buttons for all clients */}
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => archiveCompletedPackage(client)}
                  disabled={archiveLoading[client.id]}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => deleteClient(client)}
                  disabled={deleteLoading[client.id]}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
        
        {filteredClients.length === 0 && (
          <Card className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || packageTypeFilter !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'Get started by adding your first client package'
              }
            </p>
            <Button 
              onClick={handleAddClient}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Client
            </Button>
          </Card>
        )}
      </div>
      )}

      {/* Monthly Recurring Tab Content */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Monthly Header */}
          <Card className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Monthly Recurring Packages</h2>
                <p className="text-gray-600">Manage ongoing monthly subscription packages</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={fetchMonthlyClients}
                  disabled={monthlyLoading}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${monthlyLoading ? 'animate-spin' : ''}`} />
                  {monthlyLoading ? 'Refreshing...' : 'Refresh Monthly'}
                </Button>
                <Button 
                  onClick={handleAddClient}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Monthly Client
                </Button>
              </div>
            </div>
          </Card>

          {/* Monthly List */}
          <div className="space-y-4">
            {monthlyLoading ? (
              <Card className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading monthly clients...</p>
              </Card>
            ) : monthlyClients.length === 0 ? (
              <Card className="p-12 text-center">
                <RefreshCw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No monthly clients</h3>
                <p className="text-gray-600 mb-4">
                  Monthly recurring clients will appear here when you add them to the Monthly Recurring tab in Google Sheets.
                </p>
                <Button 
                  onClick={handleAddClient}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Monthly Client
                </Button>
              </Card>
            ) : (
              monthlyClients.map(client => (
                <Card key={client.id} className="p-6 border-blue-200 bg-blue-50">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Client Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {client.clientName}
                            </h3>
                            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                              Monthly
                            </Badge>
                          </div>
                          {client.clientEmail && (
                            <p className="text-sm text-gray-600 mb-2">
                              📧 {client.clientEmail}
                            </p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={getPackageTypeColor(client.packageType)}>
                              {client.packageType}
                            </Badge>
                            <Badge className={getStatusColor(client.status)}>
                              {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                            </Badge>
                            <Badge className={getPaymentStatusColor(client.paymentStatus)}>
                              {client.paymentStatus}
                            </Badge>
                            <Badge className={client.autoRenew === 'TRUE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                              {client.autoRenew === 'TRUE' ? 'Auto Renew' : 'Manual'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-500 mb-1">Monthly Progress</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {client.postsUsed}/{client.packageSize}
                          </div>
                          <Progress 
                            value={(client.postsUsed / client.packageSize) * 100} 
                            className="w-24 mt-2"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Posts Remaining</div>
                          <div className="font-semibold">{client.postsRemaining}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Monthly Price</div>
                          <div className="font-semibold">${client.monthlyPrice || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Next Billing</div>
                          <div className="font-semibold">
                            {client.nextBillingDate ? new Date(client.nextBillingDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Billing Cycle</div>
                          <div className="font-semibold">{client.billingCycle || 'Monthly'}</div>
                        </div>
                      </div>
                      
                      {client.notes && (
                        <div className="bg-white p-3 rounded-md border border-blue-200">
                          <div className="text-sm text-gray-600 mb-1">Notes:</div>
                          <div className="text-sm">{client.notes}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Monthly Actions */}
                    <div className="flex flex-col gap-2 min-w-fit">
                      {client.approvalStatus === 'Pending' && (
                        <>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => openApprovalModal(client, 'approve')}
                            disabled={approvalLoading[client.id]}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => openApprovalModal(client, 'reject')}
                            disabled={approvalLoading[client.id]}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => openEditModal(client)}
                        disabled={approvalLoading[client.id]}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Package
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openFollowUpEmail(client)}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Follow Up
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => archiveCompletedPackage(client)}
                        disabled={archiveLoading[client.id]}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Archives Tab Content */}
      {activeTab === 'archives' && (
        <div className="space-y-6">
          {/* Archives Header */}
          <Card className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Archived Client Packages</h2>
                <p className="text-gray-600">View and manage archived client relationships</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={fetchArchivedClients}
                  disabled={archivesLoading}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${archivesLoading ? 'animate-spin' : ''}`} />
                  {archivesLoading ? 'Refreshing...' : 'Refresh Archives'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Archives List */}
          <div className="space-y-4">
            {archivesLoading ? (
              <Card className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading archived clients...</p>
              </Card>
            ) : archivedClients.length === 0 ? (
              <Card className="p-12 text-center">
                <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No archived clients</h3>
                <p className="text-gray-600 mb-4">
                  Archived clients will appear here when you archive them from the main client list.
                </p>
              </Card>
            ) : (
              archivedClients.map(client => (
                <Card key={client.id} className="p-6 bg-gray-50 border-gray-200">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Client Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {client.clientName}
                            </h3>
                            <Badge className="bg-gray-100 text-gray-700 border-gray-300">
                              Archived
                            </Badge>
                          </div>
                          {client.clientEmail && (
                            <p className="text-sm text-gray-600 mb-2">
                              📧 {client.clientEmail}
                            </p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={getPackageTypeColor(client.packageType)}>
                              {client.packageType}
                            </Badge>
                            <Badge className={getPaymentStatusColor(client.paymentStatus)}>
                              {client.paymentStatus}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-700">
                              {client.postsUsed}/{client.packageSize} Posts
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-500 mb-1">Archive Date</div>
                          <div className="text-sm font-semibold text-gray-700">
                            {client.statusChangeDate ? new Date(client.statusChangeDate).toLocaleDateString() : 'Unknown'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-500">Posts Remaining</div>
                          <div className="font-semibold">{client.postsRemaining}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Posted On</div>
                          <div className="font-semibold">{client.postedOn}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Start Date</div>
                          <div className="font-semibold">{new Date(client.startDate).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Last Contact</div>
                          <div className="font-semibold">{client.statusChangeDate ? new Date(client.statusChangeDate).toLocaleDateString() : 'Unknown'}</div>
                        </div>
                      </div>
                      
                      {client.notes && (
                        <div className="bg-white p-3 rounded-md border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Notes:</div>
                          <div className="text-sm">{client.notes}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Archive Actions */}
                    <div className="flex flex-col gap-2 min-w-fit">
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => restoreClient(client)}
                        disabled={restoreLoading[client.id]}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${restoreLoading[client.id] ? 'animate-spin' : ''}`} />
                        {restoreLoading[client.id] ? 'Restoring...' : 'Restore'}
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => openFollowUpEmail(client)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Follow Up
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => deleteArchivedClient(client)}
                        disabled={deleteArchivedLoading[client.id]}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deleteArchivedLoading[client.id] ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedClient.approvalStatus === 'Pending' ? 'Approve' : 'Reject'} Package
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedClient.approvalStatus === 'Pending' 
                ? `Approve the ${selectedClient.packageType} package for ${selectedClient.clientName}?`
                : `Reject the ${selectedClient.packageType} package for ${selectedClient.clientName}?`
              }
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add any notes about this decision..."
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => handleApproval(selectedClient.approvalStatus === 'Pending')}
                disabled={approvalLoading[selectedClient.id]}
                className={`flex-1 ${
                  selectedClient.approvalStatus === 'Pending' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {approvalLoading[selectedClient.id] ? 'Processing...' : 
                  selectedClient.approvalStatus === 'Pending' ? 'Approve' : 'Reject'
                }
              </Button>
              <Button
                onClick={() => setShowApprovalModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Package Modal */}
      {showEditModal && editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit Package - {editingClient.clientName}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Email */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Email
                </label>
                <input
                  type="email"
                  value={editForm.clientEmail}
                  onChange={(e) => setEditForm({...editForm, clientEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter client email"
                />
              </div>

              {/* Package Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Type *
                </label>
                <select
                  value={editForm.packageType}
                  onChange={(e) => setEditForm({...editForm, packageType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* Package Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Size (Posts) *
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(15)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} post{i + 1 !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Posts Used */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posts Used *
                </label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(editForm.packageSize + 1)].map((_, i) => (
                    <option key={i} value={i}>{i} post{i !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Posts Remaining */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posts Remaining *
                </label>
                <input
                  type="number"
                  value={editForm.postsRemaining}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>

              {/* Posted On */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posted On (Page)
                </label>
                <select
                  value={editForm.postedOn}
                  onChange={(e) => setEditForm({...editForm, postedOn: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Luxury Listings">Luxury Listings</option>
                  <option value="Mansions">Mansions</option>
                  <option value="Homes">Homes</option>
                  <option value="All Pages">All Pages</option>
                  <option value="4 Luxury Listings + 3 on Mansions">4 Luxury Listings + 3 on Mansions</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <select
                  value={editForm.paymentStatus}
                  onChange={(e) => setEditForm({...editForm, paymentStatus: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              {/* Custom Price - Show for Custom and Monthly packages */}
              {(editForm.packageType === 'Custom' || editForm.packageType === 'Monthly') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editForm.packageType === 'Monthly' ? 'Monthly Price (USD)' : 'Custom Price (USD)'} *
                  </label>
                  <input
                    type="number"
                    value={editForm.customPrice}
                    onChange={(e) => setEditForm({...editForm, customPrice: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Enter ${editForm.packageType === 'Monthly' ? 'monthly' : 'custom'} price`}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editForm.packageType === 'Monthly' 
                      ? 'Enter the monthly price for this package' 
                      : 'Enter the custom price for this package'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Add or update notes about this client package..."
              />
            </div>

            {/* Validation Message */}
            {editForm.postsUsed + editForm.postsRemaining !== editForm.packageSize && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  ⚠️ Posts Used ({editForm.postsUsed}) + Posts Remaining ({editForm.postsRemaining}) must equal Package Size ({editForm.packageSize})
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6">
              <Button
                onClick={handleEditSubmit}
                disabled={approvalLoading[editingClient.id] || editForm.postsUsed + editForm.postsRemaining !== editForm.packageSize}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {approvalLoading[editingClient.id] ? 'Updating...' : 'Update Package'}
              </Button>
              <Button
                onClick={handleEditCancel}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add New Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Add New Client
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={addForm.clientName}
                  onChange={(e) => setAddForm({...addForm, clientName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter client name"
                />
              </div>

              {/* Client Email */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Email *
                </label>
                <input
                  type="email"
                  value={addForm.clientEmail}
                  onChange={(e) => setAddForm({...addForm, clientEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter client email"
                />
              </div>

              {/* Package Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Type *
                </label>
                <select
                  value={addForm.packageType}
                  onChange={(e) => setAddForm({...addForm, packageType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* Package Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Size (Posts) *
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(15)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} post{i + 1 !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Posts Used */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posts Used *
                </label>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(addForm.packageSize + 1)].map((_, i) => (
                    <option key={i} value={i}>{i} post{i !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Posts Remaining */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posts Remaining *
                </label>
                <input
                  type="number"
                  value={addForm.postsRemaining}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>

              {/* Posted On */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posted On (Page)
                </label>
                <select
                  value={addForm.postedOn}
                  onChange={(e) => setAddForm({...addForm, postedOn: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Luxury Listings">Luxury Listings</option>
                  <option value="Mansions">Mansions</option>
                  <option value="Homes">Homes</option>
                  <option value="All Pages">All Pages</option>
                  <option value="4 Luxury Listings + 3 on Mansions">4 Luxury Listings + 3 on Mansions</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <select
                  value={addForm.paymentStatus}
                  onChange={(e) => setAddForm({...addForm, paymentStatus: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              {/* Approval Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Status
                </label>
                <select
                  value={addForm.approvalStatus}
                  onChange={(e) => setAddForm({...addForm, approvalStatus: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={addForm.startDate}
                  onChange={(e) => setAddForm({...addForm, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Last Contact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Contact
                </label>
                <input
                  type="date"
                  value={addForm.lastContact}
                  onChange={(e) => setAddForm({...addForm, lastContact: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Custom Price - Show for Custom and Monthly packages */}
            {(addForm.packageType === 'Custom' || addForm.packageType === 'Monthly') && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {addForm.packageType === 'Monthly' ? 'Monthly Price (USD)' : 'Custom Price (USD)'} *
                </label>
                <input
                  type="number"
                  value={addForm.customPrice || ''}
                  onChange={(e) => setAddForm({...addForm, customPrice: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter ${addForm.packageType === 'Monthly' ? 'monthly' : 'custom'} price`}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {addForm.packageType === 'Monthly' 
                    ? 'Enter the monthly price for this package' 
                    : 'Enter the custom price for this package'
                  }
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={addForm.notes}
                onChange={(e) => setAddForm({...addForm, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Add notes about this client..."
              />
            </div>

            {/* Validation Messages */}
            {addForm.postsUsed + addForm.postsRemaining !== addForm.packageSize && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  ⚠️ Posts Used ({addForm.postsUsed}) + Posts Remaining ({addForm.postsRemaining}) must equal Package Size ({addForm.packageSize})
                </p>
              </div>
            )}
            
            {(addForm.packageType === 'Custom' || addForm.packageType === 'Monthly') && (!addForm.customPrice || addForm.customPrice <= 0) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  ⚠️ Please enter a valid {addForm.packageType === 'Monthly' ? 'monthly' : 'custom'} price
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6">
              <Button
                onClick={handleAddSubmit}
                disabled={
                  approvalLoading['new'] || 
                  addForm.postsUsed + addForm.postsRemaining !== addForm.packageSize || 
                  !addForm.clientName.trim() ||
                  ((addForm.packageType === 'Custom' || addForm.packageType === 'Monthly') && (!addForm.customPrice || addForm.customPrice <= 0))
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
              >
                <Plus className="w-4 h-4 mr-2" />
                {approvalLoading['new'] ? 'Adding...' : 'Add Client'}
              </Button>
              <Button
                onClick={handleAddCancel}
                variant="outline"
                className="flex-1"
              >
                Cancel
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
}
