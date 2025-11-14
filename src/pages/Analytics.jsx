import React, { useState, useEffect, createPortal } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import GoogleAnalyticsSetup from '../components/GoogleAnalyticsSetup';
import { analyticsService } from '../services/analyticsService';
import { 
  Users, 
  Eye, 
  MousePointer, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Globe,
  Smartphone,
  Monitor,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalUsers: 0,
      pageViews: 0,
      sessions: 0,
      bounceRate: 0,
      avgSessionDuration: '0m 0s',
      newUsers: 0,
      returningUsers: 0
    },
    traffic: {
      sources: [],
      devices: []
    },
    pages: [],
    trends: []
  });
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [configStatus, setConfigStatus] = useState(null);

  // Load analytics data and check configuration status
  useEffect(() => {
    loadAnalyticsData();
    checkConfigurationStatus();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading analytics data...');
      
      // Get overview metrics
      const overview = await analyticsService.getOverviewMetrics(timeRange);
      
      // Get traffic sources
      const trafficSources = await analyticsService.getTrafficSources(timeRange);
      
      // Get device breakdown
      const deviceBreakdown = await analyticsService.getDeviceBreakdown(timeRange);
      
      // Get top pages
      const topPages = await analyticsService.getTopPages(timeRange);
      
      // Get trends data
      const trends = await analyticsService.getTrendsData(timeRange);

      setAnalyticsData({
        overview,
        traffic: {
          sources: trafficSources,
          devices: deviceBreakdown
        },
        pages: topPages,
        trends
      });

      console.log('✅ Analytics data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkConfigurationStatus = async () => {
    try {
      const status = analyticsService.getConfigurationStatus();
      setConfigStatus(status);
      console.log('📊 Analytics configuration status:', status);
    } catch (error) {
      console.error('❌ Error checking configuration status:', error);
    }
  };

  // Mock function to refresh analytics data
  const refreshAnalytics = () => {
    loadAnalyticsData();
  };

  const handleRefreshData = () => {
    setIsLoading(true);
    loadAnalyticsData();
  };

  const handleDebugConfiguration = async () => {
    console.log('🔍 Debug button clicked');
    await analyticsService.debugConfiguration();
  };

  const handleClearConfiguration = async () => {
    if (window.confirm('Are you sure you want to clear the saved Google Analytics configuration? You will need to re-setup GA.')) {
      await analyticsService.clearSavedConfiguration();
      window.location.reload();
    }
  };

  const handleUpdatePropertyId = async () => {
    const newPropertyId = prompt('Enter the correct numeric Property ID (e.g., 123456789):');
    if (newPropertyId && newPropertyId.trim()) {
      const success = await analyticsService.updatePropertyId(newPropertyId.trim());
      if (success) {
        alert('Property ID updated successfully! Refreshing page...');
        window.location.reload();
      } else {
        alert('Failed to update Property ID. Please try again.');
      }
    }
  };

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(change)}% from last period
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </Card>
  );

  const TrafficSourceCard = ({ source }) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
      <div className="flex items-center space-x-3">
        <div className={`w-4 h-4 rounded-full ${source.color}`}></div>
        <span className="font-medium">{source.name}</span>
      </div>
      <span className="text-lg font-bold">{source.value}%</span>
    </div>
  );

  const DeviceCard = ({ device }) => {
    // Handle icon mapping
    const getIconComponent = (iconName) => {
      switch (iconName) {
        case 'Monitor':
          return Monitor;
        case 'Smartphone':
          return Smartphone;
        case 'Globe':
          return Globe;
        default:
          return Monitor;
      }
    };

    const IconComponent = getIconComponent(device.icon);

    return (
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
        <div className="flex items-center space-x-3">
          <IconComponent className="w-5 h-5 text-gray-600" />
          <span className="font-medium">{device.name}</span>
        </div>
        <span className="text-lg font-bold">{device.value}%</span>
      </div>
    );
  };

  const PageCard = ({ page }) => (
    <div className="p-4 bg-white rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">{page.name}</h3>
        <span className="text-sm text-gray-500">{page.avgTime}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Page Views</p>
          <p className="font-semibold">{page.views.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-600">Unique Views</p>
          <p className="font-semibold">{page.uniqueViews.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Google Analytics Setup */}
      {showSetup && <GoogleAnalyticsSetup />}
      
      {/* Configuration Status Banner */}
      {configStatus && (
        <Card className={`p-4 ${configStatus.fromSavedConfig ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center space-x-3">
            {configStatus.fromSavedConfig ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-blue-600" />
            )}
            <div>
              <p className={`font-medium ${configStatus.fromSavedConfig ? 'text-green-800' : 'text-blue-800'}`}>
                {configStatus.fromSavedConfig 
                  ? `✅ Using saved Google Analytics configuration (${configStatus.propertyId})`
                  : 'ℹ️ Using demo analytics data - set up Google Analytics for real data'
                }
              </p>
              {configStatus.fromSavedConfig && (
                <p className="text-sm text-green-700 mt-1">
                  Data is being fetched from your saved GA configuration
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor site performance and user engagement</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={handleRefreshData}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isLoading ? 'Loading...' : 'Refresh Data'}</span>
          </button>
          
          <button
            onClick={handleDebugConfiguration}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Settings className="w-4 h-4" />
            <span>Debug Config</span>
          </button>
          
          <button
            onClick={handleUpdatePropertyId}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            <Settings className="w-4 h-4" />
            <span>Fix Property ID</span>
          </button>
          
          <button
            onClick={handleClearConfiguration}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <Settings className="w-4 h-4" />
            <span>Clear Config</span>
          </button>
          
          <Link
            to="/setup-ga"
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Settings className="w-4 h-4" />
            <span>Setup GA</span>
          </Link>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Users" 
          value={analyticsData.overview.totalUsers.toLocaleString()} 
          change={12.5}
          icon={Users}
          color="blue"
        />
        <StatCard 
          title="Page Views" 
          value={analyticsData.overview.pageViews.toLocaleString()} 
          change={8.3}
          icon={Eye}
          color="green"
        />
        <StatCard 
          title="Sessions" 
          value={analyticsData.overview.sessions.toLocaleString()} 
          change={-2.1}
          icon={MousePointer}
          color="purple"
        />
        <StatCard 
          title="Avg. Session Duration" 
          value={analyticsData.overview.avgSessionDuration} 
          change={5.7}
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Sources */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Traffic Sources</h2>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analyticsData.traffic.sources.map((source, index) => (
              <TrafficSourceCard key={index} source={source} />
            ))}
          </div>
        </Card>

        {/* Device Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Device Usage</h2>
            <Globe className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {analyticsData.traffic.devices.map((device, index) => (
              <DeviceCard key={index} device={device} />
            ))}
          </div>
        </Card>

        {/* User Engagement */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">User Engagement</h2>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{analyticsData.overview.bounceRate}%</p>
              <p className="text-sm text-gray-600">Bounce Rate</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-green-600">{analyticsData.overview.newUsers.toLocaleString()}</p>
                <p className="text-sm text-gray-600">New Users</p>
              </div>
              <div>
                <p className="text-xl font-bold text-blue-600">{analyticsData.overview.returningUsers.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Returning</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Pages */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Top Pages</h2>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticsData.pages.map((page, index) => (
            <PageCard key={index} page={page} />
          ))}
        </div>
      </Card>

      {/* Trends Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">User Growth Trend</h2>
          <Calendar className="w-5 h-5 text-gray-400" />
        </div>
        <div className="h-64 flex items-end justify-between space-x-2">
          {analyticsData.trends.map((trend, index) => {
            const maxUsers = Math.max(...analyticsData.trends.map(t => t.users));
            const height = (trend.users / maxUsers) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${height}%` }}
                ></div>
                <p className="text-xs text-gray-500 mt-2">{new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Google Analytics Integration Note */}
      {!configStatus?.fromSavedConfig && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Google Analytics Integration</h3>
              <p className="text-blue-700 mt-1">
                This dashboard shows demo analytics data. To integrate real Google Analytics data, 
                set up your GA4 property and service account credentials.
              </p>
              <div className="mt-3 space-y-2">
                <p className="text-sm text-blue-600">
                  <strong>Next Steps:</strong>
                </p>
                <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
                  <li>Set up Google Analytics 4 property</li>
                  <li>Configure Google Analytics Data API</li>
                  <li>Add authentication credentials</li>
                  <li>Replace demo data with real API calls</li>
                </ul>
              </div>
              <div className="mt-4">
                <Button 
                  onClick={() => setShowSetup(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Setup Google Analytics
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Google Analytics Setup Modal */}
      {showSetup && createPortal(
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Setup Google Analytics</h2>
              <button onClick={() => setShowSetup(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <GoogleAnalyticsSetup />
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
