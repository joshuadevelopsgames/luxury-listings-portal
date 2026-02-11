import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { timeOffNotifications } from '../services/timeOffNotificationService';
import { 
  validateLeaveRequest, 
  calculateBusinessDays,
  canCancelRequest,
  getStatusColor as getStatusColorHelper,
  formatDateRange
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
import { format, differenceInDays } from 'date-fns';
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
    estimatedExpenses: ''
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

  // Leave balances - loaded from Firestore (only vacation and sick have balances; remote is type-only)
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
    const unsubscribe = firestoreService.onLeaveRequestsChange(
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
        const storedBalances = await firestoreService.getUserLeaveBalances(currentUser.email);
        
        // Calculate pending from current requests
        const pendingCounts = { vacation: 0, sick: 0 };
        myRequests.forEach(request => {
          if (request.status === 'pending' && pendingCounts[request.type] !== undefined) {
            pendingCounts[request.type] += request.days || 1;
          }
        });
        
        const balances = {
          vacation: { 
            ...storedBalances.vacation,
            remaining: storedBalances.vacation.total - storedBalances.vacation.used,
            pending: pendingCounts.vacation 
          },
          sick: { 
            ...storedBalances.sick,
            remaining: storedBalances.sick.total - storedBalances.sick.used,
            pending: pendingCounts.sick 
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
        const conflicts = await firestoreService.getTeamLeaveConflicts(
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

  const leaveTypes = {
    vacation: { 
      label: 'Vacation', 
      color: 'bg-[#0071e3]/10 text-[#0071e3]', 
      icon: Plane,
      dotColor: 'bg-[#0071e3]',
      description: 'Paid time off for rest and relaxation'
    },
    sick: { 
      label: 'Sick Leave', 
      color: 'bg-[#ff3b30]/10 text-[#ff3b30]', 
      icon: Heart,
      dotColor: 'bg-[#ff3b30]',
      description: 'For illness, injury, or medical appointments'
    },
    remote: { 
      label: 'Remote', 
      color: 'bg-[#34c759]/10 text-[#34c759]', 
      icon: Laptop,
      dotColor: 'bg-[#34c759]',
      description: 'Working from a remote location'
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-[#34c759]/10 text-[#34c759]';
      case 'pending': return 'bg-[#ff9500]/10 text-[#ff9500]';
      case 'rejected': return 'bg-[#ff3b30]/10 text-[#ff3b30]';
      default: return 'bg-black/5 text-[#86868b]';
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
    setLeaveForm(prev => ({ ...prev, [field]: value }));
  };

  const calculateDays = () => {
    if (leaveForm.startDate && leaveForm.endDate) {
      return differenceInDays(new Date(leaveForm.endDate), new Date(leaveForm.startDate)) + 1;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate the request before submitting
    const validation = validateLeaveRequest(leaveForm, leaveBalances, myRequests);
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
        estimatedExpenses: leaveForm.estimatedExpenses ? parseFloat(leaveForm.estimatedExpenses) : 0
      };

      // Use enhanced submission with history tracking
      const result = await firestoreService.submitLeaveRequestEnhanced(newRequest);
      
      if (result.success) {
        console.log('✅ Leave request submitted to Firestore:', result.id);
        
        // Send notifications to admins
        await timeOffNotifications.notifyNewRequest({ ...newRequest, id: result.id });
        
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
      await firestoreService.cancelLeaveRequest(request.id, currentUser.email, 'Cancelled by employee');
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
      await firestoreService.archiveLeaveRequest(request.id, currentUser.email);
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
      await firestoreService.unarchiveLeaveRequest(request.id, currentUser.email);
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
      estimatedExpenses: ''
    });
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[14px] text-[#86868b]">Loading your time off requests...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-[#ff3b30] mx-auto mb-4" />
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">Error Loading Time Off</h2>
          <p className="text-[14px] text-[#86868b] mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
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
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">My Time Off</h1>
          <p className="text-[15px] sm:text-[17px] text-[#86868b] mt-1">Manage your vacation, sick leave, and time-off requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Data syncs automatically in real-time"
            className="p-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
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
            <div key={key} className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-xl ${type.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">{type.label}</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[32px] font-semibold text-[#1d1d1f] dark:text-white">{balance.remaining}</p>
                    <p className="text-[12px] text-[#86868b]">days remaining</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-[#86868b]">
                      {balance.used} used / {balance.total} total
                    </p>
                    {balance.pending > 0 && (
                      <p className="text-[12px] text-[#ff9500] font-medium">
                        {balance.pending} pending
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
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
      <div className="rounded-2xl bg-[#0071e3]/5 dark:bg-[#0071e3]/10 border border-[#0071e3]/20 p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#0071e3] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-[13px] font-medium text-[#0071e3] mb-1">Time Off Policy</h3>
            <p className="text-[13px] text-[#0071e3]/80 leading-relaxed">
              Requests must be submitted at least two weeks in advance. Sick leave can be requested same-day. 
              Unused vacation days are paid out at year end. Contact HR if you have questions.
            </p>
          </div>
        </div>
      </div>

      {/* My Requests */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                {showArchived ? 'Archived Requests' : 'My Requests'}
              </span>
              {!showArchived && filteredRequests.length > 0 && (
                <span className="text-[12px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#86868b]">
                  {filteredRequests.length}
                </span>
              )}
            </div>
            {archivedCount > 0 && (
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors bg-black/5 dark:bg-white/10 text-[#86868b] hover:bg-black/10 dark:hover:bg-white/15"
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
                    <Archive className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
                    <p className="text-[14px] text-[#86868b]">No archived requests</p>
                    <button 
                      onClick={() => setShowArchived(false)}
                      className="mt-4 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                    >
                      View Active Requests
                    </button>
                  </>
                ) : (
                  <>
                    <Calendar className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
                    <p className="text-[14px] text-[#86868b]">No time-off requests yet</p>
                    <button 
                      onClick={() => setShowRequestModal(true)}
                      className="mt-4 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
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
                    className="rounded-xl border border-black/5 dark:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors overflow-hidden"
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
                            <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{type.label}</p>
                            {request.isTravel && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ff9500]/10 text-[#ff9500] font-medium flex items-center gap-1">
                                <Plane className="w-3 h-3" />
                                Travel
                              </span>
                            )}
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 ${getStatusColor(request.status)}`}>
                              {getStatusIcon(request.status)}
                              <span className="capitalize">{request.status}</span>
                            </span>
                          </div>
                          <p className="text-[12px] text-[#86868b]">
                            {safeFormatDate(request.startDate, 'MMM dd, yyyy')} - {safeFormatDate(request.endDate, 'MMM dd, yyyy')}
                            <span className="mx-2">•</span>
                            {request.days} {request.days === 1 ? 'day' : 'days'}
                          </p>
                          <p className="text-[12px] text-[#86868b] mt-1">{request.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[11px] text-[#86868b]">Submitted {safeFormatDate(request.submittedDate, 'MMM dd')}</p>
                          {request.reviewedBy && (
                            <p className="text-[10px] text-[#86868b] mt-1">
                              {request.status === 'approved' ? 'Approved' : 'Reviewed'} by {request.reviewedBy}
                            </p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-[#86868b]" /> : <ChevronDown className="w-5 h-5 text-[#86868b]" />}
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-black/5 dark:border-white/10 pt-4 space-y-3">
                        {/* Travel Details */}
                        {request.isTravel && (
                          <div className="bg-[#ff9500]/5 rounded-xl p-4 space-y-2">
                            <p className="text-[12px] font-medium text-[#ff9500]">Travel Details</p>
                            {request.destination && (
                              <p className="text-[12px] text-[#ff9500]/80 flex items-center">
                                <MapPin className="w-4 h-4 mr-2" />
                                {request.destination}
                              </p>
                            )}
                            {request.travelPurpose && (
                              <p className="text-[12px] text-[#ff9500]/80 flex items-center">
                                <Briefcase className="w-4 h-4 mr-2" />
                                {request.travelPurpose}
                              </p>
                            )}
                            {request.estimatedExpenses > 0 && (
                              <p className="text-[12px] text-[#ff9500]/80 flex items-center">
                                <DollarSign className="w-4 h-4 mr-2" />
                                Estimated: ${request.estimatedExpenses}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Manager Notes (for rejected) */}
                        {request.status === 'rejected' && request.managerNotes && (
                          <div className="bg-[#ff3b30]/5 rounded-xl p-4">
                            <p className="text-[12px] font-medium text-[#ff3b30] mb-1">Rejection Reason</p>
                            <p className="text-[12px] text-[#ff3b30]/80">{request.managerNotes}</p>
                          </div>
                        )}
                        
                        {/* History */}
                        {request.history && request.history.length > 0 && (
                          <div className="bg-black/[0.02] dark:bg-white/5 rounded-xl p-4">
                            <p className="text-[12px] font-medium text-[#1d1d1f] dark:text-white mb-2 flex items-center">
                              <History className="w-4 h-4 mr-2" />
                              Request History
                            </p>
                            <div className="space-y-1">
                              {request.history.map((entry, idx) => (
                                <p key={idx} className="text-[11px] text-[#86868b]">
                                  <span className="font-medium capitalize">{entry.action}</span>
                                  {' by '}{entry.by}
                                  {' on '}{safeFormatDate(entry.timestamp, 'MMM dd, yyyy h:mm a')}
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
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
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
                                  ? 'bg-[#34c759]/10 text-[#34c759] hover:bg-[#34c759]/20'
                                  : 'bg-black/5 dark:bg-white/10 text-[#86868b] hover:bg-black/10 dark:hover:bg-white/15'
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
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] border-b border-black/5 dark:border-white/10 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Request Time Off</h2>
                <button 
                  onClick={() => setShowRequestModal(false)}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Leave Type Selection */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-3">
                  Type of Leave *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(leaveTypes).map(([key, type]) => {
                    const Icon = type.icon;
                    const balance = leaveBalances[key];
                    
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleFormChange('type', key)}
                        className={`p-4 rounded-xl text-left transition-all ${
                          leaveForm.type === key 
                            ? 'bg-[#0071e3]/10 border-2 border-[#0071e3]' 
                            : 'bg-black/[0.02] dark:bg-white/5 border-2 border-transparent hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-5 h-5 ${leaveForm.type === key ? 'text-[#0071e3]' : 'text-[#86868b]'}`} />
                          <span className={`text-[13px] font-medium ${leaveForm.type === key ? 'text-[#0071e3]' : 'text-[#1d1d1f] dark:text-white'}`}>{type.label}</span>
                        </div>
                        <p className="text-[11px] text-[#86868b] mb-2">{type.description}</p>
                        <p className={`text-[12px] font-medium ${leaveForm.type === key ? 'text-[#0071e3]' : 'text-[#1d1d1f] dark:text-white'}`}>
                          {balance.remaining} days available
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => handleFormChange('endDate', e.target.value)}
                    min={leaveForm.startDate}
                    className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                    required
                  />
                </div>
              </div>

              {/* Calculated Days */}
              {calculateDays() > 0 && (
                <div className="bg-[#0071e3]/5 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#0071e3]">Total Business Days Requested:</span>
                    <span className="text-[24px] font-semibold text-[#0071e3]">{calculateDays()}</span>
                  </div>
                </div>
              )}

              {/* Team Leave Conflicts Warning */}
              {leaveConflicts.length > 0 && (
                <div className="bg-[#ff9500]/10 border border-[#ff9500]/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#ff9500]/20 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-[#ff9500]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-[#ff9500] mb-2">
                        Heads up: {leaveConflicts.length} team member{leaveConflicts.length > 1 ? 's' : ''} also {leaveConflicts.length > 1 ? 'have' : 'has'} time off during this period
                      </p>
                      <div className="space-y-2">
                        {leaveConflicts.slice(0, 5).map((conflict) => (
                          <div
                            key={conflict.id}
                            className="flex items-center justify-between text-[12px] bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${conflict.status === 'approved' ? 'bg-[#34c759]' : 'bg-[#ff9500]'}`} />
                              <span className="font-medium text-[#1d1d1f] dark:text-white">
                                {conflict.employeeName}
                              </span>
                              <span className="text-[#86868b]">
                                ({conflict.type})
                              </span>
                            </div>
                            <span className="text-[#86868b]">
                              {conflict.startDate} → {conflict.endDate}
                            </span>
                          </div>
                        ))}
                        {leaveConflicts.length > 5 && (
                          <p className="text-[11px] text-[#ff9500]/70">
                            +{leaveConflicts.length - 5} more...
                          </p>
                        )}
                      </div>
                      <p className="text-[11px] text-[#86868b] mt-2">
                        You can still submit your request. This is just a heads up about potential coverage gaps.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Checking Conflicts Indicator */}
              {checkingConflicts && leaveForm.startDate && leaveForm.endDate && (
                <div className="flex items-center gap-2 text-[12px] text-[#86868b]">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Checking team availability...
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-[#ff3b30]/5 rounded-xl p-4">
                  <p className="text-[12px] font-medium text-[#ff3b30] mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Please fix the following errors:
                  </p>
                  <ul className="list-disc list-inside text-[12px] text-[#ff3b30]/80 space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Warnings */}
              {validationWarnings.length > 0 && (
                <div className="bg-[#ff9500]/5 rounded-xl p-4">
                  <p className="text-[12px] font-medium text-[#ff9500] mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Warnings:
                  </p>
                  <ul className="list-disc list-inside text-[12px] text-[#ff9500]/80 space-y-1">
                    {validationWarnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Travel Toggle */}
              <div className="flex items-center gap-3 p-4 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                <input
                  type="checkbox"
                  id="isTravel"
                  checked={leaveForm.isTravel}
                  onChange={(e) => handleFormChange('isTravel', e.target.checked)}
                  className="w-4 h-4 text-[#0071e3] rounded focus:ring-[#0071e3]"
                />
                <label htmlFor="isTravel" className="flex items-center text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                  <Plane className="w-4 h-4 mr-2 text-[#ff9500]" />
                  This is a business travel request
                </label>
              </div>

              {/* Travel Fields */}
              {leaveForm.isTravel && (
                <div className="space-y-4 p-4 bg-[#ff9500]/5 rounded-xl">
                  <p className="text-[13px] font-medium text-[#ff9500]">Travel Details</p>
                  
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                      Destination
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                      <input
                        type="text"
                        value={leaveForm.destination}
                        onChange={(e) => handleFormChange('destination', e.target.value)}
                        placeholder="City, Country"
                        className="w-full h-11 pl-10 pr-4 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#ff9500]"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                      Business Purpose
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                      <input
                        type="text"
                        value={leaveForm.travelPurpose}
                        onChange={(e) => handleFormChange('travelPurpose', e.target.value)}
                        placeholder="e.g., Client meeting, Conference"
                        className="w-full h-11 pl-10 pr-4 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#ff9500]"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                      Estimated Expenses ($)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                      <input
                        type="number"
                        value={leaveForm.estimatedExpenses}
                        onChange={(e) => handleFormChange('estimatedExpenses', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full h-11 pl-10 pr-4 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#ff9500]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Reason *
                </label>
                <input
                  type="text"
                  value={leaveForm.reason}
                  onChange={(e) => handleFormChange('reason', e.target.value)}
                  placeholder="Brief reason for your time off"
                  className="w-full h-11 px-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  required
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={leaveForm.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional information for your manager..."
                  className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
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
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-xl w-full border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="border-b border-black/5 dark:border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Request Details</h2>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-[#86868b]" />
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
                    <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">{leaveTypes[selectedRequest.type].label}</p>
                    <p className="text-[12px] text-[#86868b]">{selectedRequest.days} days</p>
                  </div>
                </div>
                <span className={`text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1 ${getStatusColor(selectedRequest.status)}`}>
                  {getStatusIcon(selectedRequest.status)}
                  <span className="capitalize">{selectedRequest.status}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5 dark:border-white/10">
                <div>
                  <p className="text-[11px] text-[#86868b]">Start Date</p>
                  <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{safeFormatDate(selectedRequest.startDate, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#86868b]">End Date</p>
                  <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{safeFormatDate(selectedRequest.endDate, 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/10">
                <p className="text-[11px] text-[#86868b] mb-1">Reason</p>
                <p className="text-[13px] text-[#1d1d1f] dark:text-white">{selectedRequest.reason}</p>
              </div>

              <div className="pt-4 border-t border-black/5 dark:border-white/10">
                <p className="text-[11px] text-[#86868b] mb-1">Submitted</p>
                <p className="text-[13px] text-[#1d1d1f] dark:text-white">{safeFormatDate(selectedRequest.submittedDate, 'MMMM dd, yyyy')}</p>
              </div>

              {selectedRequest.reviewedBy && (
                <div className="pt-4 border-t border-black/5 dark:border-white/10">
                  <p className="text-[11px] text-[#86868b] mb-1">Reviewed By</p>
                  <p className="text-[13px] text-[#1d1d1f] dark:text-white">{selectedRequest.reviewedBy}</p>
                  <p className="text-[11px] text-[#86868b] mt-1">
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

