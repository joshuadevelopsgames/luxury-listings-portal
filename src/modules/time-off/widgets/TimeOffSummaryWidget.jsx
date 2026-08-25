/**
 * TimeOffSummaryWidget - Dashboard widget showing leave balances and pending requests
 * Shows admin-specific pending approvals count if user is time off admin.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Plus, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabaseService } from '../../../services/supabaseService';

const TimeOffSummaryWidget = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canApproveByFeature = true;
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [upcomingTimeOff, setUpcomingTimeOff] = useState(null);
  const [firestoreTimeOffAdmin, setFirestoreTimeOffAdmin] = useState(false);
  const isAdmin = canApproveByFeature || firestoreTimeOffAdmin;
  const [pendingApprovals, setPendingApprovals] = useState(0);
  
  // Leave balances
  const [balances, setBalances] = useState({
    vacation: { used: 0, total: 15 },
    sick: { used: 0, total: 3 },
    remote: { used: 0, total: 10 }
  });

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.email) return;
      
      try {
        const adminStatus = await supabaseService.isTimeOffAdmin(currentUser.email);
        setFirestoreTimeOffAdmin(!!adminStatus);
        
        // Load user's leave balances
        const userBalances = await supabaseService.getUserLeaveBalances(currentUser.email);
        setBalances(userBalances);
        
        // Load user's requests
        const requests = await supabaseService.getLeaveRequests(currentUser.email);
        
        // Count user's pending requests
        const pending = requests.filter(r => r.status === 'pending');
        setPendingCount(pending.length);
        
        // Find next upcoming approved time off
        const approved = requests.filter(r => r.status === 'approved');
        const upcoming = approved.find(r => new Date(r.startDate) > new Date());
        setUpcomingTimeOff(upcoming);
        
        if (canApproveByFeature || adminStatus) {
          const allRequests = await supabaseService.getAllLeaveRequests();
          const allPending = allRequests.filter(r => r.status === 'pending');
          setPendingApprovals(allPending.length);
        }
      } catch (error) {
        console.error('Error loading time off data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser?.email, canApproveByFeature]);

  const vacationRemaining = (balances.vacation?.total || 0) - (balances.vacation?.used || 0);
  const sickRemaining = (balances.sick?.total || 0) - (balances.sick?.used || 0);
  const remoteRemaining = (balances.remote?.total || 0) - (balances.remote?.used || 0);

  if (loading) {
    return (
      <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-surface backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-hairline animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-surface-3 rounded" />
          <div className="h-4 w-3/4 bg-surface-3 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[280px] sm:h-[327px] sm:min-h-[327px] widget-scroll overflow-auto bg-surface backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-hairline">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand flex items-center justify-center shadow-lg shadow-brand/20">
            <Calendar className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-ink">Time Off</h3>
        </div>
        <button
          onClick={() => navigate('/my-time-off')}
          className="w-8 h-8 rounded-lg bg-brand hover:bg-brand-hover flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4 text-white" strokeWidth={2} />
        </button>
      </div>

      {/* Balances */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-ink-muted">Vacation Days</span>
          <span className="text-[13px] font-medium text-ink">
            {vacationRemaining} remaining
          </span>
        </div>
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div 
            className="h-full bg-positive rounded-full transition-all"
            style={{ width: `${(vacationRemaining / balances.vacation.total) * 100}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <span className="text-[13px] text-ink-muted">Sick Days</span>
          <span className="text-[13px] font-medium text-ink">
            {sickRemaining} remaining
          </span>
        </div>
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-warning rounded-full transition-all"
            style={{ width: `${balances.sick?.total ? (sickRemaining / balances.sick.total) * 100 : 0}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-[13px] text-ink-muted">Remote Days</span>
          <span className="text-[13px] font-medium text-ink">
            {remoteRemaining} remaining
          </span>
        </div>
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${balances.remote?.total ? (remoteRemaining / balances.remote.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Admin: Pending Approvals Badge */}
      {isAdmin && pendingApprovals > 0 && (
        <div 
          className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 cursor-pointer hover:bg-danger/15 transition-colors"
          onClick={() => navigate('/hr-calendar')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger" strokeWidth={1.5} />
              <span className="text-[13px] font-medium text-danger">
                {pendingApprovals} request{pendingApprovals > 1 ? 's' : ''} awaiting approval
              </span>
            </div>
            <Users className="w-4 h-4 text-danger" strokeWidth={1.5} />
          </div>
        </div>
      )}

      {/* Status */}
      <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-2">
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-[13px]">
            <Clock className="w-4 h-4 text-warning" strokeWidth={1.5} />
            <span className="text-ink">
              {pendingCount} pending request{pendingCount > 1 ? 's' : ''} (your requests)
            </span>
          </div>
        )}
        
        {upcomingTimeOff && (
          <div className="flex items-center gap-2 text-[13px]">
            <Calendar className="w-4 h-4 text-positive" strokeWidth={1.5} />
            <span className="text-ink-muted">
              Next: {new Date(upcomingTimeOff.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
        
        {pendingCount === 0 && !upcomingTimeOff && !isAdmin && (
          <p className="text-[13px] text-ink-muted">No upcoming time off scheduled</p>
        )}
        
        {pendingCount === 0 && !upcomingTimeOff && isAdmin && pendingApprovals === 0 && (
          <p className="text-[13px] text-ink-muted">All caught up! No pending approvals.</p>
        )}
      </div>
    </div>
  );
};

export default TimeOffSummaryWidget;
