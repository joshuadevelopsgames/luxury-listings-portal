/**
 * TimeOffSummaryWidget - Dashboard widget showing leave balances and pending requests
 * Shows admin-specific pending approvals count if user is time off admin.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Plus, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { firestoreService } from '../../../services/firestoreService';

const TimeOffSummaryWidget = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [upcomingTimeOff, setUpcomingTimeOff] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  
  // Leave balances from Firestore
  const [balances, setBalances] = useState({
    vacation: { used: 0, total: 15 },
    sick: { used: 0, total: 10 },
    personal: { used: 0, total: 3 }
  });

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.email) return;
      
      try {
        // Check if user is admin
        const adminStatus = await firestoreService.isTimeOffAdmin(currentUser.email);
        setIsAdmin(adminStatus);
        
        // Load user's leave balances
        const userBalances = await firestoreService.getUserLeaveBalances(currentUser.email);
        setBalances(userBalances);
        
        // Load user's requests
        const requests = await firestoreService.getLeaveRequests(currentUser.email);
        
        // Count user's pending requests
        const pending = requests.filter(r => r.status === 'pending');
        setPendingCount(pending.length);
        
        // Find next upcoming approved time off
        const approved = requests.filter(r => r.status === 'approved');
        const upcoming = approved.find(r => new Date(r.startDate) > new Date());
        setUpcomingTimeOff(upcoming);
        
        // If admin, count all pending approvals
        if (adminStatus) {
          const allRequests = await firestoreService.getAllLeaveRequests();
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
  }, [currentUser?.email]);

  const vacationRemaining = balances.vacation.total - balances.vacation.used;
  const sickRemaining = balances.sick.total - balances.sick.used;

  if (loading) {
    return (
      <div className="h-[327px] min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10 animate-pulse">
        <div className="h-5 w-32 bg-black/10 dark:bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded" />
          <div className="h-4 w-3/4 bg-black/5 dark:bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[327px] min-h-[327px] widget-scroll overflow-auto bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-black/5 dark:border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5856d6] to-[#af52de] flex items-center justify-center shadow-lg shadow-[#5856d6]/20">
            <Calendar className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-[15px] text-[#1d1d1f] dark:text-white">Time Off</h3>
        </div>
        <button
          onClick={() => navigate('/my-time-off')}
          className="w-8 h-8 rounded-lg bg-[#0071e3] hover:bg-[#0077ed] flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4 text-white" strokeWidth={2} />
        </button>
      </div>

      {/* Balances */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#86868b]">Vacation Days</span>
          <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
            {vacationRemaining} remaining
          </span>
        </div>
        <div className="h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#34c759] rounded-full transition-all"
            style={{ width: `${(vacationRemaining / balances.vacation.total) * 100}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <span className="text-[13px] text-[#86868b]">Sick Days</span>
          <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
            {sickRemaining} remaining
          </span>
        </div>
        <div className="h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#ff9500] rounded-full transition-all"
            style={{ width: `${(sickRemaining / balances.sick.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Admin: Pending Approvals Badge */}
      {isAdmin && pendingApprovals > 0 && (
        <div 
          className="mb-4 p-3 rounded-xl bg-[#ff3b30]/10 border border-[#ff3b30]/20 cursor-pointer hover:bg-[#ff3b30]/15 transition-colors"
          onClick={() => navigate('/hr-calendar')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#ff3b30]" strokeWidth={1.5} />
              <span className="text-[13px] font-medium text-[#ff3b30]">
                {pendingApprovals} request{pendingApprovals > 1 ? 's' : ''} awaiting approval
              </span>
            </div>
            <Users className="w-4 h-4 text-[#ff3b30]" strokeWidth={1.5} />
          </div>
        </div>
      )}

      {/* Status */}
      <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-2">
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 text-[13px]">
            <Clock className="w-4 h-4 text-[#ff9500]" strokeWidth={1.5} />
            <span className="text-[#1d1d1f] dark:text-white">
              {pendingCount} pending request{pendingCount > 1 ? 's' : ''} (your requests)
            </span>
          </div>
        )}
        
        {upcomingTimeOff && (
          <div className="flex items-center gap-2 text-[13px]">
            <Calendar className="w-4 h-4 text-[#34c759]" strokeWidth={1.5} />
            <span className="text-[#86868b]">
              Next: {new Date(upcomingTimeOff.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}
        
        {pendingCount === 0 && !upcomingTimeOff && !isAdmin && (
          <p className="text-[13px] text-[#86868b]">No upcoming time off scheduled</p>
        )}
        
        {pendingCount === 0 && !upcomingTimeOff && isAdmin && pendingApprovals === 0 && (
          <p className="text-[13px] text-[#86868b]">All caught up! No pending approvals.</p>
        )}
      </div>
    </div>
  );
};

export default TimeOffSummaryWidget;
