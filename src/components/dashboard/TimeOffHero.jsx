/**
 * TimeOffHero - Primary dashboard card for time off.
 *
 * Balances, pending requests, next booked days off, and (for approvers) the
 * queue of requests waiting on them.
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plane,
  Heart,
  Laptop,
  Clock,
  AlertCircle,
  ArrowRight,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseService } from '../../services/supabaseService';

const BALANCE_TILES = [
  { key: 'vacation', label: 'Vacation', icon: Plane, accent: '#0071e3' },
  { key: 'sick', label: 'Sick', icon: Heart, accent: '#ff3b30' },
  { key: 'remote', label: 'Remote', icon: Laptop, accent: '#5856d6' },
];

const formatDay = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TimeOffHero = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({
    vacation: { used: 0, total: 15 },
    sick: { used: 0, total: 3 },
    remote: { used: 0, total: 10 },
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [isApprover, setIsApprover] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!currentUser?.email) { setLoading(false); return; }
      try {
        const [userBalances, requests, adminStatus] = await Promise.all([
          supabaseService.getUserLeaveBalances(currentUser.email).catch(() => null),
          supabaseService.getLeaveRequests(currentUser.email).catch(() => []),
          supabaseService.isTimeOffAdmin(currentUser.email).catch(() => false),
        ]);
        if (cancelled) return;

        // Stored balances can be partial (or {} on error) — keep sane defaults for missing types
        if (userBalances) {
          setBalances((prev) => ({
            vacation: { ...prev.vacation, ...(userBalances.vacation || {}) },
            sick: { ...prev.sick, ...(userBalances.sick || {}) },
            remote: { ...prev.remote, ...(userBalances.remote || {}) },
          }));
        }
        setIsApprover(!!adminStatus);

        const list = requests || [];
        setPendingRequests(list.filter((r) => r.status === 'pending'));
        setUpcoming(
          list
            .filter((r) => r.status === 'approved' && new Date(r.startDate) > new Date())
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        );

        if (adminStatus) {
          const all = await supabaseService.getAllLeaveRequests().catch(() => []);
          if (!cancelled) setPendingApprovals((all || []).filter((r) => r.status === 'pending').length);
        }
      } catch (error) {
        console.error('Error loading time off data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentUser?.email]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 p-5 sm:p-6 animate-pulse min-h-[360px]">
        <div className="h-6 w-32 bg-black/10 dark:bg-white/10 rounded mb-6" />
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="h-20 bg-black/5 dark:bg-white/5 rounded-xl" />
          <div className="h-20 bg-black/5 dark:bg-white/5 rounded-xl" />
          <div className="h-20 bg-black/5 dark:bg-white/5 rounded-xl" />
        </div>
        <div className="h-12 w-full bg-black/5 dark:bg-white/5 rounded-xl" />
      </div>
    );
  }

  const nextOff = upcoming[0];

  return (
    <div className="rounded-2xl bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/5 overflow-hidden flex flex-col min-h-[360px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5856d6] to-[#af52de] flex items-center justify-center shadow-lg shadow-[#5856d6]/25 shrink-0">
            <Calendar className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white truncate">Time Off</h2>
            <p className="text-[12px] text-[#86868b]">Your balances and requests</p>
          </div>
        </div>
        <Link
          to="/my-time-off"
          className="shrink-0 h-9 px-3 sm:px-4 rounded-xl bg-black/5 dark:bg-white/10 text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors flex items-center gap-1.5"
        >
          Open
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Balance tiles */}
      <div className="px-5 sm:px-6 grid grid-cols-3 gap-2.5 sm:gap-3">
        {BALANCE_TILES.map(({ key, label, icon: Icon, accent }) => {
          const total = balances[key]?.total || 0;
          const used = balances[key]?.used || 0;
          const remaining = Math.max(0, total - used);
          const usedPct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
          return (
            <div key={key} className="rounded-xl bg-black/[0.03] dark:bg-white/[0.05] p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: accent }} strokeWidth={1.75} />
                <span className="text-[11px] font-medium text-[#86868b] truncate">{label}</span>
              </div>
              <p className="text-[24px] leading-none font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">{remaining}</p>
              <p className="text-[11px] text-[#86868b] mt-1">of {total} left</p>
              <div className="h-1.5 mt-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${100 - usedPct}%`, backgroundColor: accent }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div className="flex-1 min-h-0 px-5 sm:px-6 mt-4 space-y-2.5 widget-scroll overflow-auto">
        {isApprover && pendingApprovals > 0 && (
          <button
            type="button"
            onClick={() => navigate('/hr-calendar')}
            className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 hover:bg-[#ff3b30]/15 transition-colors text-left"
          >
            <AlertCircle className="w-4 h-4 text-[#ff3b30] shrink-0" strokeWidth={1.75} />
            <span className="text-[13px] font-medium text-[#ff3b30] flex-1">
              {pendingApprovals} request{pendingApprovals > 1 ? 's' : ''} awaiting your approval
            </span>
            <ArrowRight className="w-4 h-4 text-[#ff3b30] shrink-0" />
          </button>
        )}

        {pendingRequests.length > 0 && (
          <div className="p-3 rounded-xl bg-[#ff9500]/10 border border-[#ff9500]/20">
            <div className="flex items-center gap-2 mb-1.5">
              <Clock className="w-4 h-4 text-[#ff9500]" strokeWidth={1.75} />
              <span className="text-[13px] font-medium text-[#c26a00] dark:text-[#ff9500]">
                {pendingRequests.length} request{pendingRequests.length > 1 ? 's' : ''} pending approval
              </span>
            </div>
            {pendingRequests.slice(0, 2).map((r) => (
              <p key={r.id} className="text-[12px] text-[#86868b] ml-6">
                {formatDay(r.startDate)} – {formatDay(r.endDate)}{r.days ? ` · ${r.days} day${r.days > 1 ? 's' : ''}` : ''}
              </p>
            ))}
          </div>
        )}

        {nextOff && (
          <div className="p-3 rounded-xl bg-[#34c759]/10 border border-[#34c759]/20">
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#34c759]" strokeWidth={1.75} />
              <span className="text-[13px] font-medium text-[#1a7a2e] dark:text-[#34c759]">Next time off approved</span>
            </div>
            <p className="text-[12px] text-[#86868b] ml-6">
              {formatDay(nextOff.startDate)} – {formatDay(nextOff.endDate)}{nextOff.days ? ` · ${nextOff.days} day${nextOff.days > 1 ? 's' : ''}` : ''}
            </p>
          </div>
        )}

        {pendingRequests.length === 0 && !nextOff && !(isApprover && pendingApprovals > 0) && (
          <div className="py-4 text-center">
            <p className="text-[13px] text-[#86868b]">Nothing booked or pending right now.</p>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="p-4 sm:p-5 pt-3">
        <Link
          to="/my-time-off"
          className="w-full h-11 rounded-xl bg-[#5856d6] hover:bg-[#6b6ae0] text-white text-[14px] font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#5856d6]/20"
        >
          <Plus className="w-4 h-4" />
          Request Time Off
        </Link>
      </div>
    </div>
  );
};

export default TimeOffHero;
