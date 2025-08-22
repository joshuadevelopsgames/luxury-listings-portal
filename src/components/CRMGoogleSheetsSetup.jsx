import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { CRMGoogleSheetsService } from '../services/crmGoogleSheetsService';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CRMGoogleSheetsSetup = ({ onDataLoaded, onConnectionStatusChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [leadCounts, setLeadCounts] = useState({});

  // Load saved credentials on component mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const docRef = doc(db, 'crm_config', 'google_sheets');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setApiKey(data.apiKey || '');
        setSpreadsheetId(data.spreadsheetId || '');
        
        // Check if we have valid credentials
        if (data.apiKey && data.spreadsheetId) {
          setIsConnected(true);
          onConnectionStatusChange?.(true);
        }
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const saveCredentials = async (apiKey, spreadsheetId) => {
    try {
      const docRef = doc(db, 'crm_config', 'google_sheets');
      await setDoc(docRef, {
        apiKey,
        spreadsheetId,
        lastUpdated: new Date().toISOString(),
        isConnected: true
      });
      console.log('✅ CRM credentials saved to Firestore');
    } catch (error) {
      console.error('❌ Error saving CRM credentials:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!apiKey || !spreadsheetId) {
      setError('Please enter both API Key and Spreadsheet ID');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create a new service instance with the current API key
      const service = new CRMGoogleSheetsService();
      service.apiKey = apiKey;
      
      const result = await service.testConnection(spreadsheetId);
      
      if (result.success) {
        setIsConnected(true);
        setError('');
        
        // Save credentials on successful connection
        await saveCredentials(apiKey, spreadsheetId);
        
        onConnectionStatusChange?.(true);
        console.log('✅ Connection successful - credentials saved');
      } else {
        setError(result.error || 'Connection failed');
        setIsConnected(false);
        onConnectionStatusChange?.(false);
      }
    } catch (error) {
      setError(`Connection error: ${error.message}`);
      setIsConnected(false);
      onConnectionStatusChange?.(false);
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

    try {
      // Create a new service instance with the current API key
      const service = new CRMGoogleSheetsService();
      service.apiKey = apiKey;
      
      const data = await service.fetchCRMData();
      
      if (data.success) {
        setLastSyncTime(new Date().toLocaleString());
        setLeadCounts(data.leadCounts);
        onDataLoaded?.(data.leads);
        console.log('✅ Data synced successfully');
      } else {
        setError(data.error || 'Failed to sync data');
      }
    } catch (error) {
      setError(`Sync error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const docRef = doc(db, 'crm_config', 'google_sheets');
      await setDoc(docRef, {
        apiKey: '',
        spreadsheetId: '',
        lastUpdated: new Date().toISOString(),
        isConnected: false
      });
      
      setIsConnected(false);
      setApiKey('');
      setSpreadsheetId('');
      setError('');
      onConnectionStatusChange?.(false);
      console.log('✅ CRM disconnected - credentials cleared');
    } catch (error) {
      console.error('❌ Error disconnecting CRM:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Google Sheets CRM Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
          {lastSyncTime && (
            <span className="text-sm text-gray-500">
              Last sync: {lastSyncTime}
            </span>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            <li>Create a new project or select existing project</li>
            <li>Enable Google Sheets API</li>
            <li>Create credentials (API Key)</li>
            <li>Restrict API key to Google Sheets API only</li>
            <li>Share your spreadsheet with the service account email</li>
          </ol>
        </div>

        {/* Sheet Structure Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Expected Sheet Structure:</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>All Tabs:</strong> Organization, NAME, EMAIL, Instagram, PHONE, WEBSITE, NOTES (Headers in Row 1)</p>
            <p><strong>Tab Names:</strong> Warm Leads, Have Contacted Before with Proposals, Cold Leads</p>
            <p><strong>Data Starts:</strong> Row 2 (below headers)</p>
          </div>
        </div>

        {/* Connection Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Sheets API Key
            </label>
            <Input
              type="password"
              placeholder="Enter your Google Sheets API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spreadsheet ID
            </label>
            <Input
              placeholder="Enter your Google Spreadsheet ID"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in the URL: https://docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isConnected ? (
            <Button
              onClick={handleTestConnection}
              disabled={isLoading || !apiKey || !spreadsheetId}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleSyncData}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Sync Data'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isLoading}
              >
                Disconnect
              </Button>
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Success Display */}
        {isConnected && !error && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700">
              Successfully connected to Google Sheets! Your credentials have been saved.
            </span>
          </div>
        )}

        {/* Lead Counts */}
        {Object.keys(leadCounts).length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Data Summary:</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{leadCounts.warmLeads || 0}</div>
                <div className="text-gray-600">Warm Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{leadCounts.contactedClients || 0}</div>
                <div className="text-gray-600">Contacted Clients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{leadCounts.coldLeads || 0}</div>
                <div className="text-gray-600">Cold Leads</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CRMGoogleSheetsSetup;
