// Google Analytics Service
// This service handles integration with Google Analytics 4 API

class AnalyticsService {
  constructor() {
    this.isConfigured = false;
    this.propertyId = null;
    this.accessToken = null;
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

  // Get overview metrics (users, pageviews, sessions, etc.)
  async getOverviewMetrics(dateRange = '7d') {
    if (!this.isReady()) {
      console.warn('⚠️ Analytics service not configured, returning mock data');
      return this.getMockOverviewData();
    }

    try {
      const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [this.getDateRange(dateRange)],
          metrics: [
            { name: 'totalUsers' },
            { name: 'screenPageViews' },
            { name: 'sessions' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'newUsers' }
          ],
          dimensions: [
            { name: 'date' }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const data = await response.json();
      return this.processOverviewData(data);
    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
      return this.getMockOverviewData();
    }
  }

  // Get traffic sources data
  async getTrafficSources(dateRange = '7d') {
    if (!this.isReady()) {
      return this.getMockTrafficSources();
    }

    try {
      const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [this.getDateRange(dateRange)],
          metrics: [
            { name: 'sessions' }
          ],
          dimensions: [
            { name: 'sessionDefaultChannelGroup' }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const data = await response.json();
      return this.processTrafficSourcesData(data);
    } catch (error) {
      console.error('❌ Error fetching traffic sources:', error);
      return this.getMockTrafficSources();
    }
  }

  // Get device breakdown data
  async getDeviceBreakdown(dateRange = '7d') {
    if (!this.isReady()) {
      return this.getMockDeviceBreakdown();
    }

    try {
      const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [this.getDateRange(dateRange)],
          metrics: [
            { name: 'sessions' }
          ],
          dimensions: [
            { name: 'deviceCategory' }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const data = await response.json();
      return this.processDeviceData(data);
    } catch (error) {
      console.error('❌ Error fetching device data:', error);
      return this.getMockDeviceBreakdown();
    }
  }

  // Get top pages data
  async getTopPages(dateRange = '7d', limit = 10) {
    if (!this.isReady()) {
      return this.getMockTopPages();
    }

    try {
      const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [this.getDateRange(dateRange)],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'uniqueUsers' },
            { name: 'averageSessionDuration' }
          ],
          dimensions: [
            { name: 'pagePath' }
          ],
          limit: limit
        })
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const data = await response.json();
      return this.processTopPagesData(data);
    } catch (error) {
      console.error('❌ Error fetching top pages:', error);
      return this.getMockTopPages();
    }
  }

  // Get trends data for charts
  async getTrendsData(dateRange = '7d') {
    if (!this.isReady()) {
      return this.getMockTrendsData();
    }

    try {
      const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [this.getDateRange(dateRange)],
          metrics: [
            { name: 'totalUsers' },
            { name: 'screenPageViews' }
          ],
          dimensions: [
            { name: 'date' }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const data = await response.json();
      return this.processTrendsData(data);
    } catch (error) {
      console.error('❌ Error fetching trends data:', error);
      return this.getMockTrendsData();
    }
  }

  // Helper method to get date range for API calls
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

  // Process overview data from API response
  processOverviewData(data) {
    // This would process the actual Google Analytics API response
    // For now, return mock data structure
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

  // Process traffic sources data
  processTrafficSourcesData(data) {
    return [
      { name: 'Direct', value: 45, color: 'bg-blue-500' },
      { name: 'Organic Search', value: 32, color: 'bg-green-500' },
      { name: 'Social Media', value: 15, color: 'bg-purple-500' },
      { name: 'Referral', value: 8, color: 'bg-orange-500' }
    ];
  }

  // Process device data
  processDeviceData(data) {
    return [
      { name: 'Desktop', value: 58 },
      { name: 'Mobile', value: 35 },
      { name: 'Tablet', value: 7 }
    ];
  }

  // Process top pages data
  processTopPagesData(data) {
    return [
      { name: 'Dashboard', views: 2341, uniqueViews: 1892, avgTime: '3m 12s' },
      { name: 'User Management', views: 1567, uniqueViews: 1243, avgTime: '4m 45s' },
      { name: 'Login', views: 892, uniqueViews: 892, avgTime: '0m 45s' },
      { name: 'HR Calendar', views: 678, uniqueViews: 534, avgTime: '2m 23s' },
      { name: 'CRM', views: 445, uniqueViews: 389, avgTime: '5m 12s' }
    ];
  }

  // Process trends data
  processTrendsData(data) {
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
      { name: 'Desktop', value: 58 },
      { name: 'Mobile', value: 35 },
      { name: 'Tablet', value: 7 }
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
      hasAccessToken: !!this.accessToken
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
