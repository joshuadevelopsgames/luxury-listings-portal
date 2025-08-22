import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CRMGoogleSheetsService } from '../services/crmGoogleSheetsService';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CRMGoogleSheetsSetup = ({ onConnectionStatusChange, onDataLoaded }) => {
  const [apiKey, setApiKey] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [serviceAccountFile, setServiceAccountFile] = useState(null);
  const [serviceAccountCredentials, setServiceAccountCredentials] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState('');
  const [leadCounts, setLeadCounts] = useState({});

  useEffect(() => {
    loadStoredCredentials();
  }, []);

  const loadStoredCredentials = async () => {
    try {
      const docRef = doc(db, 'crm_config', 'google_sheets');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setApiKey(data.apiKey || '');
        setSpreadsheetId(data.spreadsheetId || '');
        setServiceAccountCredentials(data.serviceAccountCredentials || null);
        
        if (data.apiKey && data.spreadsheetId && data.serviceAccountCredentials) {
          setIsConnected(true);
          onConnectionStatusChange?.(true);
        }
      }
    } catch (error) {
      console.error('Error loading stored credentials:', error);
    }
  };

  const handleServiceAccountFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setServiceAccountFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const credentials = JSON.parse(e.target.result);
          setServiceAccountCredentials(credentials);
          console.log('🔐 Service account credentials loaded:', credentials.client_email);
        } catch (error) {
          console.error('Error parsing service account JSON:', error);
          setError('Invalid service account JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey || !spreadsheetId || !serviceAccountCredentials) {
      setError('Please provide API Key, Spreadsheet ID, and Service Account JSON file');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const service = new CRMGoogleSheetsService();
      service.setServiceAccountCredentials(serviceAccountCredentials);
      
      // Test read access with API key
      const data = await service.fetchCRMData();
      
      if (data) {
        setSuccess('✅ Connection successful! Data fetched successfully.');
        setIsConnected(true);
        onConnectionStatusChange?.(true);
        
        // Save credentials to Firestore
        await saveCredentialsToFirestore();
        
        // Update lead counts
        setLeadCounts({
          warmLeads: data.warmLeads?.length || 0,
          contactedClients: data.contactedClients?.length || 0,
          coldLeads: data.coldLeads?.length || 0
        });
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      setError(`❌ Connection failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncData = async () => {
    if (!isConnected) {
      setError('Please test connection first');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const service = new CRMGoogleSheetsService();
      service.setServiceAccountCredentials(serviceAccountCredentials);
      
      const data = await service.fetchCRMData();
      
      if (data) {
        setSuccess('✅ Data synced successfully!');
        setLastSyncTime(new Date().toLocaleString());
        
        // Update lead counts
        setLeadCounts({
          warmLeads: data.warmLeads?.length || 0,
          contactedClients: data.contactedClients?.length || 0,
          coldLeads: data.coldLeads?.length || 0
        });
        
        // Pass data to parent component
        onDataLoaded?.(data);
      }
    } catch (error) {
      console.error('Data sync failed:', error);
      setError(`❌ Failed to sync data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCredentialsToFirestore = async () => {
    try {
      const docRef = doc(db, 'crm_config', 'google_sheets');
      await setDoc(docRef, {
        apiKey,
        spreadsheetId,
        serviceAccountCredentials,
        lastUpdated: new Date().toISOString()
      });
      console.log('✅ Credentials saved to Firestore');
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear from Firestore
      const docRef = doc(db, 'crm_config', 'google_sheets');
      await deleteDoc(docRef);
      
      // Clear local state
      setApiKey('');
      setSpreadsheetId('');
      setServiceAccountFile(null);
      setServiceAccountCredentials(null);
      setIsConnected(false);
      setLeadCounts({});
      setLastSyncTime('');
      
      onConnectionStatusChange?.(false);
      setSuccess('✅ Disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting:', error);
      setError('Error disconnecting');
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔗 Google Sheets CRM Integration
        </CardTitle>
        <CardDescription>
          Connect your CRM to Google Sheets for real-time lead management
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </Badge>
          {lastSyncTime && (
            <span className="text-sm text-muted-foreground">
              Last sync: {lastSyncTime}
            </span>
          )}
        </div>

        {/* Setup Form */}
        {!isConnected && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Google Sheets API Key (for reading data)
              </label>
              <Input
                type="password"
                placeholder="Enter your Google Sheets API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for reading data from sheets
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Spreadsheet ID
              </label>
              <Input
                placeholder="Enter your Google Spreadsheet ID"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Found in the URL: docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Service Account JSON File (for writing data)
              </label>
              <Input
                type="file"
                accept=".json"
                onChange={handleServiceAccountFileChange}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required for adding new leads. Download from Google Cloud Console.
              </p>
            </div>

            <Button 
              onClick={handleTestConnection} 
              disabled={isLoading || !apiKey || !spreadsheetId || !serviceAccountCredentials}
              className="w-full"
            >
              {isLoading ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        )}

        {/* Connected Actions */}
        {isConnected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{leadCounts.warmLeads || 0}</div>
                <div className="text-sm text-muted-foreground">Warm Leads</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{leadCounts.contactedClients || 0}</div>
                <div className="text-sm text-muted-foreground">Contacted Clients</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{leadCounts.coldLeads || 0}</div>
                <div className="text-sm text-muted-foreground">Cold Leads</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSyncData} disabled={isLoading} className="flex-1">
                {isLoading ? "Syncing..." : "Sync Data"}
              </Button>
              <Button onClick={handleDisconnect} variant="outline">
                Disconnect
              </Button>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Setup Instructions */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">📋 Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
              <li>Select your project and enable Google Sheets API</li>
              <li>Create an API key for reading data</li>
              <li>Create a Service Account for writing data:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Go to IAM & Admin → Service Accounts</li>
                  <li>Create new service account</li>
                  <li>Assign "Editor" role</li>
                  <li>Create and download JSON key</li>
                </ul>
              </li>
              <li>Share your Google Sheet with the service account email</li>
              <li>Upload the JSON file above and test connection</li>
            </ol>
          </CardContent>
        </Card>

        {/* Sheet Structure Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">📊 Expected Sheet Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800 mb-2">
              Your Google Sheet should have these tabs with headers in Row 1:
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Warm Leads</strong>
                <div className="text-blue-700">Organization, NAME, EMAIL, Instagram, PHONE, WEBSITE, NOTES</div>
              </div>
              <div>
                <strong>Have Contacted Before with Proposals</strong>
                <div className="text-blue-700">Organization, NAME, EMAIL, Instagram, PHONE, WEBSITE, NOTES</div>
              </div>
              <div>
                <strong>Cold Leads</strong>
                <div className="text-blue-700">Organization, NAME, EMAIL, Instagram, PHONE, WEBSITE, NOTES</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default CRMGoogleSheetsSetup;
