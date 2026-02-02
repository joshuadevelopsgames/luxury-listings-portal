/**
 * Slack OAuth Callback Page
 * Handles the redirect from Slack after user authorization
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { slackOAuthService } from '../services/slackOAuthService';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const SlackCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Connecting to Slack...');
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Handle user denial
      if (error) {
        setStatus('error');
        setMessage(error === 'access_denied' 
          ? 'You cancelled the Slack authorization.' 
          : `Slack authorization failed: ${error}`);
        setTimeout(() => navigate('/dashboard'), 3000);
        return;
      }

      // Validate required params
      if (!code || !state) {
        setStatus('error');
        setMessage('Invalid callback - missing authorization code.');
        setTimeout(() => navigate('/dashboard'), 3000);
        return;
      }

      try {
        // Exchange code for token
        const result = await slackOAuthService.exchangeCodeForToken(code, state);
        
        setStatus('success');
        setTeamName(result.teamName || 'your workspace');
        setMessage(`Successfully connected to Slack!`);
        
        // Redirect back to where user came from
        setTimeout(() => {
          navigate(result.returnUrl || '/dashboard');
        }, 2000);

      } catch (err) {
        console.error('Slack callback error:', err);
        setStatus('error');
        setMessage(err.message || 'Failed to connect to Slack. Please try again.');
        setTimeout(() => navigate('/dashboard'), 4000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
        {/* Slack Logo */}
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto" viewBox="0 0 24 24" fill="#4A154B">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
        </div>

        {/* Status Icon */}
        <div className="mb-4">
          {status === 'processing' && (
            <Loader2 className="w-12 h-12 mx-auto text-[#4A154B] animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
          )}
          {status === 'error' && (
            <XCircle className="w-12 h-12 mx-auto text-red-500" />
          )}
        </div>

        {/* Message */}
        <h2 className={`text-xl font-semibold mb-2 ${
          status === 'success' ? 'text-green-600' : 
          status === 'error' ? 'text-red-600' : 
          'text-gray-900'
        }`}>
          {status === 'processing' ? 'Connecting...' :
           status === 'success' ? 'Connected!' :
           'Connection Failed'}
        </h2>
        
        <p className="text-gray-600 mb-4">
          {message}
        </p>

        {status === 'success' && teamName && (
          <p className="text-sm text-gray-500">
            Workspace: <span className="font-medium">{teamName}</span>
          </p>
        )}

        {status !== 'processing' && (
          <p className="text-sm text-gray-400 mt-4">
            Redirecting...
          </p>
        )}
      </div>
    </div>
  );
};

export default SlackCallback;
