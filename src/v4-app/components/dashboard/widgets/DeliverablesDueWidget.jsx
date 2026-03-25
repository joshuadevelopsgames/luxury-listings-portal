import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { supabase } from '../../../lib/supabase';

export default function DeliverablesDueWidget() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const start = format(new Date(), 'yyyy-MM-dd');
        const end = format(addDays(new Date(), 14), 'yyyy-MM-dd');
        const { data, error } = await supabase
          .from('content_posts')
          .select('id, scheduled_date, status, caption, client:clients(name)')
          .gte('scheduled_date', start)
          .lte('scheduled_date', end)
          .neq('status', 'published')
          .order('scheduled_date', { ascending: true })
          .limit(6);
        if (error) throw error;
        setRows(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-40 bg-black/10 dark:bg-white/10 rounded mb-4" />
      </div>
    );
  }

  return (
    <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff9500] to-[#ff3b30] flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">Deliverables</h3>
        </div>
        <button
          type="button"
          onClick={() => navigate('/v4/content-calendar')}
          className="text-[13px] text-[#0071e3] font-medium flex items-center gap-1"
        >
          Calendar
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[#86868b]">Nothing due in the next 2 weeks</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="text-[13px] border-b border-black/5 dark:border-white/5 pb-2 last:border-0">
              <p className="font-medium text-[#1d1d1f] dark:text-white truncate">{r.caption || 'Scheduled post'}</p>
              <p className="text-[11px] text-[#86868b]">
                {r.client?.name || 'Client'} · {r.scheduled_date} · {r.status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
