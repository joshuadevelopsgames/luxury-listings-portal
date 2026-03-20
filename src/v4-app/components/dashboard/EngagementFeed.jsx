import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, UserPlus, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const EVENT_META = {
  like: { icon: Heart, color: 'text-red-400', bg: 'bg-red-50', label: 'liked your post' },
  comment: { icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-50', label: 'commented on your post' },
  follow: { icon: UserPlus, color: 'text-green-400', bg: 'bg-green-50', label: 'followed your account' },
};

export default function EngagementFeed() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      const { data } = await supabase
        .from('engagement_events')
        .select('*, client:clients(id, name)')
        .order('occurred_at', { ascending: false })
        .limit(15);
      setEvents(data || []);
      setLoading(false);
    };

    load();

    // Real-time: new engagement events appear instantly
    const channel = supabase
      .channel('engagement_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'engagement_events' }, (payload) => {
        setEvents((prev) => [payload.new, ...prev].slice(0, 15));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Engagement Feed</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f]">Engagement Feed</h2>
        <span className="text-[12px] text-[#0071e3] font-medium">Live</span>
      </div>

      {events.length === 0 ? (
        <p className="text-[13px] text-[#86868b] text-center py-6">No recent engagement events.</p>
      ) : (
        <div className="space-y-1">
          {events.map((ev) => {
            const meta = EVENT_META[ev.type] || EVENT_META.like;
            const Icon = meta.icon;
            return (
              <div key={ev.id} className="flex items-center gap-3 py-2.5 hover:bg-gray-50 rounded-xl px-2 -mx-2 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#1d1d1f] truncate">
                    <span className="font-medium">{ev.actor_name || 'Someone'}</span>{' '}
                    {meta.label}
                    {ev.client?.name && <span className="text-[#86868b]"> · {ev.client.name}</span>}
                  </p>
                  <p className="text-[11px] text-[#86868b]">
                    {formatDistanceToNow(new Date(ev.occurred_at), { addSuffix: true })}
                  </p>
                </div>
                {ev.post_url && (
                  <a href={ev.post_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5 text-[#86868b]" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
