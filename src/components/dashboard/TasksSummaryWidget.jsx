/**
 * TasksSummaryWidget - Dashboard widget showing task summary
 * (Placeholder for tasks module upgrade)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseService } from '../../services/supabaseService';

const TasksSummaryWidget = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, dueToday: 0 });

  useEffect(() => {
    const loadTasks = async () => {
      if (!currentUser?.email) return;
      
      try {
        const tasks = await supabaseService.getTasksByUser(currentUser.email);
        const today = new Date().toDateString();
        
        setStats({
          total: tasks.length,
          completed: tasks.filter(t => t.completed).length,
          dueToday: tasks.filter(t => {
            if (!t.dueDate) return false;
            const dueDate = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
            return dueDate.toDateString() === today;
          }).length
        });
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [currentUser?.email]);

  if (loading) {
    return (
      <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-surface backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-hairline animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-surface-3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-surface backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-hairline">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center">
            <CheckSquare className="w-4 h-4 text-ink" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-ink">Tasks</h3>
        </div>
        <button
          onClick={() => navigate('/tasks')}
          className="text-[13px] text-brand hover:text-brand-hover font-medium flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-[24px] font-semibold text-ink">{stats.total}</p>
          <p className="text-[11px] text-ink-muted">Total</p>
        </div>
        <div className="text-center">
          <p className="text-[24px] font-semibold text-positive">{stats.completed}</p>
          <p className="text-[11px] text-ink-muted">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-[24px] font-semibold text-warning">{stats.dueToday}</p>
          <p className="text-[11px] text-ink-muted">Due Today</p>
        </div>
      </div>
    </div>
  );
};

export default TasksSummaryWidget;
