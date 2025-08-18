import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import GoogleAnalyticsSetup from '../components/GoogleAnalyticsSetup';
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
  Target
} from 'lucide-react';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalUsers: 1247,
      pageViews: 8923,
      sessions: 3456,
      bounceRate: 42.3,
      avgSessionDuration: '2m 34s',
      newUsers: 892,
      returningUsers: 355
    },
    traffic: {
      sources: [
        { name: 'Direct', value: 45, color: 'bg-blue-500' },
        { name: 'Organic Search', value: 32, color: 'bg-green-500' },
        { name: 'Social Media', value: 15, color: 'bg-purple-500' },
        { name: 'Referral', value: 8, color: 'bg-orange-500' }
      ],
      devices: [
        { name: 'Desktop', value: 58, icon: Monitor },
        { name: 'Mobile', value: 35, icon: Smartphone },
        { name: 'Tablet', value: 7, icon: Globe }
      ]
    },
    pages: [
      { name: 'Dashboard', views: 2341, uniqueViews: 1892, avgTime: '3m 12s' },
      { name: 'User Management', views: 1567, uniqueViews: 1243, avgTime: '4m 45s' },
      { name: 'Login', views: 892, uniqueViews: 892, avgTime: '0m 45s' },
      { name: 'HR Calendar', views: 678, uniqueViews: 534, avgTime: '2m 23s' },
      { name: 'CRM', views: 445, uniqueViews: 389, avgTime: '5m 12s' }
    ],
    trends: [
      { date: '2024-01-01', users: 120, pageViews: 890 },
      { date: '2024-01-02', users: 145, pageViews: 1023 },
      { date: '2024-01-03', users: 167, pageViews: 1156 },
      { date: '2024-01-04', users: 189, pageViews: 1289 },
      { date: '2024-01-05', users: 234, pageViews: 1456 },
      { date: '2024-01-06', users: 267, pageViews: 1678 },
      { date: '2024-01-07', users: 298, pageViews: 1890 }
    ]
  });

  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  // Mock function to refresh analytics data
  const refreshAnalytics = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // In a real implementation, this would fetch from Google Analytics API
    }, 1000);
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

  const DeviceCard = ({ device }) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
      <div className="flex items-center space-x-3">
        <device.icon className="w-5 h-5 text-gray-600" />
        <span className="font-medium">{device.name}</span>
      </div>
      <span className="text-lg font-bold">{device.value}%</span>
    </div>
  );

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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button onClick={refreshAnalytics} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            <Activity className="w-4 h-4 mr-2" />
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Button 
            onClick={() => setShowSetup(!showSetup)} 
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <Settings className="w-4 h-4 mr-2" />
            {showSetup ? 'Hide Setup' : 'Setup GA'}
          </Button>
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
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Google Analytics Integration</h3>
            <p className="text-blue-700 mt-1">
              This dashboard shows mock analytics data. To integrate real Google Analytics data, 
              you'll need to set up Google Analytics 4 and use the Google Analytics Data API.
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-sm text-blue-600">
                <strong>Next Steps:</strong>
              </p>
              <ul className="text-sm text-blue-600 list-disc list-inside space-y-1">
                <li>Set up Google Analytics 4 property</li>
                <li>Configure Google Analytics Data API</li>
                <li>Add authentication credentials</li>
                <li>Replace mock data with real API calls</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
