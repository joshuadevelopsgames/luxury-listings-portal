import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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
  Home,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Briefcase,
  DollarSign,
  History,
  RefreshCw
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
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
  const [cancelling, setCancelling] = useState(null);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Leave balances - loaded from Firestore
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
    personal: {
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
        const pendingCounts = { vacation: 0, sick: 0, personal: 0 };
        myRequests.forEach(request => {
          if (request.status === 'pending' && pendingCounts[request.type] !== undefined) {
            pendingCounts[request.type] += request.days || 1;
          }
        });
        
        // Merge stored balances with pending counts
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
          },
          personal: { 
            ...storedBalances.personal,
            remaining: storedBalances.personal.total - storedBalances.personal.used,
            pending: pendingCounts.personal 
          }
        };
        
        setLeaveBalances(balances);
      } catch (err) {
        console.error('❌ Error loading leave balances:', err);
      }
    };

    loadLeaveBalances();
  }, [currentUser?.email, myRequests]);

  const leaveTypes = {
    vacation: { 
      label: 'Vacation', 
      color: 'bg-blue-100 text-blue-800', 
      icon: Plane,
      dotColor: 'bg-blue-500',
      description: 'Paid time off for rest and relaxation'
    },
    sick: { 
      label: 'Sick Leave', 
      color: 'bg-red-100 text-red-800', 
      icon: Heart,
      dotColor: 'bg-red-500',
      description: 'For illness, injury, or medical appointments'
    },
    personal: { 
      label: 'Personal Time', 
      color: 'bg-purple-100 text-purple-800', 
      icon: Home,
      dotColor: 'bg-purple-500',
      description: 'For personal matters and emergencies'
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
        
        // Reload requests to show the new one
        loadLeaveRequests();
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
      loadLeaveRequests();
    } catch (error) {
      console.error('❌ Error cancelling request:', error);
      toast.error('Failed to cancel request');
    } finally {
      setCancelling(null);
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
      estimatedExpenses: ''
    });
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your time off requests...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex justify-center items-center min-h-[400px]">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Time Off</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Time Off</h1>
          <p className="text-gray-600 mt-2">Manage your vacation, sick leave, and time-off requests</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            className="flex items-center space-x-2"
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Data syncs automatically in real-time"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </Button>
          <Button className="flex items-center space-x-2" onClick={() => setShowRequestModal(true)}>
            <Plus className="w-4 h-4" />
            <span>Request Time Off</span>
          </Button>
        </div>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(leaveBalances).map(([key, balance]) => {
          const type = leaveTypes[key];
          const Icon = type.icon;
          const usagePercent = (balance.used / balance.total) * 100;
          
          return (
            <Card key={key}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Icon className="w-5 h-5" />
                  <span>{type.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-3xl font-bold text-gray-900">{balance.remaining}</p>
                      <p className="text-sm text-gray-600">days remaining</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {balance.used} used / {balance.total} total
                      </p>
                      {balance.pending > 0 && (
                        <p className="text-sm text-yellow-600 font-medium">
                          {balance.pending} pending
                        </p>
                      )}
                    </div>
                  </div>
                  <Progress value={usagePercent} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Company Policy Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="px-6 pt-7 pb-7">
          <div className="flex items-center space-x-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-2">Time Off Policy</h3>
              <p className="text-sm text-blue-700 leading-relaxed">
                Vacation requests should be submitted at least 2 weeks in advance. Sick leave can be requested same-day. 
                Unused vacation days roll over up to 5 days per year. Contact HR if you have questions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDays className="w-5 h-5" />
            <span>My Requests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {myRequests.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No time-off requests yet</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => setShowRequestModal(true)}
                >
                  Submit Your First Request
                </Button>
              </div>
            ) : (
              myRequests.map((request) => {
                const type = leaveTypes[request.type] || leaveTypes.vacation;
                const Icon = type?.icon || Calendar;
                const isExpanded = expandedRequest === request.id;
                
                return (
                  <div 
                    key={request.id} 
                    className="border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => setExpandedRequest(isExpanded ? null : request.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${type.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-gray-900">{type.label}</p>
                            {request.isTravel && (
                              <Badge className="bg-orange-100 text-orange-800">
                                <Plane className="w-3 h-3 mr-1" />
                                Travel
                              </Badge>
                            )}
                            <Badge className={`${getStatusColor(request.status)} flex items-center space-x-1`}>
                              {getStatusIcon(request.status)}
                              <span className="capitalize">{request.status}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {format(new Date(request.startDate), 'MMM dd, yyyy')} - {format(new Date(request.endDate), 'MMM dd, yyyy')}
                            <span className="mx-2">•</span>
                            {request.days} {request.days === 1 ? 'day' : 'days'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right text-sm text-gray-500">
                          <p>Submitted {request.submittedDate ? format(new Date(request.submittedDate?.toDate ? request.submittedDate.toDate() : request.submittedDate), 'MMM dd') : 'N/A'}</p>
                          {request.reviewedBy && (
                            <p className="text-xs mt-1">
                              {request.status === 'approved' ? 'Approved' : 'Reviewed'} by {request.reviewedBy}
                            </p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-3">
                        {/* Travel Details */}
                        {request.isTravel && (
                          <div className="bg-orange-50 rounded-lg p-3 space-y-2">
                            <p className="text-sm font-medium text-orange-900">Travel Details</p>
                            {request.destination && (
                              <p className="text-sm text-orange-700 flex items-center">
                                <MapPin className="w-4 h-4 mr-2" />
                                {request.destination}
                              </p>
                            )}
                            {request.travelPurpose && (
                              <p className="text-sm text-orange-700 flex items-center">
                                <Briefcase className="w-4 h-4 mr-2" />
                                {request.travelPurpose}
                              </p>
                            )}
                            {request.estimatedExpenses > 0 && (
                              <p className="text-sm text-orange-700 flex items-center">
                                <DollarSign className="w-4 h-4 mr-2" />
                                Estimated: ${request.estimatedExpenses}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Manager Notes (for rejected) */}
                        {request.status === 'rejected' && request.managerNotes && (
                          <div className="bg-red-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason</p>
                            <p className="text-sm text-red-700">{request.managerNotes}</p>
                          </div>
                        )}
                        
                        {/* History */}
                        {request.history && request.history.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                              <History className="w-4 h-4 mr-2" />
                              Request History
                            </p>
                            <div className="space-y-1">
                              {request.history.map((entry, idx) => (
                                <p key={idx} className="text-xs text-gray-600">
                                  <span className="font-medium capitalize">{entry.action}</span>
                                  {' by '}{entry.by}
                                  {' on '}{format(new Date(entry.timestamp), 'MMM dd, yyyy h:mm a')}
                                  {entry.notes && <span className="italic"> - {entry.notes}</span>}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Cancel Button */}
                        {request.status === 'pending' && (
                          <div className="flex justify-end pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelRequest(request);
                              }}
                              disabled={cancelling === request.id}
                            >
                              {cancelling === request.id ? (
                                <span className="flex items-center">
                                  <span className="animate-spin mr-2">⏳</span>
                                  Cancelling...
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel Request
                                </span>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Time Off Modal */}
      {showRequestModal && createPortal(
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 fixed inset-0">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Request Time Off</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowRequestModal(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Leave Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
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
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          leaveForm.type === key 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{type.label}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{type.description}</p>
                        <p className="text-sm font-medium text-gray-900">
                          {balance.remaining} days available
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => handleFormChange('endDate', e.target.value)}
                    min={leaveForm.startDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Calculated Days */}
              {calculateDays() > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">Total Business Days Requested:</span>
                    <span className="text-2xl font-bold text-blue-900">{calculateDays()}</span>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-900 mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Please fix the following errors:
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Warnings */}
              {validationWarnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-900 mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Warnings:
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {validationWarnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Travel Toggle */}
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="isTravel"
                  checked={leaveForm.isTravel}
                  onChange={(e) => handleFormChange('isTravel', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isTravel" className="flex items-center text-sm font-medium text-gray-700">
                  <Plane className="w-4 h-4 mr-2 text-orange-500" />
                  This is a business travel request
                </label>
              </div>

              {/* Travel Fields */}
              {leaveForm.isTravel && (
                <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-900">Travel Details</p>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={leaveForm.destination}
                        onChange={(e) => handleFormChange('destination', e.target.value)}
                        placeholder="City, Country"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Purpose
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={leaveForm.travelPurpose}
                        onChange={(e) => handleFormChange('travelPurpose', e.target.value)}
                        placeholder="e.g., Client meeting, Conference"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Expenses ($)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={leaveForm.estimatedExpenses}
                        onChange={(e) => handleFormChange('estimatedExpenses', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <input
                  type="text"
                  value={leaveForm.reason}
                  onChange={(e) => handleFormChange('reason', e.target.value)}
                  placeholder="Brief reason for your time off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={leaveForm.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional information for your manager..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Request Details Modal */}
      {selectedRequest && createPortal(
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 fixed inset-0">
          <div className="bg-white rounded-lg max-w-xl w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Request Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${leaveTypes[selectedRequest.type].color}`}>
                    {React.createElement(leaveTypes[selectedRequest.type].icon, { className: "w-6 h-6" })}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{leaveTypes[selectedRequest.type].label}</p>
                    <p className="text-sm text-gray-600">{selectedRequest.days} days</p>
                  </div>
                </div>
                <Badge className={`${getStatusColor(selectedRequest.status)} flex items-center space-x-1`}>
                  {getStatusIcon(selectedRequest.status)}
                  <span className="capitalize">{selectedRequest.status}</span>
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-medium">{format(new Date(selectedRequest.startDate), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="font-medium">{format(new Date(selectedRequest.endDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-1">Reason</p>
                <p className="text-gray-900">{selectedRequest.reason}</p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-1">Submitted</p>
                <p className="text-gray-900">{format(new Date(selectedRequest.submittedDate), 'MMMM dd, yyyy')}</p>
              </div>

              {selectedRequest.reviewedBy && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-1">Reviewed By</p>
                  <p className="text-gray-900">{selectedRequest.reviewedBy}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    on {format(new Date(selectedRequest.reviewedDate), 'MMMM dd, yyyy')}
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

