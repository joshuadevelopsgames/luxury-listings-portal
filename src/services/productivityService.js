import { firestoreService } from './firestoreService';

/**
 * Productivity tracking service
 * Tracks task completion stats, streaks, and productivity metrics
 */
class ProductivityService {
  /**
   * Calculate productivity stats for a user
   */
  async getProductivityStats(userEmail, tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

    // Tasks completed today
    const completedToday = completedTasks.filter(t => {
      if (!t.completed_date) return false;
      const completedDate = new Date(t.completed_date);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === today.getTime();
    });

    // Tasks completed this week
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const completedThisWeek = completedTasks.filter(t => {
      if (!t.completed_date) return false;
      const completedDate = new Date(t.completed_date);
      return completedDate >= weekStart;
    });

    // Tasks completed this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const completedThisMonth = completedTasks.filter(t => {
      if (!t.completed_date) return false;
      const completedDate = new Date(t.completed_date);
      return completedDate >= monthStart;
    });

    // Calculate current streak
    const streak = await this.calculateStreak(completedTasks);

    // Completion rate (completed vs total)
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks.length / totalTasks) * 100) 
      : 0;

    // Average tasks per day (last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const completedLast30Days = completedTasks.filter(t => {
      if (!t.completed_date) return false;
      const completedDate = new Date(t.completed_date);
      return completedDate >= thirtyDaysAgo;
    });
    const avgTasksPerDay = Math.round(completedLast30Days.length / 30 * 10) / 10;

    // Priority breakdown
    const priorityBreakdown = {
      urgent: completedTasks.filter(t => t.priority === 'urgent' || t.priority === 'p1').length,
      high: completedTasks.filter(t => t.priority === 'high' || t.priority === 'p2').length,
      medium: completedTasks.filter(t => t.priority === 'medium' || t.priority === 'p3').length,
      low: completedTasks.filter(t => t.priority === 'low' || t.priority === 'p4').length,
    };

    // Most productive day of week
    const dayStats = this.calculateDayStats(completedTasks);
    const mostProductiveDay = dayStats.reduce((max, day) => 
      day.count > max.count ? day : max, dayStats[0]
    );

    return {
      total: totalTasks,
      completed: completedTasks.length,
      pending: pendingTasks.length,
      inProgress: inProgressTasks.length,
      completedToday: completedToday.length,
      completedThisWeek: completedThisWeek.length,
      completedThisMonth: completedThisMonth.length,
      streak: streak,
      completionRate: completionRate,
      avgTasksPerDay: avgTasksPerDay,
      priorityBreakdown: priorityBreakdown,
      mostProductiveDay: mostProductiveDay.day,
      karma: this.calculateKarma(completedTasks, streak)
    };
  }

  /**
   * Calculate current streak (consecutive days with completed tasks)
   */
  calculateStreak(completedTasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const hasTaskOnDate = completedTasks.some(task => {
        if (!task.completed_date) return false;
        const completedDate = new Date(task.completed_date);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === currentDate.getTime();
      });

      if (hasTaskOnDate) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // Allow for today if no tasks completed yet
        if (currentDate.getTime() === today.getTime()) {
          currentDate.setDate(currentDate.getDate() - 1);
          continue;
        }
        break;
      }

      // Safety limit
      if (streak > 365) break;
    }

    return streak;
  }

  /**
   * Calculate day of week statistics
   */
  calculateDayStats(completedTasks) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCount = new Array(7).fill(0);

    completedTasks.forEach(task => {
      if (task.completed_date) {
        const completedDate = new Date(task.completed_date);
        dayCount[completedDate.getDay()]++;
      }
    });

    return days.map((day, index) => ({
      day,
      count: dayCount[index]
    }));
  }

  /**
   * Calculate karma points (Todoist-style gamification)
   */
  calculateKarma(completedTasks, streak) {
    let karma = 0;

    // Points for completed tasks
    karma += completedTasks.length * 5;

    // Bonus points for priority
    completedTasks.forEach(task => {
      switch (task.priority) {
        case 'urgent':
        case 'p1':
          karma += 10;
          break;
        case 'high':
        case 'p2':
          karma += 7;
          break;
        case 'medium':
        case 'p3':
          karma += 5;
          break;
        case 'low':
        case 'p4':
          karma += 3;
          break;
        default:
          karma += 3;
      }
    });

    // Streak bonus (exponential)
    if (streak > 0) {
      karma += Math.min(streak * 10, 500); // Cap streak bonus at 500
    }

    return karma;
  }

  /**
   * Get karma level based on points
   */
  getKarmaLevel(karma) {
    if (karma < 100) return { level: 'Beginner', next: 100, color: 'text-gray-600' };
    if (karma < 500) return { level: 'Novice', next: 500, color: 'text-blue-600' };
    if (karma < 1000) return { level: 'Intermediate', next: 1000, color: 'text-green-600' };
    if (karma < 2500) return { level: 'Advanced', next: 2500, color: 'text-purple-600' };
    if (karma < 5000) return { level: 'Expert', next: 5000, color: 'text-orange-600' };
    return { level: 'Master', next: null, color: 'text-red-600' };
  }

  /**
   * Get weekly completion chart data
   */
  getWeeklyChartData(tasks) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = days.map((day, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      
      const completed = tasks.filter(task => {
        if (!task.completed_date || task.status !== 'completed') return false;
        const completedDate = new Date(task.completed_date);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === date.getTime();
      }).length;

      return { day, completed, date: date.toISOString().split('T')[0] };
    });

    return chartData;
  }
}

export const productivityService = new ProductivityService();

