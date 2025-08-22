// Meta Service for Instagram and Facebook Integration
// This service provides integration with Meta's Graph API for social media management

class MetaService {
  constructor() {
    this.appId = null;
    this.appSecret = null;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.oauthUrl = 'https://www.facebook.com/v18.0/dialog/oauth';
    this.tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
  }

  // Initialize the service with app credentials
  initialize(config) {
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    console.log('✅ Meta service initialized');
    return { success: true };
  }

  // Generate OAuth URL for user to connect their Instagram account
  generateOAuthUrl(redirectUri, state = null) {
    if (!this.appId) {
      throw new Error('Meta app ID not configured');
    }

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish,pages_manage_posts,pages_read_engagement',
      response_type: 'code',
      ...(state && { state })
    });

    return `${this.oauthUrl}?${params}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code, redirectUri) {
    try {
      const params = new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: redirectUri,
        code: code
      });

      const response = await fetch(`${this.tokenUrl}?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(`Token exchange failed: ${data.error.message}`);
      }

      return {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in
      };
    } catch (error) {
      console.error('❌ Token exchange failed:', error);
      throw error;
    }
  }

  // Get user's Instagram Business Account ID
  async getInstagramBusinessAccountId(accessToken) {
    try {
      const response = await this.makeRequest('GET', '/me/accounts', null, accessToken);
      
      if (!response.data || response.data.length === 0) {
        throw new Error('No Facebook pages found. User needs to connect a Facebook page first.');
      }

      // Get the first page (you might want to let user choose)
      const pageId = response.data[0].id;
      
      // Get Instagram Business Account connected to this page
      const pageResponse = await this.makeRequest('GET', `/${pageId}?fields=instagram_business_account`, null, accessToken);
      
      if (!pageResponse.instagram_business_account) {
        throw new Error('No Instagram Business Account found. User needs to connect Instagram to their Facebook page.');
      }

      return {
        pageId: pageId,
        instagramBusinessAccountId: pageResponse.instagram_business_account.id
      };
    } catch (error) {
      console.error('❌ Failed to get Instagram Business Account ID:', error);
      throw error;
    }
  }

  // Test the connection by fetching account info
  async testConnection(accessToken) {
    try {
      const response = await this.makeRequest('GET', '/me/accounts', null, accessToken);
      if (response && response.data) {
        console.log('✅ Meta connection test successful');
        return true;
      }
      throw new Error('Invalid response from Meta API');
    } catch (error) {
      console.error('❌ Meta connection test failed:', error);
      throw error;
    }
  }

  // Make authenticated requests to Meta Graph API
  async makeRequest(method, endpoint, data = null, accessToken = null) {
    if (!accessToken) {
      throw new Error('Meta access token not provided');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const params = new URLSearchParams({
      access_token: accessToken,
      ...(data && { ...data })
    });

    const config = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const fullUrl = method === 'GET' ? `${url}?${params}` : url;
    
    if (method !== 'GET' && data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(fullUrl, config);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Meta API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Meta API request failed:', error);
      throw error;
    }
  }

  // Get Instagram Business Account info
  async getInstagramAccountInfo(instagramBusinessAccountId, accessToken) {
    try {
      const response = await this.makeRequest('GET', `/${instagramBusinessAccountId}`, null, accessToken);
      return {
        id: response.id,
        username: response.username,
        name: response.name,
        profilePictureUrl: response.profile_picture_url,
        followersCount: response.followers_count,
        mediaCount: response.media_count
      };
    } catch (error) {
      console.error('❌ Failed to fetch Instagram account info:', error);
      throw error;
    }
  }

  // Get Facebook Page info
  async getFacebookPageInfo(facebookPageId, accessToken) {
    try {
      const response = await this.makeRequest('GET', `/${facebookPageId}`, null, accessToken);
      return {
        id: response.id,
        name: response.name,
        username: response.username,
        category: response.category,
        followersCount: response.followers_count,
        fanCount: response.fan_count
      };
    } catch (error) {
      console.error('❌ Failed to fetch Facebook page info:', error);
      throw error;
    }
  }

  // Post to Instagram
  async postToInstagram(postData, instagramBusinessAccountId, accessToken) {
    try {
      // Step 1: Create container for the post
      const containerData = {
        image_url: postData.mediaUrl,
        caption: postData.content
      };

      const containerResponse = await this.makeRequest('POST', `/${instagramBusinessAccountId}/media`, containerData, accessToken);
      const creationId = containerResponse.id;

      // Step 2: Publish the post
      const publishData = {
        creation_id: creationId
      };

      const publishResponse = await this.makeRequest('POST', `/${instagramBusinessAccountId}/media_publish`, publishData, accessToken);

      return {
        id: publishResponse.id,
        permalink: publishResponse.permalink,
        status: 'published',
        platform: 'instagram',
        publishedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to post to Instagram:', error);
      throw error;
    }
  }

  // Post to Facebook
  async postToFacebook(postData, facebookPageId, accessToken) {
    try {
      const data = {
        message: postData.content,
        ...(postData.mediaUrl && { link: postData.mediaUrl })
      };

      const response = await this.makeRequest('POST', `/${facebookPageId}/feed`, data, accessToken);

      return {
        id: response.id,
        status: 'published',
        platform: 'facebook',
        publishedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to post to Facebook:', error);
      throw error;
    }
  }

  // Get Instagram posts
  async getInstagramPosts(limit = 25) {
    try {
      const response = await this.makeRequest('GET', `/${this.instagramBusinessAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}`);
      
      return response.data.map(post => ({
        id: post.id,
        caption: post.caption,
        mediaType: post.media_type,
        mediaUrl: post.media_url,
        thumbnailUrl: post.thumbnail_url,
        permalink: post.permalink,
        timestamp: post.timestamp,
        likes: post.like_count,
        comments: post.comments_count,
        platform: 'instagram'
      }));
    } catch (error) {
      console.error('❌ Failed to fetch Instagram posts:', error);
      throw error;
    }
  }

  // Get Facebook posts
  async getFacebookPosts(limit = 25) {
    try {
      const response = await this.makeRequest('GET', `/${this.facebookPageId}/posts?fields=id,message,created_time,permalink_url,shares,comments.summary(true),reactions.summary(true)&limit=${limit}`);
      
      return response.data.map(post => ({
        id: post.id,
        message: post.message,
        createdTime: post.created_time,
        permalink: post.permalink_url,
        shares: post.shares?.count || 0,
        comments: post.comments?.summary?.total_count || 0,
        reactions: post.reactions?.summary?.total_count || 0,
        platform: 'facebook'
      }));
    } catch (error) {
      console.error('❌ Failed to fetch Facebook posts:', error);
      throw error;
    }
  }

  // Get Instagram insights
  async getInstagramInsights(metric = 'impressions,reach,profile_views') {
    try {
      const response = await this.makeRequest('GET', `/${this.instagramBusinessAccountId}/insights?metric=${metric}&period=day`);
      
      return response.data.map(insight => ({
        name: insight.name,
        value: insight.values[0]?.value || 0,
        period: insight.period,
        title: insight.title,
        description: insight.description
      }));
    } catch (error) {
      console.error('❌ Failed to fetch Instagram insights:', error);
      throw error;
    }
  }

  // Get Facebook insights
  async getFacebookInsights(metric = 'page_impressions,page_reach') {
    try {
      const response = await this.makeRequest('GET', `/${this.facebookPageId}/insights?metric=${metric}&period=day`);
      
      return response.data.map(insight => ({
        name: insight.name,
        value: insight.values[0]?.value || 0,
        period: insight.period,
        title: insight.title,
        description: insight.description
      }));
    } catch (error) {
      console.error('❌ Failed to fetch Facebook insights:', error);
      throw error;
    }
  }

  // Schedule post to Instagram
  async scheduleInstagramPost(postData) {
    try {
      const scheduledTime = Math.floor(new Date(postData.scheduledDate + 'T' + postData.scheduledTime).getTime() / 1000);
      
      const containerData = {
        image_url: postData.mediaUrl,
        caption: postData.content,
        published: false,
        scheduled_publish_time: scheduledTime,
        access_token: this.accessToken
      };

      const response = await this.makeRequest('POST', `/${this.instagramBusinessAccountId}/media`, containerData);

      return {
        id: response.id,
        status: 'scheduled',
        platform: 'instagram',
        scheduledFor: new Date(scheduledTime * 1000).toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to schedule Instagram post:', error);
      throw error;
    }
  }

  // Schedule post to Facebook
  async scheduleFacebookPost(postData) {
    try {
      const scheduledTime = Math.floor(new Date(postData.scheduledDate + 'T' + postData.scheduledTime).getTime() / 1000);
      
      const data = {
        message: postData.content,
        ...(postData.mediaUrl && { link: postData.mediaUrl }),
        published: false,
        scheduled_publish_time: scheduledTime,
        access_token: this.accessToken
      };

      const response = await this.makeRequest('POST', `/${this.facebookPageId}/feed`, data);

      return {
        id: response.id,
        status: 'scheduled',
        platform: 'facebook',
        scheduledFor: new Date(scheduledTime * 1000).toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to schedule Facebook post:', error);
      throw error;
    }
  }

  // Delete a post
  async deletePost(postId, platform) {
    try {
      const response = await this.makeRequest('DELETE', `/${postId}`);
      return { success: true, platform, deletedId: postId };
    } catch (error) {
      console.error(`❌ Failed to delete ${platform} post:`, error);
      throw error;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasAppId: !!this.appId,
      hasAccessToken: !!this.accessToken,
      hasInstagramAccount: !!this.instagramBusinessAccountId,
      hasFacebookPage: !!this.facebookPageId
    };
  }

  // Disconnect from Meta
  disconnect() {
    this.appId = null;
    this.appSecret = null;
    this.accessToken = null;
    this.instagramBusinessAccountId = null;
    this.facebookPageId = null;
    this.isConnected = false;
    console.log('✅ Disconnected from Meta');
  }
}

// Create and export singleton instance
const metaService = new MetaService();
export default metaService;
