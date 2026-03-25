import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export default function ClientOverviewWidget() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);

  const fullAccess = ['admin', 'director', 'manager', 'account_manager', 'content_manager'].includes(
    (profile?.role || '').toLowerCase()
  );

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        let q = supabase.from('clients').select('id, name, posts_per_month, health_status, account_manager_id').order('name').limit(8);
        if (!fullAccess) {
          q = q.eq('account_manager_id', user.id);
        }
        const { data, error } = await q;
        if (error) throw error;
        setClients((data || []).slice(0, 4));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, fullAccess]);

  const healthDot = (c) => {
    const h = (c.health_status || 'monitor').toLowerCase();
    if (h === 'at_risk' || h === 'critical') return 'bg-[#ff3b30]';
    if (h === 'watch') return 'bg-[#ff9500]';
    return 'bg-[#34c759]';
  };

  if (loading) {
    return (
      <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
      </div>
    );
  }

  return (
    <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-black/5 dark:border-white/10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center shadow-lg shadow-[#0071e3]/20">
            <Users className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">My Clients</h3>
        </div>
        <button
          type="button"
          onClick={() => navigate(fullAccess ? '/v4/clients' : '/v4/my-clients')}
          className="text-[13px] text-[#0071e3] hover:text-[#0077ed] font-medium flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {clients.length === 0 ? (
        <p className="text-[13px] text-[#86868b] text-center py-4">No clients to show</p>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate(fullAccess ? '/v4/clients' : '/v4/my-clients')}
              className="w-full text-left p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-medium text-[#1d1d1f] dark:text-white truncate">{c.name}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${healthDot(c)}`} title={c.health_status} />
              </div>
              <p className="text-[11px] text-[#86868b] mt-1">{c.posts_per_month || 12} posts / mo</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
