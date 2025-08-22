import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  Instagram, 
  Facebook, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  X,
  Settings,
  Users,
  Calendar
} from 'lucide-react';
import metaService from '../services/metaService';
import userMetaConnections from '../services/userMetaConnections';

const MetaConnectionModal = ({ isOpen, onClose, userEmail, onConnectionSuccess }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [error, setError] = useState(null);
  const [appConfig, setAppConfig] = useState({
    appId: '',
    appSecret: ''
  });

  useEffect(() => {
    if (isOpen && userEmail) {
      checkConnectionStatus();
    }
  }, [isOpen, userEmail]);

  const checkConnectionStatus = async () => {
    try {
      const status = await userMetaConnections.getConnectionStatus(userEmail);
      setConnectionStatus(status);
      setError(null);
    } catch (err) {
      setError('Failed to check connection status');
      console.error(err);
    }
  };

  const handleConnectInstagram = async () => {
    if (!appConfig.appId) {
      setError('Please configure Meta App ID first');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Initialize Meta service
      metaService.initialize(appConfig);

      // Generate OAuth URL
      const redirectUri = `${window.location.origin}/meta-callback`;
      const oauthUrl = metaService.generateOAuthUrl(redirectUri, userEmail);

      // Store app config temporarily for callback
      localStorage.setItem('metaAppConfig', JSON.stringify(appConfig));
      localStorage.setItem('metaUserEmail', userEmail);

      // Redirect to Meta OAuth
      window.location.href = oauthUrl;
    } catch (err) {
      setError(`Failed to start OAuth: ${err.message}`);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await userMetaConnections.disconnectUser(userEmail);
      await checkConnectionStatus();
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }
    } catch (err) {
      setError('Failed to disconnect account');
      console.error(err);
    }
  };

  const handleAppConfigSave = () => {
    if (!appConfig.appId || !appConfig.appSecret) {
      setError('Please fill in both App ID and App Secret');
      return;
    }
    
    // Save to localStorage for now (in production, this should be in your backend)
    localStorage.setItem('metaAppConfig', JSON.stringify(appConfig));
    setError(null);
    alert('App configuration saved! You can now connect Instagram accounts.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Connect Instagram & Facebook</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* App Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Meta App Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta App ID</label>
                <Input
                  value={appConfig.appId}
                  onChange={(e) => setAppConfig({...appConfig, appId: e.target.value})}
                  placeholder="Enter your Meta App ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta App Secret</label>
                <Input
                  type="password"
                  value={appConfig.appSecret}
                  onChange={(e) => setAppConfig({...appConfig, appSecret: e.target.value})}
                  placeholder="Enter your Meta App Secret"
                />
              </div>
              <Button onClick={handleAppConfigSave} className="w-full">
                Save App Configuration
              </Button>
            </CardContent>
          </Card>

          {/* Connection Status */}
          {connectionStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Connection Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Instagram</span>
                    <div className="flex items-center space-x-2">
                      {connectionStatus.hasInstagram ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">{connectionStatus.instagramUsername}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Not connected</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Facebook</span>
                    <div className="flex items-center space-x-2">
                      {connectionStatus.hasFacebook ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">{connectionStatus.facebookPageName}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Not connected</span>
                        </>
                      )}
                    </div>
                  </div>
                  {connectionStatus.isConnected && (
                    <div className="text-xs text-gray-500">
                      Connected: {new Date(connectionStatus.connectedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connection Actions */}
          <div className="space-y-4">
            {!connectionStatus?.isConnected ? (
              <div className="space-y-3">
                <Button 
                  onClick={handleConnectInstagram} 
                  disabled={isConnecting || !appConfig.appId}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Instagram className="w-4 h-4 mr-2" />
                  )}
                  {isConnecting ? 'Connecting...' : 'Connect Instagram & Facebook'}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  This will connect both Instagram and Facebook accounts linked to your Meta account
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Button 
                  onClick={handleDisconnect} 
                  variant="outline" 
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Disconnect Account
                </Button>
                <Button 
                  onClick={checkConnectionStatus} 
                  variant="outline" 
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">How to get your Meta App credentials:</h4>
            <ol className="text-xs text-blue-700 space-y-1">
              <li>1. Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a></li>
              <li>2. Create a new app or use existing one</li>
              <li>3. Add "Instagram Basic Display" and "Facebook Login" products</li>
              <li>4. Copy your App ID and App Secret from Settings</li>
              <li>5. Add your domain to Valid OAuth Redirect URIs</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetaConnectionModal;


