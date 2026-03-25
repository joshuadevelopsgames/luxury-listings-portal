import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Instagram, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export default function PostsLoggedWidget() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const fullAccess = ['admin', 'director', 'manager'].includes((profile?.role || '').toLowerCase());
  const yearMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        let q = supabase
          .from('posting_packages')
          .select('id, posts_used, posts_per_month, client:clients(id, name, account_manager_id)')
          .eq('year_month', yearMonth)
          .order('client_id');

        const { data, error } = await q;
        if (error) throw error;
        let list = data || [];
        if (!fullAccess) {
          list = list.filter((p) => p.client?.account_manager_id === user.id);
        }
        setRows(list.slice(0, 6));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, fullAccess, yearMonth]);

  if (loading) {
    return (
      <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-36 bg-black/10 dark:bg-white/10 rounded mb-4" />
      </div>
    );
  }

  return (
    <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E4405F] to-[#F77737] flex items-center justify-center">
            <Instagram className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">Posting packages</h3>
            <p className="text-[11px] text-[#86868b]">{yearMonth}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/v4/posting-packages')}
          className="text-[13px] text-[#0071e3] font-medium flex items-center gap-1"
        >
          Open
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-[13px] text-[#86868b]">No package rows for this month</p>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => {
            const used = p.posts_used ?? 0;
            const cap = p.posts_per_month ?? 12;
            const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
            return (
              <div key={p.id} className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="font-medium text-[#1d1d1f] dark:text-white truncate pr-2">{p.client?.name}</span>
                  <span className="text-[#86868b] shrink-0">
                    {used}/{cap}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-[#0071e3]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
