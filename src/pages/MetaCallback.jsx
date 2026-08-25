import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    <div className="min-h-screen bg-surface-2 dark:bg-ink flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/80 dark:bg-surface backdrop-blur-xl rounded-xl border border-hairline shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-hairline">
          <h2 className="text-[17px] font-semibold text-ink text-center">
            {status === 'processing' && 'Connecting to Meta...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            {status === 'processing' && (
              <RefreshCw className="w-8 h-8 text-brand animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-8 h-8 text-positive" />
            )}
            {status === 'error' && (
              <AlertCircle className="w-8 h-8 text-danger" />
            )}
          </div>

          <p className="text-center text-[15px] text-ink-muted">{message}</p>

          {status === 'success' && (
            <div className="bg-positive/10 border border-positive/20 rounded-xl p-3">
              <p className="text-[13px] text-positive text-center">
                You'll be redirected to the Content Calendar in a few seconds...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <button 
                onClick={handleRetry} 
                className="w-full h-10 rounded-xl bg-brand text-white text-[15px] font-medium hover:bg-brand-hover transition-colors"
              >
                Try Again
              </button>
              <button 
                onClick={handleGoBack} 
                className="w-full h-10 rounded-xl bg-surface-3 text-ink text-[15px] font-medium hover:bg-hairline-strong transition-colors"
              >
                Go Back to Content Calendar
              </button>
            </div>
          )}

          {status === 'success' && (
            <button 
              onClick={handleGoBack} 
              className="w-full h-10 rounded-xl bg-surface-3 text-ink text-[15px] font-medium hover:bg-hairline-strong transition-colors"
            >
              Go to Content Calendar Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetaCallback;


