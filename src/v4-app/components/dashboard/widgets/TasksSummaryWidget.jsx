import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { tasksService } from '../../../services/tasksService';

export default function TasksSummaryWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, dueToday: 0 });

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const tasks = await tasksService.getAllMyTasks(user.id);
        const today = new Date().toISOString().split('T')[0];
        setStats({
          total: tasks.length,
          completed: tasks.filter((t) => t.status === 'done').length,
          dueToday: tasks.filter((t) => t.due_date === today && t.status !== 'done').length,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#34c759] to-[#30d158] flex items-center justify-center shadow-lg shadow-[#34c759]/20">
            <CheckSquare className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">Tasks</h3>
        </div>
        <button
          type="button"
          onClick={() => navigate('/v4/tasks')}
          className="text-[13px] text-[#0071e3] hover:text-[#0077ed] font-medium flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white">{stats.total}</p>
          <p className="text-[11px] text-[#86868b]">Total</p>
        </div>
        <div className="text-center">
          <p className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white">{stats.completed}</p>
          <p className="text-[11px] text-[#86868b]">Done</p>
        </div>
        <div className="text-center">
          <p className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white">{stats.dueToday}</p>
          <p className="text-[11px] text-[#86868b]">Due today</p>
        </div>
      </div>
    </div>
  );
}
