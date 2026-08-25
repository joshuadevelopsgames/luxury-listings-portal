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
    const taskList = Array.isArray(tasks) ? tasks : [];
    const calculateStats = async () => {
      try {
        const productivityStats = await productivityService.getProductivityStats('', taskList);
        setStats(productivityStats);
        setKarmaLevel(productivityService.getKarmaLevel(productivityStats.karma));
        setWeeklyData(productivityService.getWeeklyChartData(taskList));
      } catch (err) {
        console.error('ProductivityStats error:', err);
        setStats({
          total: taskList.length,
          completed: 0,
          pending: taskList.filter(t => t.status === 'pending').length,
          inProgress: taskList.filter(t => t.status === 'in_progress').length,
          completedToday: 0,
          completedThisWeek: 0,
          completedThisMonth: 0,
          streak: 0,
          completionRate: 0,
          avgTasksPerDay: 0,
          priorityBreakdown: { urgent: 0, high: 0, medium: 0, low: 0 },
          mostProductiveDay: 'Sunday',
          karma: 0
        });
        setKarmaLevel(productivityService.getKarmaLevel(0));
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        setWeeklyData(days.map(day => ({ day, completed: 0, date: '' })));
      }
    };
    calculateStats();
  }, [tasks]);

  if (!stats) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-xl p-8 text-center border border-hairline-strong">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[15px] text-ink-muted">Loading statistics...</p>
        </div>
      </div>,
      document.body
    );
  }

  const maxWeeklyTasks = Math.max(...weeklyData.map(d => d.completed), 1);

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-danger/10 text-danger';
      case 'high': return 'bg-warning/10 text-warning';
      case 'medium': return 'bg-brand/10 text-brand';
      case 'low': return 'bg-ink-muted/10 text-ink-muted';
      default: return 'bg-black/5 text-ink-muted';
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-hairline-strong shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-danger flex items-center justify-center shadow-lg shadow-warning/25">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-[20px] font-semibold text-ink">Your Productivity Stats</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-ink-muted" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Karma Level */}
          <div className="bg-gradient-to-br from-brand/10 to-brand/10 rounded-xl p-5 border border-brand/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[24px] font-bold text-ink">{stats.karma} Karma</h3>
                <p className="text-[15px] font-semibold text-brand">
                  {karmaLevel.level} Level
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-brand/20 flex items-center justify-center">
                <Award className="w-7 h-7 text-brand" />
              </div>
            </div>
            {karmaLevel.next && (
              <div className="space-y-2">
                <div className="flex justify-between text-[13px] text-ink-muted">
                  <span>Progress to next level</span>
                  <span>{stats.karma} / {karmaLevel.next}</span>
                </div>
                <div className="w-full bg-white/50 dark:bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-brand to-brand h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.karma / karmaLevel.next) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Streak */}
            <div className="bg-warning/10 rounded-xl p-4 text-center border border-warning/20">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center mx-auto mb-2">
                <Flame className="w-5 h-5 text-warning" />
              </div>
              <p className="text-[28px] font-bold text-ink">{stats.streak}</p>
              <p className="text-[12px] text-ink-muted">Day Streak</p>
            </div>

            {/* Completion Rate */}
            <div className="bg-positive/10 rounded-xl p-4 text-center border border-positive/20">
              <div className="w-10 h-10 rounded-xl bg-positive/20 flex items-center justify-center mx-auto mb-2">
                <Target className="w-5 h-5 text-positive" />
              </div>
              <p className="text-[28px] font-bold text-ink">{stats.completionRate}%</p>
              <p className="text-[12px] text-ink-muted">Completion</p>
            </div>

            {/* Today's Tasks */}
            <div className="bg-brand/10 rounded-xl p-4 text-center border border-brand/20">
              <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-brand" />
              </div>
              <p className="text-[28px] font-bold text-ink">{stats.completedToday}</p>
              <p className="text-[12px] text-ink-muted">Today</p>
            </div>

            {/* Average Per Day */}
            <div className="bg-brand/10 rounded-xl p-4 text-center border border-brand/20">
              <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-brand" />
              </div>
              <p className="text-[28px] font-bold text-ink">{stats.avgTasksPerDay}</p>
              <p className="text-[12px] text-ink-muted">Daily Avg</p>
            </div>
          </div>

          {/* Period Stats */}
          <div className="bg-surface-2 rounded-xl p-5 border border-hairline">
            <h3 className="text-[15px] font-semibold text-ink mb-4">Completion Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[24px] font-bold text-brand">{stats.completedThisWeek}</p>
                <p className="text-[12px] text-ink-muted">This Week</p>
              </div>
              <div>
                <p className="text-[24px] font-bold text-brand">{stats.completedThisMonth}</p>
                <p className="text-[12px] text-ink-muted">This Month</p>
              </div>
              <div>
                <p className="text-[24px] font-bold text-ink">{stats.completed}</p>
                <p className="text-[12px] text-ink-muted">All Time</p>
              </div>
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="bg-surface-2 rounded-xl p-5 border border-hairline">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-brand" />
              <h3 className="text-[15px] font-semibold text-ink">This Week's Activity</h3>
            </div>
            <div className="flex items-end justify-between gap-2 h-32">
              {weeklyData.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex-1 w-full flex items-end">
                    <div 
                      className={`w-full rounded-t-lg transition-all ${
                        day.completed > 0 
                          ? 'bg-gradient-to-t from-brand to-brand' 
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
                    <p className="text-[12px] font-medium text-ink">{day.day}</p>
                    <p className="text-[11px] text-ink-muted">{day.completed}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="bg-surface-2 rounded-xl p-5 border border-hairline">
            <h3 className="text-[15px] font-semibold text-ink mb-4">Tasks by Priority</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium mb-2 ${getPriorityStyle('urgent')}`}>
                  P1 Urgent
                </span>
                <p className="text-[24px] font-bold text-ink">{stats.priorityBreakdown.urgent}</p>
              </div>
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium mb-2 ${getPriorityStyle('high')}`}>
                  P2 High
                </span>
                <p className="text-[24px] font-bold text-ink">{stats.priorityBreakdown.high}</p>
              </div>
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium mb-2 ${getPriorityStyle('medium')}`}>
                  P3 Medium
                </span>
                <p className="text-[24px] font-bold text-ink">{stats.priorityBreakdown.medium}</p>
              </div>
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium mb-2 ${getPriorityStyle('low')}`}>
                  P4 Low
                </span>
                <p className="text-[24px] font-bold text-ink">{stats.priorityBreakdown.low}</p>
              </div>
            </div>
          </div>

          {/* Most Productive Day */}
          <div className="text-center p-5 bg-gradient-to-r from-brand/10 to-brand/10 rounded-xl border border-brand/20">
            <p className="text-[13px] text-ink-muted mb-1">Most Productive Day</p>
            <p className="text-[20px] font-semibold text-ink">{stats.mostProductiveDay}</p>
          </div>

          {/* Motivational Message */}
          <div className="text-center text-ink-muted text-[14px]">
            {stats.streak > 7 && `${stats.streak}-day streak — your longest run yet.`}
            {stats.streak > 0 && stats.streak <= 7 && `${stats.streak}-day streak in progress.`}
            {stats.streak === 0 && 'No active streak. Complete a task today to start one.'}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductivityStats;
