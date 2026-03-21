import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

const PRIORITY_COLORS = {
  urgent: 'text-red-600 bg-red-50',
  high:   'text-orange-600 bg-orange-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low:    'text-gray-500 bg-gray-50',
};

function TaskChip({ task }) {
  const overdue = task.due_date && isPast(parseISO(task.due_date)) && !task.completed_at;
  const dueToday = task.due_date && isToday(parseISO(task.due_date));
  return (
    <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${overdue ? 'border-red-200 bg-red-50/50' : 'border-[#e5e5ea] bg-white'}`}>
      {task.completed_at
        ? <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
        : overdue
        ? <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
        : <Circle size={14} className="text-[#d1d1d6] shrink-0 mt-0.5" />
      }
      <div className="min-w-0">
        <p className={`text-[12px] font-medium leading-snug ${task.completed_at ? 'line-through text-[#aeaeb2]' : 'text-[#1d1d1f]'}`}>
          {task.title}
        </p>
        {task.due_date && (
          <p className={`text-[11px] mt-0.5 ${overdue ? 'text-red-500 font-semibold' : dueToday ? 'text-orange-500 font-medium' : 'text-[#aeaeb2]'}`}>
            {overdue ? 'Overdue · ' : dueToday ? 'Due today · ' : ''}{format(parseISO(task.due_date), 'MMM d')}
          </p>
        )}
      </div>
      <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium}`}>
        {task.priority ?? 'med'}
      </span>
    </div>
  );
}

function MemberCard({ member, tasks }) {
  const open = tasks.filter(t => !t.completed_at);
  const done = tasks.filter(t => !!t.completed_at);
  const overdue = open.filter(t => t.due_date && isPast(parseISO(t.due_date)));
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  const initials = (member.full_name ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="bg-white border border-[#e5e5ea] rounded-2xl p-4 flex flex-col gap-3">
      {/* Member header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[13px] font-semibold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{member.full_name ?? '—'}</p>
          <p className="text-[11px] text-[#86868b] capitalize">{(member.role ?? '').replace(/_/g, ' ')}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[18px] font-bold text-[#1d1d1f]">{open.length}</p>
          <p className="text-[10px] text-[#86868b]">open</p>
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div>
          <div className="flex justify-between text-[11px] text-[#86868b] mb-1">
            <span>{done.length}/{tasks.length} complete</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Overdue badge */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-1.5 text-[12px] text-red-600 font-medium bg-red-50 rounded-lg px-2.5 py-1.5">
          <AlertCircle size={13} />
          {overdue.length} overdue task{overdue.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Open tasks */}
      {open.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {open.slice(0, 5).map(t => <TaskChip key={t.id} task={t} />)}
          {open.length > 5 && (
            <p className="text-[11px] text-[#86868b] text-center">+{open.length - 5} more</p>
          )}
        </div>
      )}

      {tasks.length === 0 && (
        <p className="text-[12px] text-[#aeaeb2] text-center py-2">No tasks assigned</p>
      )}
    </div>
  );
}

export default function Workload() {
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: m }, { data: t }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role').order('full_name'),
        supabase
          .from('tasks')
          .select('id, title, priority, due_date, completed_at, assigned_to')
          .is('archived', false)
          .order('due_date', { ascending: true, nullsFirst: false }),
      ]);
      setMembers(m ?? []);
      setTasks(t ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const totalOpen = tasks.filter(t => !t.completed_at).length;
  const totalOverdue = tasks.filter(t => !t.completed_at && t.due_date && isPast(parseISO(t.due_date))).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1d1d1f]">Workload</h1>
        <div className="flex gap-4 text-[13px]">
          <span className="text-[#86868b]"><strong className="text-[#1d1d1f]">{totalOpen}</strong> open tasks</span>
          {totalOverdue > 0 && (
            <span className="text-red-500 font-semibold">{totalOverdue} overdue</span>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-[14px] text-[#86868b]">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {members.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              tasks={tasks.filter(t => t.assigned_to === m.id)}
            />
          ))}
          {members.length === 0 && (
            <p className="text-[14px] text-[#86868b] col-span-full">No team members found.</p>
          )}
        </div>
      )}
    </div>
  );
}
