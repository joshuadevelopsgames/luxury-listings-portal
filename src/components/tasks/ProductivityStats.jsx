import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  TrendingUp, 
  Target, 
  Flame, 
  Trophy, 
  Calendar,
  BarChart3,
  Award,
  X
} from 'lucide-react';
import { productivityService } from '../../services/productivityService';

const ProductivityStats = ({ tasks, onClose }) => {
  const [stats, setStats] = useState(null);
  const [karmaLevel, setKarmaLevel] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    const calculateStats = async () => {
      console.log('📊 ProductivityStats - Total tasks received:', tasks.length);
      const completedCount = tasks.filter(t => t.status === 'completed').length;
      console.log('✅ Completed tasks:', completedCount);
      const withDates = tasks.filter(t => t.completed_date).length;
      console.log('📅 Tasks with completed_date:', withDates);
      
      const userEmail = 'current-user@example.com';
      const productivityStats = await productivityService.getProductivityStats(userEmail, tasks);
      console.log('📈 Calculated stats:', productivityStats);
      setStats(productivityStats);
      
      const level = productivityService.getKarmaLevel(productivityStats.karma);
      setKarmaLevel(level);

      const weekData = productivityService.getWeeklyChartData(tasks);
      console.log('📊 Weekly data:', weekData);
      setWeeklyData(weekData);
    };

    if (tasks && tasks.length > 0) {
      calculateStats();
    } else {
      console.log('⚠️ No tasks available for stats');
    }
  }, [tasks]);

  if (!stats) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl p-8 text-center">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[15px] text-[#86868b]">Loading statistics...</p>
        </div>
      </div>,
      document.body
    );
  }

  const maxWeeklyTasks = Math.max(...weeklyData.map(d => d.completed), 1);

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-[#ff3b30]/10 text-[#ff3b30]';
      case 'high': return 'bg-[#ff9500]/10 text-[#ff9500]';
      case 'medium': return 'bg-[#0071e3]/10 text-[#0071e3]';
      case 'low': return 'bg-[#86868b]/10 text-[#86868b]';
      default: return 'bg-black/5 text-[#86868b]';
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff9500] to-[#ff3b30] flex items-center justify-center shadow-lg shadow-[#ff9500]/25">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#1d1d1f] dark:text-white">Your Productivity Stats</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-[#86868b]" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Karma Level */}
          <div className="bg-gradient-to-br from-[#af52de]/10 to-[#0071e3]/10 rounded-2xl p-5 border border-[#af52de]/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[24px] font-bold text-[#1d1d1f] dark:text-white">{stats.karma} Karma</h3>
                <p className="text-[15px] font-semibold text-[#af52de]">
                  {karmaLevel.level} Level
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#af52de]/20 flex items-center justify-center">
                <Award className="w-7 h-7 text-[#af52de]" />
              </div>
            </div>
            {karmaLevel.next && (
              <div className="space-y-2">
                <div className="flex justify-between text-[13px] text-[#86868b]">
                  <span>Progress to next level</span>
                  <span>{stats.karma} / {karmaLevel.next}</span>
                </div>
                <div className="w-full bg-white/50 dark:bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#af52de] to-[#0071e3] h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.karma / karmaLevel.next) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Streak */}
            <div className="bg-[#ff9500]/10 rounded-2xl p-4 text-center border border-[#ff9500]/20">
              <div className="w-10 h-10 rounded-xl bg-[#ff9500]/20 flex items-center justify-center mx-auto mb-2">
                <Flame className="w-5 h-5 text-[#ff9500]" />
              </div>
              <p className="text-[28px] font-bold text-[#1d1d1f] dark:text-white">{stats.streak}</p>
              <p className="text-[12px] text-[#86868b]">Day Streak</p>
            </div>

            {/* Completion Rate */}
            <div className="bg-[#34c759]/10 rounded-2xl p-4 text-center border border-[#34c759]/20">
              <div className="w-10 h-10 rounded-xl bg-[#34c759]/20 flex items-center justify-center mx-auto mb-2">
                <Target className="w-5 h-5 text-[#34c759]" />
              </div>
              <p className="text-[28px] font-bold text-[#1d1d1f] dark:text-white">{stats.completionRate}%</p>
              <p className="text-[12px] text-[#86868b]">Completion</p>
            </div>

            {/* Today's Tasks */}
            <div className="bg-[#0071e3]/10 rounded-2xl p-4 text-center border border-[#0071e3]/20">
              <div className="w-10 h-10 rounded-xl bg-[#0071e3]/20 flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-[#0071e3]" />
              </div>
              <p className="text-[28px] font-bold text-[#1d1d1f] dark:text-white">{stats.completedToday}</p>
              <p className="text-[12px] text-[#86868b]">Today</p>
            </div>

            {/* Average Per Day */}
            <div className="bg-[#af52de]/10 rounded-2xl p-4 text-center border border-[#af52de]/20">
              <div className="w-10 h-10 rounded-xl bg-[#af52de]/20 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-[#af52de]" />
              </div>
              <p className="text-[28px] font-bold text-[#1d1d1f] dark:text-white">{stats.avgTasksPerDay}</p>
              <p className="text-[12px] text-[#86868b]">Daily Avg</p>
            </div>
          </div>

          {/* Period Stats */}
          <div className="bg-black/[0.02] dark:bg-white/5 rounded-2xl p-5 border border-black/5 dark:border-white/10">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white mb-4">Completion Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[24px] font-bold text-[#0071e3]">{stats.completedThisWeek}</p>
                <p className="text-[12px] text-[#86868b]">This Week</p>
              </div>
              <div>
                <p className="text-[24px] font-bold text-[#af52de]">{stats.completedThisMonth}</p>
                <p className="text-[12px] text-[#86868b]">This Month</p>
              </div>
              <div>
                <p className="text-[24px] font-bold text-[#1d1d1f] dark:text-white">{stats.completed}</p>
                <p className="text-[12px] text-[#86868b]">All Time</p>
              </div>
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="bg-black/[0.02] dark:bg-white/5 rounded-2xl p-5 border border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#0071e3]" />
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">This Week's Activity</h3>
            </div>
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyData.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex-1 w-full flex items-end">
                    <div 
                      className={`w-full rounded-t-lg transition-all ${
                        day.completed > 0 
                          ? 'bg-gradient-to-t from-[#0071e3] to-[#5856d6]' 
                          : 'bg-black/10 dark:bg-white/10'
                      }`}
                      style={{ 
                        height: day.completed > 0 
                          ? `${(day.completed / maxWeeklyTasks) * 100}%` 
                          : '10%' 
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-[12px] font-medium text-[#1d1d1f] dark:text-white">{day.day}</p>
                    <p className="text-[11px] text-[#86868b]">{day.completed}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="bg-black/[0.02] dark:bg-white/5 rounded-2xl p-5 border border-black/5 dark:border-white/10">
            <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white mb-4">Tasks by Priority</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium mb-2 ${getPriorityStyle('urgent')}`}>
                  P1 Urgent
                </span>
                <p className="text-[24px] font-bold text-[#1d1d1f] dark:text-white">{stats.priorityBreakdown.urgent}</p>
              </div>
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium mb-2 ${getPriorityStyle('high')}`}>
                  P2 High
                </span>
                <p className="text-[24px] font-bold text-[#1d1d1f] dark:text-white">{stats.priorityBreakdown.high}</p>
              </div>
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium mb-2 ${getPriorityStyle('medium')}`}>
                  P3 Medium
                </span>
                <p className="text-[24px] font-bold text-[#1d1d1f] dark:text-white">{stats.priorityBreakdown.medium}</p>
              </div>
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium mb-2 ${getPriorityStyle('low')}`}>
                  P4 Low
                </span>
                <p className="text-[24px] font-bold text-[#1d1d1f] dark:text-white">{stats.priorityBreakdown.low}</p>
              </div>
            </div>
          </div>

          {/* Most Productive Day */}
          <div className="text-center p-5 bg-gradient-to-r from-[#0071e3]/10 to-[#af52de]/10 rounded-2xl border border-[#0071e3]/20">
            <p className="text-[13px] text-[#86868b] mb-1">Most Productive Day</p>
            <p className="text-[20px] font-bold text-[#0071e3]">{stats.mostProductiveDay}</p>
          </div>

          {/* Motivational Message */}
          <div className="text-center text-[#86868b] text-[14px]">
            {stats.streak > 7 && "🔥 You're on fire! Keep up the amazing streak!"}
            {stats.streak > 0 && stats.streak <= 7 && "⭐ Great start! Keep the momentum going!"}
            {stats.streak === 0 && "💪 Ready to start a new streak? You've got this!"}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductivityStats;
