import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Copy,
  Download
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { firestoreService } from '../services/firestoreService';

const GoogleAnalyticsSetup = () => {
  const [propertyId, setPropertyId] = useState('501624524');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleValidate = async () => {
    if (!propertyId || !serviceAccountJson) {
      setValidationResult({ success: false, message: 'Please fill in all fields' });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      // Parse the JSON
      const credentials = JSON.parse(serviceAccountJson);
      
      // Initialize the analytics service with the credentials
      analyticsService.propertyId = propertyId;
      analyticsService.serviceAccountJson = serviceAccountJson;
      
      // Generate a real JWT token from the service account
      await analyticsService.generateAccessToken(credentials);
      
      // Test the connection with real credentials
      const overview = await analyticsService.getOverviewMetrics('7d');
      
      setValidationResult({ 
        success: true, 
        message: '✅ Google Analytics connection successful! Real data is now available.',
        data: overview
      });
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({ 
        success: false, 
        message: `❌ Connection failed: ${error.message}. Please check your Property ID and Service Account permissions.` 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveToFirestore = async () => {
    try {
      console.log('💾 Saving analytics config to Firestore...');
      console.log('Property ID:', propertyId);
      console.log('Service Account JSON length:', serviceAccountJson.length);
      
      await firestoreService.saveAnalyticsConfig(propertyId, serviceAccountJson);
      
      console.log('✅ Analytics config saved successfully to Firestore');
      setValidationResult({ 
        success: true, 
        message: 'Credentials saved to secure cloud storage! ✅' 
      });
    } catch (error) {
      console.error('❌ Error saving to Firestore:', error);
      setValidationResult({ 
        success: false, 
        message: 'Failed to save credentials: ' + error.message 
      });
    }
  };

  const handleLoadFromFirestore = async () => {
    try {
      console.log('📥 Loading analytics config from Firestore...');
      const config = await firestoreService.getAnalyticsConfig();
      
      if (config) {
        console.log('✅ Found saved config:', config);
        setPropertyId(config.propertyId || '');
        setServiceAccountJson(config.serviceAccountJson || '');
        setValidationResult({ 
          success: true, 
          message: 'Configuration loaded from cloud storage! ✅' 
        });
      } else {
        console.log('ℹ️ No saved config found');
        setValidationResult({ 
          success: false, 
          message: 'No saved configuration found in cloud storage' 
        });
      }
    } catch (error) {
      console.error('❌ Error loading from Firestore:', error);
      setValidationResult({ 
        success: false, 
        message: 'Failed to load configuration: ' + error.message 
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setValidationResult({ 
      success: true, 
      message: 'Copied to clipboard!' 
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Google Analytics Setup</h1>
        <p className="text-gray-600 mt-2">Configure real Google Analytics data for your dashboard</p>
      </div>

      {/* Setup Instructions */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Settings className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900">Setup Instructions</h3>
            <div className="mt-3 space-y-2 text-sm text-blue-700">
              <p><strong>Step 1:</strong> Create a Google Analytics 4 property</p>
              <p><strong>Step 2:</strong> Enable Google Analytics Data API</p>
              <p><strong>Step 3:</strong> Create a service account and download JSON</p>
              <p><strong>Step 4:</strong> Grant the service account access to your GA property</p>
              <p><strong>Step 5:</strong> Enter your credentials below</p>
            </div>
            <div className="mt-4 flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://analytics.google.com', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Go to Google Analytics
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://console.cloud.google.com', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Go to Cloud Console
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Configuration Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Enter Your Credentials</h2>
        
        <div className="space-y-4">
          {/* Property ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Analytics Property ID
            </label>
            <Input
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in Google Analytics &gt; Admin &gt; Property Settings
            </p>
          </div>

          {/* Service Account JSON */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Account JSON
            </label>
            <textarea
              placeholder="Paste your service account JSON here..."
              value={serviceAccountJson}
              onChange={(e) => setServiceAccountJson(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Download from Google Cloud Console &gt; IAM &amp; Admin &gt; Service Accounts
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              onClick={handleValidate}
              disabled={isValidating || !propertyId || !serviceAccountJson}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isValidating ? 'Validating...' : 'Test Connection'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleSaveToFirestore}
              disabled={!propertyId || !serviceAccountJson}
            >
              <Download className="w-4 h-4 mr-2" />
              Save to Cloud
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleLoadFromFirestore}
            >
              Load Saved Config
            </Button>
          </div>
        </div>
      </Card>

      {/* Validation Result */}
      {validationResult && (
        <Card className={`p-4 ${validationResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center space-x-3">
            {validationResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <div>
              <p className={`font-medium ${validationResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {validationResult.message}
              </p>
              {validationResult.data && (
                <div className="mt-2 text-sm text-green-700">
                  <p>Sample data retrieved:</p>
                  <p>Total Users: {validationResult.data.totalUsers?.toLocaleString()}</p>
                  <p>Page Views: {validationResult.data.pageViews?.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Advanced Options */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Advanced Options</h2>
          <Button 
            variant="ghost" 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </Button>
        </div>
        
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Environment Variables</h3>
              <p className="text-sm text-gray-600 mb-2">
                For production deployment, add these to your environment variables:
              </p>
              <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span>REACT_APP_GA_PROPERTY_ID=G-XXXXXXXXXX</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard('REACT_APP_GA_PROPERTY_ID=G-XXXXXXXXXX')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span>REACT_APP_GA_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard('REACT_APP_GA_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Current Configuration Status</h3>
              <div className="bg-gray-100 p-3 rounded text-sm">
                <p>Property ID: {propertyId || 'Not set'}</p>
                <p>Service Account: {serviceAccountJson ? 'Configured' : 'Not configured'}</p>
                <p>Service Status: {analyticsService.isReady() ? 'Ready' : 'Not ready'}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Help Section */}
      <Card className="p-6 bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help?</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Check the <strong>GOOGLE_ANALYTICS_SETUP.md</strong> file for detailed instructions</p>
          <p>• Ensure your service account has "Viewer" access to your GA4 property</p>
          <p>• Verify the Google Analytics Data API is enabled in your Google Cloud project</p>
          <p>• Make sure your property ID starts with "G-" (GA4 format)</p>
        </div>
      </Card>
    </div>
  );
};

export default GoogleAnalyticsSetup;
