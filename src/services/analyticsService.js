// Google Analytics Service
// This service handles integration with Google Analytics 4 API

import { firestoreService } from './firestoreService';

class AnalyticsService {
  constructor() {
    this.isConfigured = false;
    this.propertyId = null;
    this.accessToken = null;
    this.serviceAccountJson = null;
    this.initializationPromise = null;
    
    // Start auto-initialization but don't wait for it
    this.autoInitialize();
  }

  // Auto-initialize from saved Firestore credentials
  async autoInitialize() {
    try {
      console.log('🔄 Auto-initializing analytics service from saved credentials...');
      const config = await firestoreService.getAnalyticsConfig();
      
      if (config && config.propertyId && config.serviceAccountJson) {
        console.log('✅ Found saved analytics config, initializing...');
        console.log('Property ID:', config.propertyId);
        
        this.propertyId = config.propertyId;
        this.serviceAccountJson = config.serviceAccountJson;
        
        // Parse service account JSON to get credentials
        const credentials = JSON.parse(config.serviceAccountJson);
        console.log('Service Account Email:', credentials.client_email);
        
        // Try to generate JWT token for Google Analytics API
        try {
          await this.generateAccessToken(credentials);
          this.isConfigured = true;
          console.log('✅ Analytics service initialized with saved credentials and JWT token');
        } catch (jwtError) {
          console.error('❌ JWT token generation failed:', jwtError);
          console.log('⚠️ Falling back to mock data due to JWT generation issues');
          this.isConfigured = false;
          // Don't throw here, just log and continue with mock data
        }
      } else {
        console.log('ℹ️ No saved analytics config found, using mock data');
        this.isConfigured = false;
      }
    } catch (error) {
      console.error('❌ Error auto-initializing analytics service:', error);
      // Ensure we have fallback data even if initialization fails
      this.isConfigured = false;
    }
  }

