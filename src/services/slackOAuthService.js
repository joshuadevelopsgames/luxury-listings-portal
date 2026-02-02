/**
 * Slack OAuth Service
 * Handles individual user authentication with Slack
 * 
 * Flow:
 * 1. User clicks "Sign in with Slack"
 * 2. Redirected to Slack OAuth page
 * 3. After authorization, redirected back with code
 * 4. Code exchanged for access token via Firebase Function
 * 5. Token stored in Firestore per user
 */

import { firestoreService } from './firestoreService';

// Slack OAuth configuration
const SLACK_CLIENT_ID = process.env.REACT_APP_SLACK_CLIENT_ID;
const SLACK_REDIRECT_URI = process.env.REACT_APP_SLACK_REDIRECT_URI || `${window.location.origin}/slack-callback`;

// Firebase Function URL for token exchange (keeps client secret secure)
const TOKEN_EXCHANGE_URL = 'https://us-central1-luxury-listings-portal-e56de.cloudfunctions.net/slackOAuthExchange';

// Required scopes for user token
const USER_SCOPES = [
  'channels:read',
  'channels:history', 
  'groups:read',
  'groups:history',
  'chat:write',
  'users:read',
  'im:read',
  'im:history',
  'mpim:read',
  'mpim:history'
].join(',');

class SlackOAuthService {
  constructor() {
    this.currentUserEmail = null;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Check if Slack OAuth is configured
   */
  isConfigured() {
    return !!SLACK_CLIENT_ID;
  }

  /**
   * Generate the Slack OAuth URL for user authorization
   */
  getAuthorizationUrl(userEmail) {
    if (!SLACK_CLIENT_ID) {
      throw new Error('Slack Client ID not configured. Add REACT_APP_SLACK_CLIENT_ID to .env.local');
    }

    // Store user email in state for callback
    const state = btoa(JSON.stringify({ 
      userEmail,
      returnUrl: window.location.pathname 
    }));

    const params = new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      scope: USER_SCOPES,
      redirect_uri: SLACK_REDIRECT_URI,
      state: state,
      user_scope: USER_SCOPES // Request user token, not bot token
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * This calls our Firebase Function to keep client_secret secure
   */
  async exchangeCodeForToken(code, state) {
    try {
      // Decode state to get user email
      const stateData = JSON.parse(atob(state));
      const { userEmail, returnUrl } = stateData;

      console.log('🔄 Exchanging Slack auth code for token...');

      const response = await fetch(TOKEN_EXCHANGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirect_uri: SLACK_REDIRECT_URI
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to exchange code for token');
      }

      // Extract user token (authed_user contains the user's token)
      const userToken = data.authed_user?.access_token;
      const slackUserId = data.authed_user?.id;
      const teamId = data.team?.id;
      const teamName = data.team?.name;

      if (!userToken) {
        throw new Error('No user access token received from Slack');
      }

      // Store token in Firestore for this user
      await this.storeUserToken(userEmail, {
        accessToken: userToken,
        slackUserId,
        teamId,
        teamName,
        scope: data.authed_user?.scope || USER_SCOPES,
        connectedAt: new Date().toISOString()
      });

      console.log('✅ Slack token stored for user:', userEmail);

      return {
        success: true,
        userEmail,
        returnUrl,
        teamName
      };

    } catch (error) {
      console.error('❌ Error exchanging Slack code:', error);
      throw error;
    }
  }

  /**
   * Store user's Slack token in Firestore
   */
  async storeUserToken(userEmail, tokenData) {
    try {
      await firestoreService.setSlackConnection(userEmail, tokenData);
    } catch (error) {
      console.error('Error storing Slack token:', error);
      throw error;
    }
  }

  /**
   * Get user's stored Slack token
   */
  async getUserToken(userEmail) {
    try {
      const connection = await firestoreService.getSlackConnection(userEmail);
      return connection?.accessToken || null;
    } catch (error) {
      console.error('Error getting Slack token:', error);
      return null;
    }
  }

  /**
   * Check if user has connected Slack
   */
  async isUserConnected(userEmail) {
    const token = await this.getUserToken(userEmail);
    return !!token;
  }

  /**
   * Get user's Slack connection info
   */
  async getConnectionInfo(userEmail) {
    try {
      return await firestoreService.getSlackConnection(userEmail);
    } catch (error) {
      console.error('Error getting Slack connection:', error);
      return null;
    }
  }

  /**
   * Disconnect user's Slack account
   */
  async disconnectUser(userEmail) {
    try {
      await firestoreService.removeSlackConnection(userEmail);
      this.accessToken = null;
      this.currentUserEmail = null;
      console.log('✅ Slack disconnected for user:', userEmail);
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      throw error;
    }
  }

  /**
   * Initialize service for a specific user
   */
  async initializeForUser(userEmail) {
    this.currentUserEmail = userEmail;
    this.accessToken = await this.getUserToken(userEmail);
    return !!this.accessToken;
  }

  /**
   * Make authenticated request using user's token
   */
  async makeUserRequest(method, endpoint, body = null) {
    if (!this.accessToken) {
      throw new Error('User not connected to Slack');
    }

    const SLACK_API_BASE = 'https://slack.com/api';
    const url = `${SLACK_API_BASE}/${endpoint}`;

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!data.ok) {
      // Handle token revocation
      if (data.error === 'token_revoked' || data.error === 'invalid_auth') {
        await this.disconnectUser(this.currentUserEmail);
        throw new Error('Slack connection expired. Please reconnect.');
      }
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  }

  /**
   * Get channels for the connected user
   */
  async getChannels() {
    const data = await this.makeUserRequest('GET', 'conversations.list?types=public_channel,private_channel,im,mpim&limit=100&exclude_archived=true');
    return data.channels || [];
  }

  /**
   * Get messages from a channel
   */
  async getMessages(channelId, limit = 50) {
    const data = await this.makeUserRequest('GET', `conversations.history?channel=${channelId}&limit=${limit}`);
    return (data.messages || []).reverse();
  }

  /**
   * Send a message (as the user)
   */
  async sendMessage(channelId, text) {
    return await this.makeUserRequest('POST', 'chat.postMessage', {
      channel: channelId,
      text,
      as_user: true
    });
  }

  /**
   * Get user info
   */
  async getUserInfo(userId) {
    try {
      const data = await this.makeUserRequest('GET', `users.info?user=${userId}`);
      return data.user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current user's identity
   */
  async getIdentity() {
    try {
      const data = await this.makeUserRequest('GET', 'users.identity');
      return data.user;
    } catch (error) {
      // identity scope might not be available, try auth.test instead
      try {
        const authData = await this.makeUserRequest('GET', 'auth.test');
        return {
          id: authData.user_id,
          name: authData.user,
          team: authData.team
        };
      } catch (e) {
        return null;
      }
    }
  }
}

export const slackOAuthService = new SlackOAuthService();
export default SlackOAuthService;
