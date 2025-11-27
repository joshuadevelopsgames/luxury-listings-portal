import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  Users, 
  Eye, 
  MousePointer, 
  Clock,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';

const ClientAnalytics = ({ clientId, clientEmail }) => {
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
    }
  });
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // Load client-specific analytics
      // For now, we'll use the general analytics service
      // TODO: Filter by client-specific tracking when implemented
      const overview = await analyticsService.getOverviewMetrics(timeRange);
      const trafficSources = await analyticsService.getTrafficSources(timeRange);
      const deviceBreakdown = await analyticsService.getDeviceBreakdown(timeRange);

      setAnalyticsData({
        overview,
        traffic: {
          sources: trafficSources || [],
          devices: deviceBreakdown || []
        }
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button
            variant="outline"
            onClick={loadAnalytics}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalUsers.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-xs text-gray-500 mt-1">
            {analyticsData.overview.newUsers} new, {analyticsData.overview.returningUsers} returning
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-5 h-5 text-purple-600" />
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.pageViews.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Page Views</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <MousePointer className="w-5 h-5 text-green-600" />
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.sessions.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Sessions</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.avgSessionDuration}</p>
          <p className="text-sm text-gray-600">Avg. Session Duration</p>
          <p className="text-xs text-gray-500 mt-1">
            Bounce Rate: {analyticsData.overview.bounceRate.toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h3>
          <div className="space-y-3">
            {analyticsData.traffic.sources.length > 0 ? (
              analyticsData.traffic.sources.slice(0, 5).map((source, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{source.source || 'Direct'}</span>
                  </div>
                  <Badge>{source.users || 0} users</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No traffic source data available</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h3>
          <div className="space-y-3">
            {analyticsData.traffic.devices.length > 0 ? (
              analyticsData.traffic.devices.map((device, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {device.device === 'mobile' ? (
                      <Smartphone className="w-4 h-4 text-gray-400" />
                    ) : device.device === 'desktop' ? (
                      <Monitor className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Globe className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-700 capitalize">{device.device || 'Unknown'}</span>
                  </div>
                  <Badge>{device.users || 0} users</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No device data available</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ClientAnalytics;

