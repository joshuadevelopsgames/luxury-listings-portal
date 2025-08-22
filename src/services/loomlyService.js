// Loomly Service for Content Calendar Integration
// This service provides integration with Loomly's API for social media content management

class LoomlyService {
  constructor() {
    this.apiKey = null;
    this.baseUrl = 'https://api.loomly.com/v1';
    this.isConnected = false;
    this.accountId = null;
  }

  // Initialize the service with API credentials
  async initialize(apiKey) {
    try {
      this.apiKey = apiKey;
      const response = await this.makeRequest('GET', '/accounts');
      
      if (response && response.data && response.data.length > 0) {
        this.accountId = response.data[0].id;
        this.isConnected = true;
        console.log('✅ Loomly connected successfully');
        return { success: true, accountId: this.accountId };
      } else {
        throw new Error('No accounts found');
      }
    } catch (error) {
      console.error('❌ Loomly connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  // Make authenticated requests to Loomly API
  async makeRequest(method, endpoint, data = null) {
    if (!this.apiKey) {
      throw new Error('Loomly API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const config = {
      method,
      headers,
      ...(data && { body: JSON.stringify(data) })
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`Loomly API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Loomly API request failed:', error);
      throw error;
    }
  }

  // Get all posts from Loomly
  async getPosts(options = {}) {
    try {
      const params = new URLSearchParams({
        account_id: this.accountId,
        ...options
      });

      const response = await this.makeRequest('GET', `/posts?${params}`);
      return this.transformPosts(response.data || []);
    } catch (error) {
      console.error('❌ Failed to fetch posts from Loomly:', error);
      throw error;
    }
  }

  // Create a new post in Loomly
  async createPost(postData) {
    try {
      const loomlyPost = this.transformToLoomlyFormat(postData);
      const response = await this.makeRequest('POST', '/posts', loomlyPost);
      return this.transformPost(response);
    } catch (error) {
      console.error('❌ Failed to create post in Loomly:', error);
      throw error;
    }
  }

  // Update an existing post in Loomly
  async updatePost(postId, postData) {
    try {
      const loomlyPost = this.transformToLoomlyFormat(postData);
      const response = await this.makeRequest('PUT', `/posts/${postId}`, loomlyPost);
      return this.transformPost(response);
    } catch (error) {
      console.error('❌ Failed to update post in Loomly:', error);
      throw error;
    }
  }

  // Delete a post from Loomly
  async deletePost(postId) {
    try {
      await this.makeRequest('DELETE', `/posts/${postId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to delete post from Loomly:', error);
      throw error;
    }
  }

  // Get social media accounts connected to Loomly
  async getSocialAccounts() {
    try {
      const response = await this.makeRequest('GET', `/accounts/${this.accountId}/social_accounts`);
      return response.data || [];
    } catch (error) {
      console.error('❌ Failed to fetch social accounts from Loomly:', error);
      throw error;
    }
  }

  // Transform Loomly post format to our internal format
  transformPost(loomlyPost) {
    return {
      id: loomlyPost.id,
      title: loomlyPost.title || 'Untitled Post',
      content: loomlyPost.message || '',
      platforms: this.extractPlatforms(loomlyPost.social_accounts || []),
      scheduledDate: loomlyPost.scheduled_at ? new Date(loomlyPost.scheduled_at).toISOString().split('T')[0] : '',
      scheduledTime: loomlyPost.scheduled_at ? new Date(loomlyPost.scheduled_at).toTimeString().split(' ')[0].substring(0, 5) : '',
      mediaType: this.determineMediaType(loomlyPost.media || []),
      mediaUrl: this.extractMediaUrl(loomlyPost.media || []),
      hashtags: this.extractHashtags(loomlyPost.message || ''),
      status: this.mapStatus(loomlyPost.status),
      priority: 'medium', // Loomly doesn't have priority, default to medium
      notes: loomlyPost.notes || '',
      engagement: {
        likes: loomlyPost.engagement?.likes || 0,
        comments: loomlyPost.engagement?.comments || 0,
        shares: loomlyPost.engagement?.shares || 0
      },
      loomlyId: loomlyPost.id
    };
  }

  // Transform our internal format to Loomly format
  transformToLoomlyFormat(postData) {
    const scheduledAt = postData.scheduledDate && postData.scheduledTime 
      ? new Date(`${postData.scheduledDate}T${postData.scheduledTime}`).toISOString()
      : null;

    return {
      account_id: this.accountId,
      title: postData.title,
      message: postData.content,
      scheduled_at: scheduledAt,
      status: this.mapStatusToLoomly(postData.status),
      notes: postData.notes,
      media: postData.mediaUrl ? [{ url: postData.mediaUrl }] : [],
      social_accounts: this.mapPlatformsToLoomly(postData.platforms)
    };
  }

  // Extract platforms from Loomly social accounts
  extractPlatforms(socialAccounts) {
    const platformMap = {
      'facebook': 'facebook',
      'instagram': 'instagram',
      'twitter': 'twitter',
      'linkedin': 'linkedin',
      'youtube': 'youtube'
    };

    return socialAccounts
      .map(account => platformMap[account.platform])
      .filter(Boolean);
  }

  // Map our platforms to Loomly format
  mapPlatformsToLoomly(platforms) {
    // This would need to be implemented based on actual Loomly API structure
    // For now, return empty array as placeholder
    return [];
  }

  // Determine media type from Loomly media array
  determineMediaType(media) {
    if (!media || media.length === 0) return 'text';
    
    const firstMedia = media[0];
    if (firstMedia.type === 'video') return 'video';
    if (firstMedia.type === 'image') return 'image';
    return 'text';
  }

  // Extract media URL from Loomly media array
  extractMediaUrl(media) {
    if (!media || media.length === 0) return '';
    return media[0].url || '';
  }

  // Extract hashtags from content
  extractHashtags(content) {
    const hashtagRegex = /#[\w]+/g;
    return content.match(hashtagRegex)?.join(' ') || '';
  }

  // Map Loomly status to our status
  mapStatus(loomlyStatus) {
    const statusMap = {
      'draft': 'draft',
      'scheduled': 'scheduled',
      'published': 'published',
      'failed': 'failed'
    };
    return statusMap[loomlyStatus] || 'draft';
  }

  // Map our status to Loomly status
  mapStatusToLoomly(status) {
    const statusMap = {
      'draft': 'draft',
      'scheduled': 'scheduled',
      'published': 'published',
      'paused': 'draft'
    };
    return statusMap[status] || 'draft';
  }

  // Transform multiple posts
  transformPosts(loomlyPosts) {
    return loomlyPosts.map(post => this.transformPost(post));
  }

  // Sync posts between our system and Loomly
  async syncPosts(localPosts) {
    try {
      const loomlyPosts = await this.getPosts();
      
      // Create a map of posts by content hash for comparison
      const localPostMap = new Map();
      const loomlyPostMap = new Map();

      localPosts.forEach(post => {
        const hash = this.createContentHash(post);
        localPostMap.set(hash, post);
      });

      loomlyPosts.forEach(post => {
        const hash = this.createContentHash(post);
        loomlyPostMap.set(hash, post);
      });

      // Find posts that exist locally but not in Loomly
      const postsToCreate = localPosts.filter(post => {
        const hash = this.createContentHash(post);
        return !loomlyPostMap.has(hash);
      });

      // Find posts that exist in Loomly but not locally
      const postsToImport = loomlyPosts.filter(post => {
        const hash = this.createContentHash(post);
        return !localPostMap.has(hash);
      });

      // Create missing posts in Loomly
      for (const post of postsToCreate) {
        await this.createPost(post);
      }

      return {
        created: postsToCreate.length,
        imported: postsToImport.length,
        importedPosts: postsToImport
      };
    } catch (error) {
      console.error('❌ Failed to sync posts with Loomly:', error);
      throw error;
    }
  }

  // Create a hash for content comparison
  createContentHash(post) {
    const content = `${post.title}-${post.content}-${post.scheduledDate}-${post.scheduledTime}`;
    return btoa(content).slice(0, 20); // Simple hash for comparison
  }

  // Disconnect from Loomly
  disconnect() {
    this.apiKey = null;
    this.accountId = null;
    this.isConnected = false;
    console.log('✅ Disconnected from Loomly');
  }

  // Check connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      accountId: this.accountId,
      hasApiKey: !!this.apiKey
    };
  }
}

// Create and export singleton instance
const loomlyService = new LoomlyService();
export default loomlyService;