  // Generate JWT token for Google Analytics API
  async generateAccessToken(credentials) {
    try {
      console.log('🔐 Generating JWT token for Google Analytics API...');
      
      // Create JWT header
      const header = {
        alg: 'RS256',
        typ: 'JWT'
      };

      // Create JWT payload
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: credentials.client_email,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600, // 1 hour
        iat: now
      };

      // Encode header and payload
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));

      // Create signature
      const signatureInput = `${encodedHeader}.${encodedPayload}`;
      const signature = await this.signWithPrivateKey(signatureInput, credentials.private_key);

      // Create JWT
      const jwt = `${signatureInput}.${signature}`;

      // Exchange JWT for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token request failed: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      this.accessToken = tokenData.access_token;
      
      console.log('✅ Access token generated successfully');
    } catch (error) {
      console.error('❌ Error generating access token:', error);
      throw error;
    }
  }

  // Sign JWT with private key
  async signWithPrivateKey(input, privateKey) {
    try {
      // Import the private key
      const keyData = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s/g, '');
      
      const keyBuffer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
      
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyBuffer,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['sign']
      );

      // Sign the input
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
      
      // Convert to base64url
      return btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } catch (error) {
      console.error('❌ Error signing JWT:', error);
      throw error;
    }
  }

  // Initialize the service with Google Analytics credentials
  initialize(propertyId, accessToken) {
    this.propertyId = propertyId;
    this.accessToken = accessToken;
    this.isConfigured = true;
    console.log('✅ Analytics service initialized with property:', propertyId);
  }

  // Check if the service is properly configured
  isReady() {
    return this.isConfigured && this.propertyId && this.accessToken;
  }

  // Make API call to Google Analytics Data API
  async makeAnalyticsApiCall(requestBody) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    console.log('🌐 Making API call to Google Analytics with request:', requestBody);
    console.log('Property ID:', this.propertyId);
    console.log('Access Token (first 20 chars):', this.accessToken.substring(0, 20) + '...');

    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`Analytics API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('✅ API Response Data:', responseData);
    return responseData;
  }

  // Get overview metrics
  async getOverviewMetrics(dateRange = '7d') {
    try {
      if (!this.isReady()) {
        return this.getMockOverviewData();
      }

      console.log('📊 Fetching real analytics data from Google Analytics...');
      
      const dateRangeObj = this.getDateRange(dateRange);
      
      // Get main metrics in a single request
      const usersResponse = await this.makeAnalyticsApiCall({
        dateRanges: [{
          startDate: dateRangeObj.startDate,
          endDate: dateRangeObj.endDate
        }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' }
        ]
      });

      // Calculate returning users as the difference between total and new users
      const data = usersResponse.rows?.[0]?.metricValues || [];
      const totalUsers = parseInt(data[0]?.value || '0');
      const newUsers = parseInt(data[1]?.value || '0');
      const returningUsers = Math.max(0, totalUsers - newUsers);

      const result = {
        totalUsers: totalUsers,
        newUsers: newUsers,
        sessions: parseInt(data[2]?.value || '0'),
        pageViews: parseInt(data[3]?.value || '0'),
        bounceRate: parseFloat(data[4]?.value || '0'),
        avgSessionDuration: this.formatDuration(parseFloat(data[5]?.value || '0')),
        returningUsers: returningUsers,
        fromSavedConfig: true,
        propertyId: this.propertyId
      };

      console.log('✅ Real analytics data fetched successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
      return this.getMockOverviewData();
    }
  }

  // Get traffic sources data
  async getTrafficSources(dateRange = '7d') {
    try {
      if (!this.isReady()) {
        return this.getMockTrafficSources();
      }

      console.log('📊 Fetching real traffic sources from Google Analytics...');
      
      const dateRangeObj = this.getDateRange(dateRange);
      
      const response = await this.makeAnalyticsApiCall({
        dateRanges: [{
          startDate: dateRangeObj.startDate,
          endDate: dateRangeObj.endDate
        }],
        dimensions: [
          { name: 'sessionDefaultChannelGroup' }
        ],
        metrics: [
          { name: 'sessions' }
        ]
      });

      const rows = response.rows || [];
      const totalSessions = rows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value), 0);

      const trafficSources = rows.map(row => {
        const channel = row.dimensionValues[0].value;
        const sessions = parseInt(row.metricValues[0].value);
        const percentage = totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0;
        
        return {
          name: channel,
          value: percentage,
          color: this.getChannelColor(channel)
        };
      });

      console.log('✅ Real traffic sources fetched successfully');
      return trafficSources;
    } catch (error) {
      console.error('❌ Error fetching traffic sources:', error);
      return this.getMockTrafficSources();
    }
  }

  // Get device breakdown data
  async getDeviceBreakdown(dateRange = '7d') {
    try {
      if (!this.isReady()) {
        return this.getMockDeviceBreakdown();
      }

      console.log('📊 Fetching real device data from Google Analytics...');
      
      const dateRangeObj = this.getDateRange(dateRange);
      
      const response = await this.makeAnalyticsApiCall({
        dateRanges: [{
          startDate: dateRangeObj.startDate,
          endDate: dateRangeObj.endDate
        }],
        dimensions: [
          { name: 'deviceCategory' }
        ],
        metrics: [
          { name: 'sessions' }
        ]
      });

      const rows = response.rows || [];
      const totalSessions = rows.reduce((sum, row) => sum + parseInt(row.metricValues[0].value), 0);

      const devices = rows.map(row => {
        const device = row.dimensionValues[0].value;
        const sessions = parseInt(row.metricValues[0].value);
        const percentage = totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0;
        
        return {
          name: device.charAt(0).toUpperCase() + device.slice(1),
          value: percentage,
          icon: this.getDeviceIcon(device)
        };
      });

      console.log('✅ Real device data fetched successfully');
      return devices;
    } catch (error) {
      console.error('❌ Error fetching device data:', error);
      return this.getMockDeviceBreakdown();
    }
  }

  // Get top pages data
  async getTopPages(dateRange = '7d', limit = 10) {
    try {
      if (!this.isReady()) {
        return this.getMockTopPages();
      }

      console.log('📊 Fetching real top pages from Google Analytics...');
      
      const dateRangeObj = this.getDateRange(dateRange);
      
      const response = await this.makeAnalyticsApiCall({
        dateRanges: [{
          startDate: dateRangeObj.startDate,
          endDate: dateRangeObj.endDate
        }],
        dimensions: [
          { name: 'pageTitle' }
        ],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'totalUsers' },
          { name: 'userEngagementDuration' }
        ],
        limit: limit
      });

      const pages = (response.rows || []).map(row => {
        const title = row.dimensionValues[0].value;
        const views = parseInt(row.metricValues[0].value);
        const uniqueUsers = parseInt(row.metricValues[1].value);
        const engagementDuration = parseFloat(row.metricValues[2].value);
        const avgTimeSeconds = views > 0 ? engagementDuration / views : 0;
        const avgTime = this.formatDuration(avgTimeSeconds);
        
        return {
          name: title || 'Untitled Page',
          views,
          uniqueViews: uniqueUsers,
          avgTime
        };
      });

      console.log('✅ Real top pages fetched successfully');
      return pages;
    } catch (error) {
      console.error('❌ Error fetching top pages:', error);
      return this.getMockTopPages();
    }
  }

  // Get trends data for charts
  async getTrendsData(dateRange = '7d') {
    try {
      if (!this.isReady()) {
        return this.getMockTrendsData();
      }

      console.log('📊 Fetching real trends data from Google Analytics...');
      
      const dateRangeObj = this.getDateRange(dateRange);
      
      const response = await this.makeAnalyticsApiCall({
        dateRanges: [{
          startDate: dateRangeObj.startDate,
          endDate: dateRangeObj.endDate
        }],
        dimensions: [
          { name: 'date' }
        ],
        metrics: [
          { name: 'totalUsers' },
          { name: 'screenPageViews' }
        ]
      });

      const trends = (response.rows || []).map(row => {
        const date = row.dimensionValues[0].value;
        const users = parseInt(row.metricValues[0].value);
        const pageViews = parseInt(row.metricValues[1].value);
        
        return {
          date: this.formatDate(date),
          users,
          pageViews
        };
      });

      console.log('✅ Real trends data fetched successfully');
      return trends;
    } catch (error) {
      console.error('❌ Error fetching trends data:', error);
      return this.getMockTrendsData();
    }
  }

  // Helper methods
  getDateRange(range) {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0s';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes === 0) return `${remainingSeconds}s`;
    return `${minutes}m ${remainingSeconds}s`;
  }

  formatDate(dateString) {
    // Convert YYYYMMDD to YYYY-MM-DD
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  getChannelColor(channel) {
    const colors = {
      'Direct': 'bg-blue-500',
      'Organic Search': 'bg-green-500',
      'Social': 'bg-purple-500',
      'Referral': 'bg-orange-500',
      'Email': 'bg-red-500',
      'Paid Search': 'bg-yellow-500',
      'Display': 'bg-indigo-500'
    };
    return colors[channel] || 'bg-gray-500';
  }

  getDeviceIcon(device) {
    const icons = {
      'desktop': 'Monitor',
      'mobile': 'Smartphone',
      'tablet': 'Globe'
    };
    return icons[device.toLowerCase()] || 'Monitor';
  }

  // Mock data methods for when API is not configured
  getMockOverviewData() {
    return {
      totalUsers: 1247,
      pageViews: 8923,
      sessions: 3456,
      bounceRate: 42.3,
      avgSessionDuration: '2m 34s',
      newUsers: 892,
      returningUsers: 355
    };
  }

  getMockTrafficSources() {
    return [
      { name: 'Direct', value: 45, color: 'bg-blue-500' },
      { name: 'Organic Search', value: 32, color: 'bg-green-500' },
      { name: 'Social Media', value: 15, color: 'bg-purple-500' },
      { name: 'Referral', value: 8, color: 'bg-orange-500' }
    ];
  }

  getMockDeviceBreakdown() {
    return [
      { name: 'Desktop', value: 58, icon: 'Monitor' },
      { name: 'Mobile', value: 35, icon: 'Smartphone' },
      { name: 'Tablet', value: 7, icon: 'Globe' }
    ];
  }

  getMockTopPages() {
    return [
      { name: 'Dashboard', views: 2341, uniqueViews: 1892, avgTime: '3m 12s' },
      { name: 'User Management', views: 1567, uniqueViews: 1243, avgTime: '4m 45s' },
      { name: 'Login', views: 892, uniqueViews: 892, avgTime: '0m 45s' },
      { name: 'HR Calendar', views: 678, uniqueViews: 534, avgTime: '2m 23s' },
      { name: 'CRM', views: 445, uniqueViews: 389, avgTime: '5m 12s' }
    ];
  }

  getMockTrendsData() {
    return [
      { date: '2024-01-01', users: 120, pageViews: 890 },
      { date: '2024-01-02', users: 145, pageViews: 1023 },
      { date: '2024-01-03', users: 167, pageViews: 1156 },
      { date: '2024-01-04', users: 189, pageViews: 1289 },
      { date: '2024-01-05', users: 234, pageViews: 1456 },
      { date: '2024-01-06', users: 267, pageViews: 1678 },
      { date: '2024-01-07', users: 298, pageViews: 1890 }
    ];
  }

  // Get configuration status
  getConfigurationStatus() {
    return {
      isConfigured: this.isConfigured,
      propertyId: this.propertyId,
      hasAccessToken: !!this.accessToken,
      fromSavedConfig: !!this.serviceAccountJson
    };
  }

  // Debug method to test configuration
  async debugConfiguration() {
    console.log('🔍 Debugging analytics configuration...');
    
    try {
      const config = await firestoreService.getAnalyticsConfig();
      console.log('📋 Saved config:', config ? 'Found' : 'Not found');
      
      if (config) {
        console.log('Property ID:', config.propertyId);
        const credentials = JSON.parse(config.serviceAccountJson);
        console.log('Service Account Email:', credentials.client_email);
        console.log('Has Private Key:', !!credentials.private_key);
      }
      
      console.log('Service State:', {
        isConfigured: this.isConfigured,
        propertyId: this.propertyId,
        hasAccessToken: !!this.accessToken,
        accessTokenLength: this.accessToken ? this.accessToken.length : 0
      });
      
      // Test API call if configured
      if (this.isReady()) {
        console.log('🧪 Testing API call...');
        try {
          const testResponse = await this.makeAnalyticsApiCall({
            dateRanges: [{
              startDate: '2024-01-01',
              endDate: '2024-01-02'
            }],
            metrics: [{ name: 'totalUsers' }]
          });
          console.log('✅ API test successful:', testResponse);
        } catch (apiError) {
          console.error('❌ API test failed:', apiError);
        }
      } else {
        console.log('⚠️ Service not ready for API testing');
      }
    } catch (error) {
      console.error('❌ Debug error:', error);
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
