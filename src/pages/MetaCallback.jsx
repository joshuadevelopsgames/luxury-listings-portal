import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import metaService from '../services/metaService';
import userMetaConnections from '../services/userMetaConnections';

const MetaCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [message, setMessage] = useState('Processing your connection...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get the authorization code from URL
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorReason = searchParams.get('error_reason');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setStatus('error');
        setMessage(`Connection failed: ${errorDescription || errorReason || error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received from Meta');
        return;
      }

      // Get stored app config and user email
      const appConfigStr = localStorage.getItem('metaAppConfig');
      const userEmail = localStorage.getItem('metaUserEmail');

      if (!appConfigStr || !userEmail) {
        setStatus('error');
        setMessage('Missing app configuration or user email');
        return;
      }

      const appConfig = JSON.parse(appConfigStr);
      const redirectUri = `${window.location.origin}/meta-callback`;

      // Initialize Meta service
      metaService.initialize(appConfig);

      // Exchange code for access token
      const tokenData = await metaService.exchangeCodeForToken(code, redirectUri);

      // Get Instagram Business Account ID
      const accountData = await metaService.getInstagramBusinessAccountId(tokenData.accessToken);

      // Get account details
      const instagramInfo = await metaService.getInstagramAccountInfo(
        accountData.instagramBusinessAccountId, 
        tokenData.accessToken
      );

      const facebookInfo = await metaService.getFacebookPageInfo(
        accountData.pageId, 
        tokenData.accessToken
      );

      // Save connection data
      const connectionData = {
        accessToken: tokenData.accessToken,
        instagramBusinessAccountId: accountData.instagramBusinessAccountId,
        facebookPageId: accountData.pageId,
        instagramUsername: instagramInfo.username,
        facebookPageName: facebookInfo.name
      };

      await userMetaConnections.saveUserConnection(userEmail, connectionData);

      // Clean up localStorage
      localStorage.removeItem('metaAppConfig');
      localStorage.removeItem('metaUserEmail');

      setStatus('success');
      setMessage(`Successfully connected to Instagram (@${instagramInfo.username}) and Facebook (${facebookInfo.name})`);

      // Redirect back to content calendar after 3 seconds
      setTimeout(() => {
        navigate('/content-calendar');
      }, 3000);

    } catch (error) {
      console.error('Meta callback error:', error);
      setStatus('error');
      setMessage(`Connection failed: ${error.message}`);
    }
  };

  const handleRetry = () => {
    setStatus('processing');
    setMessage('Processing your connection...');
    handleCallback();
  };

  const handleGoBack = () => {
    navigate('/content-calendar');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'processing' && 'Connecting to Meta...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            {status === 'processing' && (
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-8 h-8 text-green-500" />
            )}
            {status === 'error' && (
              <AlertCircle className="w-8 h-8 text-red-500" />
            )}
          </div>

          <p className="text-center text-gray-600">{message}</p>

          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700 text-center">
                You'll be redirected to the Content Calendar in a few seconds...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              <Button onClick={handleGoBack} variant="outline" className="w-full">
                Go Back to Content Calendar
              </Button>
            </div>
          )}

          {status === 'success' && (
            <Button onClick={handleGoBack} variant="outline" className="w-full">
              Go to Content Calendar Now
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MetaCallback;


