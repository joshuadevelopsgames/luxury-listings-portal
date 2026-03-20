import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Instagram, FileText, TrendingUp, Circle } from 'lucide-react';
import { tasksService } from '../../services/tasksService';
import { useAuth } from '../../contexts/AuthContext';
import { format, isToday, isPast, parseISO } from 'date-fns';

const SOURCE_META = {
  content: { label: 'Content', color: 'text-purple-500', bg: 'bg-purple-50', icon: FileText },
  instagram: { label: 'Instagram', color: 'text-pink-500', bg: 'bg-pink-50', icon: Instagram },
  crm: { label: 'CRM', color: 'text-blue-500', bg: 'bg-blue-50', icon: TrendingUp },
  task: { label: 'Task', color: 'text-gray-500', bg: 'bg-gray-50', icon: Circle },
};

function TaskRow({ task, onComplete }) {
  const meta = SOURCE_META[task.source] || SOURCE_META.task;
  const Icon = meta.icon;
  const overdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));

  return (
    <div className="flex items-start gap-3 py-3 group">
      <button
        onClick={() => onComplete(task.id)}
        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-400 hover:bg-green-50 transition-colors flex items-center justify-center"
        title="Mark complete"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.client?.name && (
            <span className="text-[12px] text-[#86868b]">{task.client.name}</span>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${overdue ? 'text-red-500' : 'text-[#86868b]'}`}>
              <Clock className="w-3 h-3" />
              {overdue ? 'Overdue · ' : ''}{format(parseISO(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>

      <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.bg} ${meta.color}`}>
        <Icon className="w-3 h-3" />
        {meta.label}
      </span>
    </div>
  );
}

export default function TodayWidget() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    tasksService.getTodaysPriorities(user.id)
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleComplete = async (taskId) => {
    await tasksService.complete(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const urgent = tasks.filter((t) => t.due_date && isPast(parseISO(t.due_date)));
  const rest = tasks.filter((t) => !t.due_date || !isPast(parseISO(t.due_date)));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Today's Priorities</h2>
          <p className="text-[12px] text-[#86868b] mt-0.5">
            {loading ? '...' : `${tasks.length} action${tasks.length !== 1 ? 's' : ''} need your attention`}
          </p>
        </div>
        {urgent.length > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[12px] font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            {urgent.length} overdue
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mb-2" />
          <p className="text-[14px] font-medium text-[#1d1d1f]">All caught up!</p>
          <p className="text-[12px] text-[#86868b] mt-1">No pending actions for today.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {urgent.map((t) => <TaskRow key={t.id} task={t} onComplete={handleComplete} />)}
          {rest.map((t) => <TaskRow key={t.id} task={t} onComplete={handleComplete} />)}
        </div>
      )}
    </div>
  );
}
