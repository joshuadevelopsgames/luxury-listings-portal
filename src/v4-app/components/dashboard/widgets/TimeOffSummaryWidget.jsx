import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
export default function TimeOffSummaryWidget() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [nextApproved, setNextApproved] = useState(null);

  const canApprove = ['admin', 'director', 'hr_manager'].includes((profile?.role || '').toLowerCase());

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const { data: mine } = await supabase
          .from('time_off_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: true });

        const list = mine || [];
        setPendingCount(list.filter((r) => r.status === 'pending').length);
        const upcoming = list
          .filter((r) => r.status === 'approved' && new Date(r.start_date) >= new Date())
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
        setNextApproved(upcoming || null);

        if (canApprove) {
          const { data: all } = await supabase.from('time_off_requests').select('id, status');
          setPendingApprovals((all || []).filter((r) => r.status === 'pending').length);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, canApprove]);

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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5856d6] to-[#af52de] flex items-center justify-center shadow-lg shadow-[#5856d6]/20">
            <Calendar className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">Time Off</h3>
        </div>
        <button
          type="button"
          onClick={() => navigate('/v4/my-time-off')}
          className="w-8 h-8 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4 text-white" strokeWidth={2} />
        </button>
      </div>

      {canApprove && pendingApprovals > 0 && (
        <button
          type="button"
          onClick={() => navigate('/v4/time-off')}
          className="w-full mb-3 p-3 rounded-xl bg-[#ff9500]/10 text-left"
        >
          <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{pendingApprovals} pending approvals</p>
          <p className="text-[11px] text-[#86868b]">Open team time off</p>
        </button>
      )}

      <div className="space-y-3 text-[13px]">
        <div className="flex justify-between text-[#86868b]">
          <span>Your pending requests</span>
          <span className="font-semibold text-[#1d1d1f] dark:text-white">{pendingCount}</span>
        </div>
        {nextApproved ? (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.04]">
            <Clock className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#1d1d1f] dark:text-white">Next time off</p>
              <p className="text-[12px] text-[#86868b]">
                {nextApproved.start_date} → {nextApproved.end_date} ({nextApproved.type})
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[#86868b] text-center py-2">No upcoming approved leave</p>
        )}
      </div>
    </div>
  );
}
