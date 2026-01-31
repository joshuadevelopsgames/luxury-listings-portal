import React from 'react';
import { TrendingUp, Users, Eye, Heart, Share2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * V3 Analytics - Mock Data Demo
 */
const V3Analytics = () => {
  const metrics = [
    { title: 'Total Reach', value: '124.5K', change: '+12.5%', up: true, icon: Eye },
    { title: 'Engagement', value: '8.4K', change: '+8.2%', up: true, icon: Heart },
    { title: 'Followers', value: '15.2K', change: '+5.1%', up: true, icon: Users },
    { title: 'Shares', value: '2.1K', change: '-2.3%', up: false, icon: Share2 },
  ];

  const topPosts = [
    { title: 'Luxury Beachfront Villa Tour', views: '45.2K', engagement: '12.4%', platform: 'Instagram' },
    { title: 'Modern Downtown Penthouse', views: '38.7K', engagement: '10.8%', platform: 'Instagram' },
    { title: 'Mountain Retreat Showcase', views: '32.1K', engagement: '9.2%', platform: 'TikTok' },
    { title: 'Historic Estate Tour', views: '28.9K', engagement: '8.7%', platform: 'Instagram' },
  ];

  const platforms = [
    { name: 'Instagram', followers: '12.4K', growth: '+8.2%', color: 'bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045]' },
    { name: 'TikTok', followers: '8.1K', growth: '+15.4%', color: 'bg-[#1d1d1f]' },
    { name: 'Facebook', followers: '5.2K', growth: '+3.1%', color: 'bg-[#1877f2]' },
    { name: 'LinkedIn', followers: '2.8K', growth: '+6.7%', color: 'bg-[#0077b5]' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">Analytics</h1>
          <p className="text-[17px] text-[#86868b]">Track your performance and growth.</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-lg">
          {['7D', '30D', '90D', '1Y'].map((period, idx) => (
            <button
              key={period}
              className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                idx === 1 ? 'bg-white dark:bg-[#3d3d3d] text-[#1d1d1f] dark:text-white shadow-sm' : 'text-[#86868b]'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, idx) => (
          <div key={idx} className="p-5 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
                <metric.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <div className={`flex items-center gap-1 text-[13px] font-medium ${metric.up ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
                {metric.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {metric.change}
              </div>
            </div>
            <p className="text-[32px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">{metric.value}</p>
            <p className="text-[13px] text-[#86868b]">{metric.title}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Engagement Overview</h2>
            <div className="flex items-center gap-4 text-[12px]">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#0071e3]" />Reach</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ff2d55]" />Engagement</span>
            </div>
          </div>
          <div className="h-64 flex items-end gap-2">
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((height, idx) => (
              <div key={idx} className="flex-1 flex flex-col gap-1">
                <div className="bg-[#0071e3] rounded-t-md transition-all hover:bg-[#0077ed]" style={{ height: `${height}%` }} />
                <div className="bg-[#ff2d55] rounded-t-md transition-all hover:bg-[#ff375f]" style={{ height: `${height * 0.4}%` }} />
              </div>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div className="rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 p-6">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-4">Platforms</h2>
          <div className="space-y-4">
            {platforms.map((platform, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${platform.color} flex items-center justify-center text-white text-[13px] font-bold`}>
                  {platform.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{platform.name}</span>
                    <span className="text-[12px] font-medium text-[#34c759]">{platform.growth}</span>
                  </div>
                  <p className="text-[13px] text-[#86868b]">{platform.followers} followers</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Posts */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#2d2d2d]/80 backdrop-blur-xl border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Top Performing Posts</h2>
          <button className="text-[13px] text-[#0071e3] font-medium hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/5">
                <th className="text-left p-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Post</th>
                <th className="text-left p-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Platform</th>
                <th className="text-right p-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Views</th>
                <th className="text-right p-4 text-[12px] font-semibold text-[#86868b] uppercase tracking-wide">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {topPosts.map((post, idx) => (
                <tr key={idx} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-[14px] font-medium text-[#1d1d1f] dark:text-white">{post.title}</td>
                  <td className="p-4"><span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-black/5 dark:bg-white/5 text-[#1d1d1f] dark:text-white">{post.platform}</span></td>
                  <td className="p-4 text-right text-[14px] font-medium text-[#1d1d1f] dark:text-white">{post.views}</td>
                  <td className="p-4 text-right text-[14px] font-medium text-[#34c759]">{post.engagement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default V3Analytics;
