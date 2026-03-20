import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function StatCard({ label, value, sub, trend, color = '#0071e3' }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-2">
      <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide">{label}</p>
      <p className="text-[28px] font-bold text-[#1d1d1f] leading-none">{value}</p>
      <div className="flex items-center gap-1.5">
        {trend !== undefined && (
          <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
        )}
        <p className="text-[12px] text-[#86868b]">{sub}</p>
      </div>
    </div>
  );
}

export default function QuickStats({ stats = [] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => (
        <StatCard key={i} {...s} />
      ))}
    </div>
  );
}
