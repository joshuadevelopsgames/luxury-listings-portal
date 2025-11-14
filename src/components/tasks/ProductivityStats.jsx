import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
      
      const userEmail = 'current-user@example.com'; // This should come from auth context
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
      <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Loading statistics...</p>
          </CardContent>
        </Card>
      </div>,
      document.body
    );
  }

  const maxWeeklyTasks = Math.max(...weeklyData.map(d => d.completed), 1);

  return createPortal(
    <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl relative max-h-[85vh] flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Your Productivity Stats
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 overflow-y-auto">
          {/* Karma Level */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{stats.karma} Karma Points</h3>
                <p className={`text-base font-semibold ${karmaLevel.color}`}>
                  {karmaLevel.level} Level
                </p>
              </div>
              <Award className="w-10 h-10 text-purple-500" />
            </div>
            {karmaLevel.next && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progress to {karmaLevel.level === 'Beginner' ? 'Novice' : 'next level'}</span>
                  <span>{stats.karma}/{karmaLevel.next}</span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.karma / karmaLevel.next) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-3">
            {/* Streak */}
            <Card className="border-2 border-orange-200 bg-orange-50">
              <CardContent className="pt-4 px-3 pb-3 text-center">
                <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats.streak}</p>
                <p className="text-xs text-gray-600">Day Streak</p>
              </CardContent>
            </Card>

            {/* Completion Rate */}
            <Card className="border-2 border-green-200 bg-green-50">
              <CardContent className="pt-4 px-3 pb-3 text-center">
                <Target className="w-6 h-6 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
                <p className="text-xs text-gray-600">Completion</p>
              </CardContent>
            </Card>

            {/* Today's Tasks */}
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="pt-4 px-3 pb-3 text-center">
                <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
                <p className="text-xs text-gray-600">Today</p>
              </CardContent>
            </Card>

            {/* Average Per Day */}
            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardContent className="pt-4 px-3 pb-3 text-center">
                <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats.avgTasksPerDay}</p>
                <p className="text-xs text-gray-600">Daily Avg</p>
              </CardContent>
            </Card>
          </div>

          {/* Period Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Completion Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-blue-600">{stats.completedThisWeek}</p>
                  <p className="text-xs text-gray-600">This Week</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-purple-600">{stats.completedThisMonth}</p>
                  <p className="text-xs text-gray-600">This Month</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-600">{stats.completed}</p>
                  <p className="text-xs text-gray-600">All Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                This Week's Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-end justify-between gap-2 h-32">
                {weeklyData.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="flex-1 w-full flex items-end">
                      <div 
                        className={`w-full rounded-t transition-all ${
                          day.completed > 0 ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                        style={{ 
                          height: day.completed > 0 
                            ? `${(day.completed / maxWeeklyTasks) * 100}%` 
                            : '10%' 
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-900">{day.day}</p>
                      <p className="text-xs text-gray-500">{day.completed}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priority Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasks by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Badge className="bg-red-100 text-red-800 border-red-300 mb-2">P1 Urgent</Badge>
                  <p className="text-2xl font-bold">{stats.priorityBreakdown.urgent}</p>
                </div>
                <div className="text-center">
                  <Badge className="bg-orange-100 text-orange-800 border-orange-300 mb-2">P2 High</Badge>
                  <p className="text-2xl font-bold">{stats.priorityBreakdown.high}</p>
                </div>
                <div className="text-center">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 mb-2">P3 Medium</Badge>
                  <p className="text-2xl font-bold">{stats.priorityBreakdown.medium}</p>
                </div>
                <div className="text-center">
                  <Badge className="bg-gray-100 text-gray-800 border-gray-300 mb-2">P4 Low</Badge>
                  <p className="text-2xl font-bold">{stats.priorityBreakdown.low}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Most Productive Day */}
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Most Productive Day</p>
            <p className="text-xl font-bold text-blue-600">{stats.mostProductiveDay}</p>
          </div>

          {/* Motivational Message */}
          <div className="text-center text-gray-600 text-sm italic">
            {stats.streak > 7 && "🔥 You're on fire! Keep up the amazing streak!"}
            {stats.streak > 0 && stats.streak <= 7 && "⭐ Great start! Keep the momentum going!"}
            {stats.streak === 0 && "💪 Ready to start a new streak? You've got this!"}
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};

export default ProductivityStats;

