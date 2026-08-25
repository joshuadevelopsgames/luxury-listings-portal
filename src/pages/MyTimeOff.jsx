import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { googleCalendarService } from '../services/googleCalendarService';
import { timeOffNotifications } from '../services/timeOffNotificationService';
import { 
  validateLeaveRequest, 
  calculateBusinessDays,
  canCancelRequest,
  formatDateRange,
  getLeaveTypeDisplayLabel
} from '../utils/timeOffHelpers';
import { 
  Calendar, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  Plane,
  Heart,
  Laptop,
  MoreHorizontal,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Briefcase,
  DollarSign,
  History,
  RefreshCw,
  Archive,
  ArchiveRestore,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { safeFormatDate } from '../utils/dateUtils';
import { toast } from 'react-hot-toast';

const MyTimeOff = () => {
  const { currentUser } = useAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Leave request form state
  const [leaveForm, setLeaveForm] = useState({
    type: 'vacation',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    isAllDay: true,
    reason: '',
    notes: '',
    // Travel fields
    isTravel: false,
    destination: '',
    travelPurpose: '',
    estimatedExpenses: '',
    // Other type sub-type (when type === 'other')
    otherSubType: '',
    otherCustomLabel: ''
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Team leave conflicts state
  const [leaveConflicts, setLeaveConflicts] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  // Leave balances
  const [leaveBalances, setLeaveBalances] = useState({
    vacation: {
      total: 0,
      used: 0,
      remaining: 0,
      pending: 0
    },
    sick: {
      total: 0,
      used: 0,
      remaining: 0,
      pending: 0
    },
    remote: {
      total: 0,
      used: 0,
      remaining: 0,
      pending: 0
    }
  });

  const [myRequests, setMyRequests] = useState([]);

  // Real-time listener for leave requests - auto-updates when status changes
  useEffect(() => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener - automatically updates when data changes in Firestore
    const unsubscribe = supabaseService.onLeaveRequestsChange(
      (requests) => {
        console.log('📥 Leave requests updated (real-time):', requests?.length || 0);
        setMyRequests(requests || []);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      },
      currentUser.email
    );

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser?.email]);

  // Manual refresh function (for user-triggered refresh)
  const handleManualRefresh = () => {
    setRefreshing(true);
    // The real-time listener will automatically update, but we show a quick feedback
    toast.success('Synced with server');
    setTimeout(() => setRefreshing(false), 500);
  };

  // Load leave balances from Firestore
  useEffect(() => {
    if (!currentUser?.email) return;

    const loadLeaveBalances = async () => {
      try {
        // Load balances from user's Firestore document
        const storedBalances = await supabaseService.getUserLeaveBalances(currentUser.email);
        
        // Calculate pending from current requests
        const pendingCounts = { vacation: 0, sick: 0, remote: 0 };
        myRequests.forEach(request => {
          if (request.status === 'pending' && pendingCounts[request.type] !== undefined) {
            pendingCounts[request.type] += request.days || 1;
          }
        });

        const remoteBal = storedBalances.remote || { total: 10, used: 0 };
        const balances = {
          vacation: {
            ...storedBalances.vacation,
            remaining: (storedBalances.vacation?.total || 0) - (storedBalances.vacation?.used || 0),
            pending: pendingCounts.vacation
          },
          sick: {
            ...storedBalances.sick,
            remaining: (storedBalances.sick?.total || 0) - (storedBalances.sick?.used || 0),
            pending: pendingCounts.sick
          },
          remote: {
            ...remoteBal,
            remaining: (remoteBal.total || 0) - (remoteBal.used || 0),
            pending: pendingCounts.remote
          }
        };
        
        setLeaveBalances(balances);
      } catch (err) {
        console.error('❌ Error loading leave balances:', err);
      }
    };

    loadLeaveBalances();
  }, [currentUser?.email, myRequests]);

  // Check for team leave conflicts when dates change
  useEffect(() => {
    const checkConflicts = async () => {
      if (!leaveForm.startDate || !leaveForm.endDate || !currentUser?.email) {
        setLeaveConflicts([]);
        return;
      }

      setCheckingConflicts(true);
      try {
        const conflicts = await supabaseService.getTeamLeaveConflicts(
          leaveForm.startDate,
          leaveForm.endDate,
          currentUser.email
        );
        setLeaveConflicts(conflicts);
      } catch (error) {
        console.error('Error checking leave conflicts:', error);
        setLeaveConflicts([]);
      } finally {
        setCheckingConflicts(false);
      }
    };

    // Debounce the check to avoid too many queries
    const timeoutId = setTimeout(checkConflicts, 300);
    return () => clearTimeout(timeoutId);
  }, [leaveForm.startDate, leaveForm.endDate, currentUser?.email]);

  // Auto-sync approved vacation/sick/other to requester's Google Calendar when they have a stored token (no popup)
  useEffect(() => {
    if (!currentUser?.email || !myRequests.length) return;
    const approved = myRequests.filter(
      (r) => !r.archived && r.status === 'approved' && (r.type === 'vacation' || r.type === 'sick' || r.type === 'other')
    );
    if (approved.length === 0) return;

    const timeoutId = setTimeout(async () => {
      try {
        const reconnected = await googleCalendarService.tryAutoReconnect(currentUser.email);
        if (!reconnected && !googleCalendarService.getConnectionStatus().isConnected) return;
        for (const request of approved) {
          try {
            if (request.requesterCalendarEventId) {
              await googleCalendarService.updateLeaveEvent(request, request.requesterCalendarEventId);
            } else {
              const result = await googleCalendarService.createLeaveEvent(request);
              if (result?.id) {
                await supabaseService.setLeaveRequestRequesterCalendarEventId(request.id, result.id);
              }
            }
          } catch (_) {}
        }
        // Silent auto-sync; manual "Sync to Google Calendar" still shows toast
      } catch (_) {}
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [currentUser?.email, myRequests]);

  const leaveTypes = {
    vacation: { 
      label: 'Vacation', 
      color: 'bg-brand/10 text-brand', 
      icon: Plane,
      dotColor: 'bg-brand',
      description: 'Paid time off for rest and relaxation'
    },
    sick: { 
      label: 'Sick Leave', 
      color: 'bg-danger/10 text-danger', 
      icon: Heart,
      dotColor: 'bg-danger',
      description: 'For illness, injury, or medical appointments'
    },
    remote: { 
      label: 'Remote', 
      color: 'bg-positive/10 text-positive', 
      icon: Laptop,
      dotColor: 'bg-positive',
      description: 'Working from a remote location'
    },
    other: { 
      label: 'Other', 
      color: 'bg-brand-soft/80 text-brand dark:bg-brand/20 dark:text-indigo-300', 
      icon: MoreHorizontal,
      dotColor: 'bg-brand',
      description: 'Bereavement, maternity leave, or other'
    }
  };

  const otherSubTypeOptions = [
    { value: 'bereavement', label: 'Bereavement' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'custom', label: 'Custom' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-positive/10 text-positive';
      case 'pending': return 'bg-warning/10 text-warning';
      case 'rejected': return 'bg-danger/10 text-danger';
      default: return 'bg-black/5 text-ink-muted';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleFormChange = (field, value) => {
    setLeaveForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'type' && value !== 'other') {
        next.otherSubType = '';
        next.otherCustomLabel = '';
      }
      return next;
    });
  };

  const calculateDays = () => {
    if (leaveForm.startDate && leaveForm.endDate) {
      return calculateBusinessDays(leaveForm.startDate, leaveForm.endDate);
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate the request before submitting
    const isAdmin = currentUser?.isAdmin || currentUser?.isTimeOffAdmin || false;
    const validation = validateLeaveRequest(leaveForm, leaveBalances, myRequests, isAdmin);
    setValidationErrors(validation.errors);
    setValidationWarnings(validation.warnings);
    
    if (!validation.valid) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const newRequest = {
        employeeEmail: currentUser.email,
        employeeName: currentUser.displayName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
        type: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        days: validation.requestedDays || calculateDays(),
        reason: leaveForm.reason,
        notes: leaveForm.notes,
        // Travel fields
        isTravel: leaveForm.isTravel,
        destination: leaveForm.destination,
        travelPurpose: leaveForm.travelPurpose,
        estimatedExpenses: leaveForm.estimatedExpenses ? parseFloat(leaveForm.estimatedExpenses) : 0,
        // Other sub-type (when type === 'other')
        ...(leaveForm.type === 'other' && {
          otherSubType: leaveForm.otherSubType || 'custom',
          otherCustomLabel: leaveForm.otherSubType === 'custom' ? (leaveForm.otherCustomLabel || '').trim() : ''
        })
      };

      // Use enhanced submission with history tracking
      const result = await supabaseService.submitLeaveRequestEnhanced(newRequest);
      const requestId = typeof result === 'string' ? result : result?.id;

      if (requestId) {
        console.log('✅ Leave request submitted:', requestId);

        // Notify admins — never let a notification failure mask a successful request
        try {
          await timeOffNotifications.notifyNewRequest({ ...newRequest, id: requestId });
        } catch (notifyError) {
          console.warn('⚠️ Could not send time-off notification:', notifyError);
        }

        toast.success('Time off request submitted! Your request has been sent for approval.');
        setShowRequestModal(false);
        resetForm();
        // Real-time listener will auto-update the requests list
      }
    } catch (error) {
      console.error('❌ Error submitting leave request:', error);
      toast.error(`Failed to submit request: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel a pending request
  const handleCancelRequest = async (request) => {
    if (!canCancelRequest(currentUser, request)) {
      toast.error('You can only cancel your own pending requests');
      return;
    }
    
    setCancelling(request.id);
    
    try {
      await supabaseService.cancelLeaveRequest(request.id, currentUser.email, 'Cancelled by employee');
      toast.success('Request cancelled');
      // Real-time listener will auto-update the requests list
    } catch (error) {
      console.error('❌ Error cancelling request:', error);
      toast.error('Failed to cancel request');
    } finally {
      setCancelling(null);
    }
  };

  // Archive a completed/rejected request
  const handleArchiveRequest = async (request) => {
    setArchiving(request.id);
    
    try {
      await supabaseService.archiveLeaveRequest(request.id, currentUser.email);
      toast.success('Request archived');
    } catch (error) {
      console.error('❌ Error archiving request:', error);
      toast.error('Failed to archive request');
    } finally {
      setArchiving(null);
    }
  };

  // Unarchive a request
  const handleUnarchiveRequest = async (request) => {
    setArchiving(request.id);
    
    try {
      await supabaseService.unarchiveLeaveRequest(request.id, currentUser.email);
      toast.success('Request restored');
    } catch (error) {
      console.error('❌ Error restoring request:', error);
      toast.error('Failed to restore request');
    } finally {
      setArchiving(null);
    }
  };

  // Filter requests based on archive status
  const filteredRequests = showArchived 
    ? myRequests.filter(r => r.archived)
    : myRequests.filter(r => !r.archived);

  const archivedCount = myRequests.filter(r => r.archived).length;

  // Approved vacation/sick/other: add new to calendar or update existing so calendar matches program
  const approvedToSync = myRequests.filter(
    (r) => !r.archived && r.status === 'approved' && (r.type === 'vacation' || r.type === 'sick' || r.type === 'other')
  );

  const handleSyncToGoogleCalendar = async () => {
    if (!currentUser?.email || approvedToSync.length === 0 || syncingCalendar) return;
    setSyncingCalendar(true);
    try {
      await googleCalendarService.initialize(currentUser.email);
      let added = 0;
      let updated = 0;
      for (const request of approvedToSync) {
        try {
          if (request.requesterCalendarEventId) {
            await googleCalendarService.updateLeaveEvent(request, request.requesterCalendarEventId);
            updated++;
          } else {
            const result = await googleCalendarService.createLeaveEvent(request);
            if (result?.id) {
              await supabaseService.setLeaveRequestRequesterCalendarEventId(request.id, result.id);
              added++;
            }
          }
        } catch (err) {
          console.warn('Calendar sync for one request failed:', err);
        }
      }
      if (added > 0 || updated > 0) {
        const parts = [];
        if (added > 0) parts.push(`${added} added`);
        if (updated > 0) parts.push(`${updated} updated`);
        toast.success(`Google Calendar: ${parts.join(', ')}.`);
      } else if (approvedToSync.length > 0) toast.error('Could not sync. Try connecting your calendar first.');
    } catch (err) {
      console.error('Calendar sync error:', err);
      toast.error(err.message || 'Could not sync to Google Calendar');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const resetForm = () => {
    setLeaveForm({
      type: 'vacation',
      startDate: '',
      endDate: '',
      startTime: '09:00',
      endTime: '17:00',
      isAllDay: true,
      reason: '',
      notes: '',
      isTravel: false,
      destination: '',
      travelPurpose: '',
      estimatedExpenses: '',
      otherSubType: '',
      otherCustomLabel: ''
    });
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[14px] text-ink-muted">Loading your time off requests...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-[17px] font-semibold text-ink mb-2">Error Loading Time Off</h2>
          <p className="text-[14px] text-ink-muted mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-ink tracking-[-0.02em]">My Time Off</h1>
          <p className="text-[15px] sm:text-[17px] text-ink-muted mt-1">Manage your vacation, sick leave, and time-off requests</p>
        </div>
        <div className="flex items-center gap-2">
          {approvedToSync.length > 0 && (
            <button
              onClick={handleSyncToGoogleCalendar}
              disabled={syncingCalendar}
              title="Add or update approved leave on your Google Calendar"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-positive/10 text-positive text-[13px] font-medium hover:bg-positive/20 transition-colors disabled:opacity-50"
            >
              {syncingCalendar ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              <span>Sync to Google Calendar</span>
            </button>
          )}
          <button 
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Data syncs automatically in real-time"
            className="p-2.5 rounded-xl bg-surface-3 text-ink hover:bg-hairline-strong transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Request Time Off</span>
          </button>
        </div>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(leaveBalances).map(([key, balance]) => {
          const type = leaveTypes[key];
          if (!type) return null;
          const Icon = type.icon;
          const usagePercent = balance.total > 0 ? (balance.used / balance.total) * 100 : 0;
          
          return (
            <div key={key} className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-xl ${type.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[15px] font-medium text-ink">{type.label}</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[32px] font-semibold text-ink">{balance.remaining}</p>
                    <p className="text-[12px] text-ink-muted">days remaining</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-ink-muted">
                      {balance.used} used / {balance.total} total
                    </p>
                    {balance.pending > 0 && (
                      <p className="text-[12px] text-warning font-medium">
                        {balance.pending} pending
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${type.dotColor}`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Company Policy Info */}
      <div className="rounded-xl bg-brand/5 dark:bg-brand/10 border border-brand/20 p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[13px] font-medium text-brand mb-1">Time Off Policy</h3>
            <p className="text-[13px] text-brand/80 leading-relaxed">
              Requests must be submitted at least three weeks in advance. Sick leave can be requested same-day.
            </p>
          </div>
        </div>
      </div>

      {/* My Requests */}
      <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-ink" />
              <span className="text-[15px] font-medium text-ink">
                {showArchived ? 'Archived Requests' : 'My Requests'}
              </span>
              {!showArchived && filteredRequests.length > 0 && (
                <span className="text-[12px] px-2 py-0.5 rounded-md bg-surface-3 text-ink-muted">
                  {filteredRequests.length}
                </span>
              )}
            </div>
            {archivedCount > 0 && (
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors bg-surface-3 text-ink-muted hover:bg-hairline-strong"
              >
                {showArchived ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Show Active ({myRequests.filter(r => !r.archived).length})
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    Show Archived ({archivedCount})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8">
                {showArchived ? (
                  <>
                    <Archive className="w-12 h-12 text-ink-muted mx-auto mb-3" />
                    <p className="text-[14px] text-ink-muted">No archived requests</p>
                    <button 
                      onClick={() => setShowArchived(false)}
                      className="mt-4 px-4 py-2.5 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-hairline-strong transition-colors"
                    >
                      View Active Requests
                    </button>
                  </>
                ) : (
                  <>
                    <Calendar className="w-12 h-12 text-ink-muted mx-auto mb-3" />
                    <p className="text-[14px] text-ink-muted">No time-off requests yet</p>
                    <button 
                      onClick={() => setShowRequestModal(true)}
                      className="mt-4 px-4 py-2.5 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-hairline-strong transition-colors"
                    >
                      Submit Your First Request
                    </button>
                  </>
                )}
              </div>
            ) : (
              filteredRequests.map((request) => {
                const type = leaveTypes[request.type] || leaveTypes.vacation;
                const Icon = type?.icon || Calendar;
                const isExpanded = expandedRequest === request.id;
                
                return (
                  <div 
                    key={request.id} 
                    className="rounded-xl border border-hairline hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors overflow-hidden"
                  >
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${type.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <p className="text-[14px] font-medium text-ink">
                              {request.type === 'other' ? (getLeaveTypeDisplayLabel(request) || type.label) : type.label}
                            </p>
                            {request.isTravel && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-warning/10 text-warning font-medium flex items-center gap-1">
                                <Plane className="w-3 h-3" />
                                Travel
                              </span>
                            )}
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${getStatusColor(request.status)}`}>
                              {getStatusIcon(request.status)}
                              <span className="capitalize">{request.status}</span>
                            </span>
                          </div>
                          <p className="text-[12px] text-ink-muted">
                            {safeFormatDate(request.startDate, 'MMM dd, yyyy')} - {safeFormatDate(request.endDate, 'MMM dd, yyyy')}
                            <span className="mx-2">•</span>
                            {request.days} {request.days === 1 ? 'day' : 'days'}
                          </p>
                          <p className="text-[12px] text-ink-muted mt-1">{request.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[11px] text-ink-muted">Submitted {safeFormatDate(request.submittedDate, 'MMM dd')}</p>
                          {request.reviewedBy && (
                            <p className="text-[10px] text-ink-muted mt-1">
                              {request.status === 'approved' ? 'Approved' : 'Reviewed'} by {request.reviewedBy}
                            </p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-ink-muted" /> : <ChevronDown className="w-5 h-5 text-ink-muted" />}
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-hairline pt-4 space-y-3">
                        {/* Travel Details */}
                        {request.isTravel && (
                          <div className="bg-warning/5 rounded-xl p-4 space-y-2">
                            <p className="text-[12px] font-medium text-warning">Travel Details</p>
                            {request.destination && (
                              <p className="text-[12px] text-warning/80 flex items-center">
                                <MapPin className="w-4 h-4 mr-2" />
                                {request.destination}
                              </p>
                            )}
                            {request.travelPurpose && (
                              <p className="text-[12px] text-warning/80 flex items-center">
                                <Briefcase className="w-4 h-4 mr-2" />
                                {request.travelPurpose}
                              </p>
                            )}
                            {request.estimatedExpenses > 0 && (
                              <p className="text-[12px] text-warning/80 flex items-center">
                                <DollarSign className="w-4 h-4 mr-2" />
                                Estimated: ${request.estimatedExpenses}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Manager Notes (for rejected) */}
                        {request.status === 'rejected' && request.managerNotes && (
                          <div className="bg-danger/5 rounded-xl p-4">
                            <p className="text-[12px] font-medium text-danger mb-1">Rejection Reason</p>
                            <p className="text-[12px] text-danger/80">{request.managerNotes}</p>
                          </div>
                        )}
                        
                        {/* History */}
                        {Array.isArray(request.history) && request.history.length > 0 && (
                          <div className="bg-surface-2 rounded-xl p-4">
                            <p className="text-[12px] font-medium text-ink mb-2 flex items-center">
                              <History className="w-4 h-4 mr-2" />
                              Request History
                            </p>
                            <div className="space-y-1">
                              {request.history.map((entry, idx) => (
                                <p key={idx} className="text-[11px] text-ink-muted">
                                  <span className="font-medium capitalize">{entry.action}</span>
                                  {' by '}{entry.by}
                                  {' on '}{safeFormatDate(entry.timestamp || entry.at, 'MMM dd, yyyy h:mm a')}
                                  {entry.notes && <span className="italic"> - {entry.notes}</span>}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                          {/* Cancel Button - only for pending */}
                          {request.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRequest(request);
                              }}
                              disabled={cancelling === request.id}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-danger/10 text-danger text-[12px] font-medium hover:bg-danger/20 transition-colors disabled:opacity-50"
                            >
                              {cancelling === request.id ? (
                                <>
                                  <span className="animate-spin">⏳</span>
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  Cancel Request
                                </>
                              )}
                            </button>
                          )}
                          
                          {/* Archive/Unarchive Button - for non-pending requests */}
                          {request.status !== 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                request.archived 
                                  ? handleUnarchiveRequest(request) 
                                  : handleArchiveRequest(request);
                              }}
                              disabled={archiving === request.id}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors disabled:opacity-50 ${
                                request.archived 
                                  ? 'bg-positive/10 text-positive hover:bg-positive/20'
                                  : 'bg-surface-3 text-ink-muted hover:bg-hairline-strong'
                              }`}
                            >
                              {archiving === request.id ? (
                                <>
                                  <span className="animate-spin">⏳</span>
                                  {request.archived ? 'Restoring...' : 'Archiving...'}
                                </>
                              ) : request.archived ? (
                                <>
                                  <ArchiveRestore className="w-3.5 h-3.5" />
                                  Restore
                                </>
                              ) : (
                                <>
                                  <Archive className="w-3.5 h-3.5" />
                                  Archive
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Request Time Off Modal */}
      {showRequestModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-hairline-strong shadow-lg">
            <div className="sticky top-0 bg-surface border-b border-hairline px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-ink">Request Time Off</h2>
                <button 
                  onClick={() => setShowRequestModal(false)}
                  className="p-2 rounded-lg hover:bg-surface-3 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-ink-muted" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Leave Type Selection */}
              <div>
                <label className="block text-[13px] font-medium text-ink mb-3">
                  Type of Leave *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(leaveTypes).map(([key, type]) => {
                    const Icon = type.icon;
                    const balance = leaveBalances[key];
                    const daysLabel = balance != null ? `${balance.remaining} days available` : 'No balance tracking';
                    
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleFormChange('type', key)}
                        className={`p-4 rounded-xl text-left transition-all ${
                          leaveForm.type === key 
                            ? 'bg-brand/10 border-2 border-brand' 
                            : 'bg-surface-2 border-2 border-transparent hover:bg-surface-3'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-5 h-5 ${leaveForm.type === key ? 'text-brand' : 'text-ink-muted'}`} />
                          <span className={`text-[13px] font-medium ${leaveForm.type === key ? 'text-brand' : 'text-ink'}`}>{type.label}</span>
                        </div>
                        <p className="text-[11px] text-ink-muted mb-2">{type.description}</p>
                        <p className={`text-[12px] font-medium ${leaveForm.type === key ? 'text-brand' : 'text-ink'}`}>
                          {daysLabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Other sub-type (when type is Other) */}
              {leaveForm.type === 'other' && (
                <div className="space-y-3 p-4 rounded-xl bg-brand-soft/50 dark:bg-brand/10 border border-brand-soft dark:border-brand/20">
                  <label className="block text-[13px] font-medium text-ink">
                    Kind of leave *
                  </label>
                  <select
                    value={leaveForm.otherSubType}
                    onChange={(e) => handleFormChange('otherSubType', e.target.value)}
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-white dark:bg-white/10 border border-indigo-200/50 dark:border-brand/30 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="">Select...</option>
                    {otherSubTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {leaveForm.otherSubType === 'custom' && (
                    <input
                      type="text"
                      value={leaveForm.otherCustomLabel}
                      onChange={(e) => handleFormChange('otherCustomLabel', e.target.value)}
                      placeholder="e.g. Jury duty, Parental leave"
                      className="w-full h-11 px-4 text-[14px] rounded-xl bg-white dark:bg-white/10 border border-indigo-200/50 dark:border-brand/30 text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-surface border border-hairline-strong text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => handleFormChange('endDate', e.target.value)}
                    min={leaveForm.startDate}
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-surface border border-hairline-strong text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>
              </div>

              {/* Calculated Days */}
              {calculateDays() > 0 && (
                <div className="bg-brand/5 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-brand">Total Business Days Requested:</span>
                    <span className="text-[24px] font-semibold text-brand">{calculateDays()}</span>
                  </div>
                </div>
              )}

              {/* Team Leave Conflicts Warning */}
              {leaveConflicts.length > 0 && (
                <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-warning" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-warning mb-2">
                        Heads up: {leaveConflicts.length} team member{leaveConflicts.length > 1 ? 's' : ''} also {leaveConflicts.length > 1 ? 'have' : 'has'} time off during this period
                      </p>
                      <div className="space-y-2">
                        {leaveConflicts.slice(0, 5).map((conflict) => (
                          <div
                            key={conflict.id}
                            className="flex items-center justify-between text-[12px] bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${conflict.status === 'approved' ? 'bg-positive' : 'bg-warning'}`} />
                              <span className="font-medium text-ink">
                                {conflict.employeeName}
                              </span>
                              <span className="text-ink-muted">
                                ({conflict.type})
                              </span>
                            </div>
                            <span className="text-ink-muted">
                              {conflict.startDate} → {conflict.endDate}
                            </span>
                          </div>
                        ))}
                        {leaveConflicts.length > 5 && (
                          <p className="text-[11px] text-warning/70">
                            +{leaveConflicts.length - 5} more...
                          </p>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-muted mt-2">
                        You can still submit your request. This is just a heads up about potential coverage gaps.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Checking Conflicts Indicator */}
              {checkingConflicts && leaveForm.startDate && leaveForm.endDate && (
                <div className="flex items-center gap-2 text-[12px] text-ink-muted">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Checking team availability...
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-danger/5 rounded-xl p-4">
                  <p className="text-[12px] font-medium text-danger mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Please fix the following errors:
                  </p>
                  <ul className="list-disc list-inside text-[12px] text-danger/80 space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Warnings */}
              {validationWarnings.length > 0 && (
                <div className="bg-warning/5 rounded-xl p-4">
                  <p className="text-[12px] font-medium text-warning mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Warnings:
                  </p>
                  <ul className="list-disc list-inside text-[12px] text-warning/80 space-y-1">
                    {validationWarnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Travel Toggle */}
              <div className="flex items-center gap-3 p-4 bg-surface-2 rounded-xl">
                <input
                  type="checkbox"
                  id="isTravel"
                  checked={leaveForm.isTravel}
                  onChange={(e) => handleFormChange('isTravel', e.target.checked)}
                  className="w-4 h-4 text-brand rounded focus:ring-brand"
                />
                <label htmlFor="isTravel" className="flex items-center text-[13px] font-medium text-ink">
                  <Plane className="w-4 h-4 mr-2 text-warning" />
                  This is a business travel request
                </label>
              </div>

              {/* Travel Fields */}
              {leaveForm.isTravel && (
                <div className="space-y-4 p-4 bg-warning/5 rounded-xl">
                  <p className="text-[13px] font-medium text-warning">Travel Details</p>
                  
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-2">
                      Destination
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-muted" />
                      <input
                        type="text"
                        value={leaveForm.destination}
                        onChange={(e) => handleFormChange('destination', e.target.value)}
                        placeholder="City, Country"
                        className="w-full h-11 pl-10 pr-4 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-warning"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-2">
                      Business Purpose
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-muted" />
                      <input
                        type="text"
                        value={leaveForm.travelPurpose}
                        onChange={(e) => handleFormChange('travelPurpose', e.target.value)}
                        placeholder="e.g., Client meeting, Conference"
                        className="w-full h-11 pl-10 pr-4 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-warning"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-2">
                      Estimated Expenses ($)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-muted" />
                      <input
                        type="number"
                        value={leaveForm.estimatedExpenses}
                        onChange={(e) => handleFormChange('estimatedExpenses', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full h-11 pl-10 pr-4 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-warning"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-[13px] font-medium text-ink mb-2">
                  Reason *
                </label>
                <input
                  type="text"
                  value={leaveForm.reason}
                  onChange={(e) => handleFormChange('reason', e.target.value)}
                  placeholder="Brief reason for your time off"
                  className="w-full h-11 px-4 text-[14px] rounded-xl bg-surface border border-hairline-strong text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
                  required
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-[13px] font-medium text-ink mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={leaveForm.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional information for your manager..."
                  className="w-full px-4 py-3 text-[14px] rounded-xl bg-surface border border-hairline-strong text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-hairline-strong transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Request Details Modal */}
      {selectedRequest && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-xl w-full border border-hairline-strong shadow-lg">
            <div className="border-b border-hairline px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-ink">Request Details</h2>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 rounded-lg hover:bg-surface-3 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-ink-muted" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${leaveTypes[selectedRequest.type].color}`}>
                    {React.createElement(leaveTypes[selectedRequest.type].icon, { className: "w-6 h-6" })}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-ink">
                      {selectedRequest.type === 'other' ? (getLeaveTypeDisplayLabel(selectedRequest) || leaveTypes.other?.label) : leaveTypes[selectedRequest.type]?.label}
                    </p>
                    <p className="text-[12px] text-ink-muted">{selectedRequest.days} days</p>
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1 ${getStatusColor(selectedRequest.status)}`}>
                  {getStatusIcon(selectedRequest.status)}
                  <span className="capitalize">{selectedRequest.status}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-hairline">
                <div>
                  <p className="text-[11px] text-ink-muted">Start Date</p>
                  <p className="text-[13px] font-medium text-ink">{safeFormatDate(selectedRequest.startDate, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-muted">End Date</p>
                  <p className="text-[13px] font-medium text-ink">{safeFormatDate(selectedRequest.endDate, 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-hairline">
                <p className="text-[11px] text-ink-muted mb-1">Reason</p>
                <p className="text-[13px] text-ink">{selectedRequest.reason}</p>
              </div>

              <div className="pt-4 border-t border-hairline">
                <p className="text-[11px] text-ink-muted mb-1">Submitted</p>
                <p className="text-[13px] text-ink">{safeFormatDate(selectedRequest.submittedDate, 'MMMM dd, yyyy')}</p>
              </div>

              {selectedRequest.reviewedBy && (
                <div className="pt-4 border-t border-hairline">
                  <p className="text-[11px] text-ink-muted mb-1">Reviewed By</p>
                  <p className="text-[13px] text-ink">{selectedRequest.reviewedBy}</p>
                  <p className="text-[11px] text-ink-muted mt-1">
                    on {safeFormatDate(selectedRequest.reviewedDate, 'MMMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default MyTimeOff;

