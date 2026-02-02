/**
 * Slack Service for team chat integration
 * 
 * NOTE: Slack API has CORS restrictions - direct browser calls won't work.
 * For production, you'll need to proxy requests through Firebase Functions
 * or a backend. This service is set up to work with a proxy endpoint.
 */

const SLACK_TOKEN = process.env.REACT_APP_SLACK_TOKEN;
const SLACK_API_BASE = 'https://slack.com/api';

// Firebase Function proxy URL - bypasses CORS
const FIREBASE_PROXY_URL = 'https://us-central1-luxury-listings-portal-e56de.cloudfunctions.net/slackProxy';

// Use custom proxy if set, otherwise use Firebase Function
const PROXY_ENDPOINT = process.env.REACT_APP_SLACK_PROXY_URL || FIREBASE_PROXY_URL;

class SlackService {
  constructor() {
    this.token = SLACK_TOKEN;
    this.currentChannel = null;
    this.channels = [];
  }

  /**
   * Check if Slack is configured
   */
  isConfigured() {
    return !!this.token;
  }

  /**
   * Make authenticated request to Slack API
   * Always uses Firebase Function proxy to bypass CORS
   */
  async makeRequest(method, endpoint, body = null) {
    if (!this.token) {
      throw new Error('Slack token not configured. Add REACT_APP_SLACK_TOKEN to your .env.local file.');
    }

    // Always use proxy to avoid CORS issues
    // Format: proxy URL + endpoint path, e.g., .../slackProxy/conversations.list
    const baseEndpoint = endpoint.split('?')[0]; // Remove query params for URL path
    const queryString = endpoint.includes('?') ? endpoint.split('?')[1] : '';
    
    let url = `${PROXY_ENDPOINT}/${baseEndpoint}`;
    if (method === 'GET' && queryString) {
      url += `?${queryString}`;
    }

    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    };

    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
    }

    try {
      console.log(`🔄 Slack API: ${method} ${baseEndpoint}`);
      const response = await fetch(url, options);
      const data = await response.json();

      if (!data.ok) {
        console.error('Slack API error:', data.error);
        throw new Error(`Slack API error: ${data.error}`);
      }

      console.log(`✅ Slack API: ${baseEndpoint} success`);
      return data;
    } catch (error) {
      // Check for CORS error (shouldn't happen with proxy, but just in case)
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        console.warn('⚠️ Slack API request failed. The Firebase Function may need to be deployed.');
        throw new Error('CORS_BLOCKED');
      }
      throw error;
    }
  }

  /**
   * Get list of channels the bot/user has access to
   */
  async getChannels() {
    try {
      const data = await this.makeRequest('GET', 'conversations.list?types=public_channel,private_channel&limit=100');
      this.channels = data.channels || [];
      return this.channels;
    } catch (error) {
      console.error('Error fetching channels:', error);
      throw error;
    }
  }

  /**
   * Get messages from a specific channel
   */
  async getMessages(channelId, limit = 50) {
    try {
      const data = await this.makeRequest('GET', `conversations.history?channel=${channelId}&limit=${limit}`);
      return (data.messages || []).reverse(); // Reverse to show oldest first
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(channelId, text) {
    try {
      const data = await this.makeRequest('POST', 'chat.postMessage', {
        channel: channelId,
        text: text,
      });
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get user info by ID
   */
  async getUserInfo(userId) {
    try {
      const data = await this.makeRequest('GET', `users.info?user=${userId}`);
      return data.user;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Get list of users
   */
  async getUsers() {
    try {
      const data = await this.makeRequest('GET', 'users.list');
      return data.members || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Join a channel
   */
  async joinChannel(channelId) {
    try {
      const data = await this.makeRequest('POST', 'conversations.join', {
        channel: channelId,
      });
      return data;
    } catch (error) {
      console.error('Error joining channel:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markAsRead(channelId, timestamp) {
    try {
      const data = await this.makeRequest('POST', 'conversations.mark', {
        channel: channelId,
        ts: timestamp,
      });
      return data;
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  }

  /**
   * Format Slack timestamp to readable date
   */
  formatTimestamp(ts) {
    const date = new Date(parseFloat(ts) * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Format Slack timestamp to full date
   */
  formatFullTimestamp(ts) {
    const date = new Date(parseFloat(ts) * 1000);
    return date.toLocaleString();
  }
}

export const slackService = new SlackService();
export default SlackService;
