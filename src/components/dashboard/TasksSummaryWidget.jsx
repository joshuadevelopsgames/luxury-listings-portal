/**
 * TasksSummaryWidget - Dashboard widget showing task summary
 * (Placeholder for tasks module upgrade)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreService } from '../../services/firestoreService';

const TasksSummaryWidget = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, dueToday: 0 });

  useEffect(() => {
    const loadTasks = async () => {
      if (!currentUser?.email) return;
      
      try {
        const tasks = await firestoreService.getTasksByUser(currentUser.email);
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
      <div className="h-[327px] min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[327px] min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#34c759] to-[#30d158] flex items-center justify-center shadow-lg shadow-[#34c759]/20">
            <CheckSquare className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">Tasks</h3>
        </div>
        <button
          onClick={() => navigate('/tasks')}
          className="text-[13px] text-[#0071e3] hover:text-[#0077ed] font-medium flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white">{stats.total}</p>
          <p className="text-[11px] text-[#86868b]">Total</p>
        </div>
        <div className="text-center">
          <p className="text-[24px] font-semibold text-[#34c759]">{stats.completed}</p>
          <p className="text-[11px] text-[#86868b]">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-[24px] font-semibold text-[#ff9500]">{stats.dueToday}</p>
          <p className="text-[11px] text-[#86868b]">Due Today</p>
        </div>
      </div>
    </div>
  );
};

export default TasksSummaryWidget;
