import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck, Megaphone, AlertCircle, Calendar, BarChart2, Users } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { notificationsService } from '../services/notificationsService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const TYPE_ICON = {
  task:      <Calendar size={16} className="text-blue-500" />,
  crm:       <Users size={16} className="text-purple-500" />,
  content:   <BarChart2 size={16} className="text-green-500" />,
  report:    <BarChart2 size={16} className="text-orange-500" />,
  alert:     <AlertCircle size={16} className="text-red-500" />,
  system:    <Megaphone size={16} className="text-gray-400" />,
};

function groupByDate(notifications) {
  const groups = {};
  for (const n of notifications) {
    const d = parseISO(n.created_at);
    const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationsService.getForUser(user.id, {
        limit: 50,
        unreadOnly: filter === 'unread',
      });
      setNotifications(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-page')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  const markRead = async (id) => {
    await notificationsService.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await notificationsService.markAllRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const groups = groupByDate(notifications);

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-bold text-[#1d1d1f]">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-[13px] text-[#0071e3] hover:underline"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[#f5f5f7] rounded-lg p-1 w-fit">
        {['all', 'unread'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-[13px] font-medium capitalize transition-all ${
              filter === f ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-[14px] text-[#86868b]">Loading…</div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Bell size={36} className="text-[#d1d1d6]" />
          <p className="text-[15px] font-medium text-[#1d1d1f]">
            {filter === 'unread' ? 'No unread notifications' : 'All caught up!'}
          </p>
          <p className="text-[13px] text-[#86868b]">New notifications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([label, items]) => (
            <div key={label}>
              <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2">{label}</p>
              <div className="divide-y divide-[#f5f5f7] border border-[#e5e5ea] rounded-xl overflow-hidden bg-white">
                {items.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
                      !n.read ? 'bg-blue-50/40' : 'hover:bg-[#f5f5f7]'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {TYPE_ICON[n.type] ?? TYPE_ICON.system}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] ${!n.read ? 'font-semibold text-[#1d1d1f]' : 'text-[#1d1d1f]'}`}>
                        {n.title}
                      </p>
                      {n.body && <p className="text-[12px] text-[#86868b] mt-0.5 leading-relaxed">{n.body}</p>}
                      <p className="text-[11px] text-[#aeaeb2] mt-1">
                        {format(parseISO(n.created_at), 'h:mm a')}
                      </p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        title="Mark as read"
                        className="shrink-0 text-[#0071e3] hover:text-blue-700 mt-0.5"
                      >
                        <Check size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
