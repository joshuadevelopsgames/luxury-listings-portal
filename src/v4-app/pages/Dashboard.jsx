import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { clientsService } from '../services/clientsService';
import { crmService } from '../services/crmService';
import TodayWidget from '../components/dashboard/TodayWidget';
import QuickStats from '../components/dashboard/QuickStats';
import EngagementFeed from '../components/dashboard/EngagementFeed';
import WelcomeSplash from '../components/WelcomeSplash';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [clients, pipeline] = await Promise.all([
          clientsService.getAll(),
          crmService.getPipelineSummary(),
        ]);

        const totalPipelineValue = Object.values(pipeline).reduce((s, v) => s + v.value, 0);
        const weightedValue = Object.values(pipeline).reduce((s, v) => s + v.weighted, 0);

        setStats([
          {
            label: 'Active Clients',
            value: clients.filter((c) => c.status === 'active').length,
            sub: `${clients.length} total`,
          },
          {
            label: 'Pipeline Value',
            value: `$${(totalPipelineValue / 1000).toFixed(0)}K`,
            sub: `$${(weightedValue / 1000).toFixed(0)}K weighted`,
            trend: 1,
          },
          {
            label: 'Open Deals',
            value: Object.values(pipeline).reduce((s, v) => s + v.count, 0),
            sub: 'across all stages',
          },
          {
            label: 'At-Risk Clients',
            value: clients.filter((c) => c.health_status === 'at_risk').length,
            sub: 'need attention',
            trend: clients.filter((c) => c.health_status === 'at_risk').length > 0 ? -1 : 0,
          },
        ]);
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <WelcomeSplash />
      {/* Header */}
      <div>
        <p className="text-[13px] text-[#86868b]">{format(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="text-[28px] font-bold text-[#1d1d1f] tracking-tight mt-0.5">
          {greeting}, {firstName}
        </h1>
      </div>

      {/* Quick Stats */}
      {!loadingStats && <QuickStats stats={stats} />}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Priorities - takes 2/3 width */}
        <div className="lg:col-span-2">
          <TodayWidget />
        </div>

        {/* Engagement Feed - takes 1/3 width */}
        <div>
          <EngagementFeed />
        </div>
      </div>
    </div>
  );
}
