import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import Calendar from '../components/ui/calendar';
import { googleCalendarService } from '../services/googleCalendarService';
import { toast } from 'react-hot-toast';
import { PERMISSIONS } from '../entities/Permissions';
import { firestoreService } from '../services/firestoreService';
import { timeOffNotifications } from '../services/timeOffNotificationService';
import { calculateBusinessDays, getLeaveTypeDisplayLabel } from '../utils/timeOffHelpers';
import { LEAVE_CALENDAR_SYNC_EMAILS } from '../utils/vancouverTime';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  User, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Filter,
  Download,
  Users,
  ExternalLink,
  RefreshCw,
  Settings,
  MapPin,
  MessageSquare,
  Bell,
  Repeat,
  Tag,
  Plane,
  Heart,
  Laptop,
  ListFilter,
  Check,
  Edit,
  Archive,
  ArchiveRestore,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { format, isToday, isPast, addDays, differenceInDays } from 'date-fns';

const HRCalendar = () => {
  const { currentUser, hasPermission } = useAuth();
  
  // Check permissions - simplified to isTimeOffAdmin
  const canManageLeave = hasPermission(PERMISSIONS.MANAGE_LEAVE_REQUESTS);
  const canApproveLeave = hasPermission(PERMISSIONS.APPROVE_LEAVE);
  const canViewHRData = hasPermission(PERMISSIONS.VIEW_HR_DATA);
  const [isTimeOffAdmin, setIsTimeOffAdmin] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(null); // 'approve' or 'reject' or null
  const [processingRequest, setProcessingRequest] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  
  // Admin balance editor state
  const [showBalanceEditor, setShowBalanceEditor] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editBalances, setEditBalances] = useState({
    vacation: { total: 15, used: 0 },
    sick: { total: 10, used: 0 }
  });
  const [savingBalances, setSavingBalances] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditLeaveModal, setShowEditLeaveModal] = useState(false);
  const [editingLeaveRequest, setEditingLeaveRequest] = useState(null);
  const [editLeaveForm, setEditLeaveForm] = useState({ startDate: '', endDate: '', days: 0, type: 'vacation', reason: '', notes: '', managerNotes: '', otherSubType: '', otherCustomLabel: '' });
  const [savingEditLeave, setSavingEditLeave] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [googleEvents, setGoogleEvents] = useState([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Reset calendar data when user changes
  useEffect(() => {
    if (!currentUser?.email) return;
    
    console.log('📅 Resetting HR Calendar for user:', currentUser.email);
    setGoogleEvents([]);
    setIsGoogleConnected(false);
    setSelectedDate(null);
    setSelectedEvent(null);
  }, [currentUser?.email]);

  // Check if current user is a time off admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser?.email) return;
      try {
        const adminStatus = await firestoreService.isTimeOffAdmin(currentUser.email);
        setIsTimeOffAdmin(adminStatus);
        console.log('📅 Time off admin status:', adminStatus);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    checkAdminStatus();
  }, [currentUser?.email]);

  // Load all users with balances for admin
  const loadUsersWithBalances = async () => {
    setLoadingUsers(true);
    try {
      const users = await firestoreService.getAllUsersWithLeaveBalances();
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Start editing a user's balances
  const startEditingUser = (user) => {
    setEditingUser(user);
    setEditBalances(user.leaveBalances || {
      vacation: { total: 15, used: 0 },
      sick: { total: 10, used: 0 }
    });
  };

  // Save user balances
  const saveUserBalances = async () => {
    if (!editingUser) return;
    setSavingBalances(true);
    try {
      await firestoreService.updateUserLeaveBalances(editingUser.email, editBalances);
      
      // Send notification to user
      await timeOffNotifications.notifyBalanceChange(
        editingUser.email,
        currentUser?.email,
        'leave',
        'updated',
        'new values'
      );
      
      toast.success(`Updated leave balances for ${editingUser.displayName || editingUser.email}`);
      setEditingUser(null);
      loadUsersWithBalances(); // Refresh list
    } catch (error) {
      console.error('Error saving balances:', error);
      toast.error('Failed to save balances');
    } finally {
      setSavingBalances(false);
    }
  };

  // Leave request form state
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    employeeName: '',
    type: 'vacation',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    isAllDay: true,
    reason: '',
    location: '',
    description: '',
    attendees: '',
    reminders: ['15'],
    recurrence: 'none',
    recurrenceEndDate: '',
    tags: [],
    priority: 'medium',
    otherSubType: '',
    otherCustomLabel: ''
  });

  // Leave requests state - loaded from Firestore
  const [leaveRequests, setLeaveRequests] = useState([]);
  
  // Team members state - loaded from Firestore
  const [teamMembers, setTeamMembers] = useState([]);

  // Leave type definitions with colors (Other includes Bereavement, Maternity, Custom via otherSubType)
  const leaveTypes = {
    vacation: { label: 'Vacation', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-500' },
    sick: { label: 'Sick Leave', color: 'bg-red-100 text-red-800', dotColor: 'bg-red-500' },
    remote: { label: 'Remote', color: 'bg-green-100 text-green-800', dotColor: 'bg-green-500' },
    other: { label: 'Other', color: 'bg-indigo-100 text-indigo-800', dotColor: 'bg-indigo-500' }
  };

  const getLeaveTypeLabel = (request) => {
    if (request?.type === 'other') return getLeaveTypeDisplayLabel(request) || leaveTypes.other.label;
    return leaveTypes[request?.type]?.label || request?.type || 'Leave';
  };

  // Priority levels
  const priorityLevels = {
    low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
    medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    high: { label: 'High', color: 'bg-red-100 text-red-800' }
  };

  // Recurrence options
  const recurrenceOptions = [
    { value: 'none', label: 'No repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  // Reminder options
  const reminderOptions = [
    { value: '5', label: '5 minutes before' },
    { value: '10', label: '10 minutes before' },
    { value: '15', label: '15 minutes before' },
    { value: '30', label: '30 minutes before' },
    { value: '60', label: '1 hour before' },
    { value: '1440', label: '1 day before' }
  ];

  // Combine leave requests with Google Calendar events
  const allEvents = [
    ...leaveRequests.map(request => ({
      id: `leave-${request.id}`,
      title: `${request.employeeName} - ${getLeaveTypeLabel(request)}`,
      description: request.description || request.reason,
      start: new Date(request.startDate + 'T' + request.startTime),
      end: new Date(request.endDate + 'T' + request.endTime),
      type: 'leave',
      leaveType: request.type,
      time: `${request.startDate} - ${request.endDate}`,
      isAllDay: request.isAllDay,
      source: 'leave-request',
      data: request,
      location: request.location,
      priority: request.priority,
      tags: request.tags,
      dotColor: leaveTypes[request.type]?.dotColor || 'bg-gray-500'
    })),
    ...googleEvents
  ];

  useEffect(() => {
    checkGoogleCalendarConnection();
  }, []);

  // Load leave requests from Firestore
  useEffect(() => {
    const loadLeaveRequests = async () => {
      try {
        const requests = await firestoreService.getAllLeaveRequests();
        if (requests && requests.length > 0) {
          // Transform Firestore data to match expected format
          const formattedRequests = requests.map(req => ({
            id: req.id,
            employeeId: req.employeeId || req.employeeEmail || req.userEmail,
            employeeEmail: req.employeeEmail || req.userEmail || req.employeeId,
            employeeName: req.employeeName || req.userName || 'Unknown',
            type: req.type || 'vacation',
            startDate: req.startDate,
            endDate: req.endDate,
            startTime: req.startTime || '09:00',
            endTime: req.endTime || '17:00',
            isAllDay: req.isAllDay !== false,
            days: req.days || 1,
            status: req.status || 'pending',
            reason: req.reason || '',
            location: req.location || '',
            description: req.description || req.notes || '',
            attendees: req.attendees || '',
            reminders: req.reminders || ['15'],
            recurrence: req.recurrence || 'none',
            tags: req.tags || [],
            priority: req.priority || 'medium',
            requesterCalendarEventId: req.requesterCalendarEventId,
            calendarEventIdsByEmail: req.calendarEventIdsByEmail || {},
            archived: req.archived,
            otherSubType: req.otherSubType,
            otherCustomLabel: req.otherCustomLabel
          }));
          setLeaveRequests(prev => [...formattedRequests, ...prev.filter(r => !requests.find(fr => fr.id === r.id))]);
        }
      } catch (error) {
        console.error('Error loading leave requests from Firestore:', error);
      }
    };

    loadLeaveRequests();
  }, [currentUser?.email]);

  // Load team members from Firestore; only load leave balances for time-off admins
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        if (isTimeOffAdmin) {
          const users = await firestoreService.getAllUsersWithLeaveBalances();
          if (users && users.length > 0) {
            const formattedMembers = users.map((user, index) => ({
              id: index + 1,
              name: user.displayName || user.email?.split('@')[0] || 'Unknown',
              email: user.email,
              avatar: (user.displayName || user.email || 'U').charAt(0).toUpperCase(),
              position: user.position || user.role || 'Team Member',
              department: user.department || 'General',
              totalVacationDays: user.leaveBalances?.vacation?.total || 15,
              usedVacationDays: user.leaveBalances?.vacation?.used || 0,
              totalSickDays: user.leaveBalances?.sick?.total || 10,
              usedSickDays: user.leaveBalances?.sick?.used || 0
            }));
            setTeamMembers(formattedMembers);
          }
        } else {
          const users = await firestoreService.getApprovedUsers();
          if (users && users.length > 0) {
            setTeamMembers(users.map((user, index) => ({
              id: index + 1,
              name: user.displayName || user.email?.split('@')[0] || 'Unknown',
              email: user.email,
              avatar: (user.displayName || user.email || 'U').charAt(0).toUpperCase(),
              position: user.position || user.role || 'Team Member',
              department: user.department || 'General'
            })));
          }
        }
      } catch (error) {
        console.error('Error loading team members:', error);
        setTeamMembers([]);
      }
    };

    loadTeamMembers();
  }, [isTimeOffAdmin]);

  // Handle approve leave request with notes and notifications
  const handleApproveRequest = async (requestId, notes = '') => {
    console.log('📝 handleApproveRequest called with ID:', requestId);
    
    if (!requestId) {
      console.error('❌ No request ID provided');
      toast.error('Error: No request ID');
      return;
    }
    
    setModalLoading(true);
    toast.loading('Processing approval...', { id: 'approve-request' });
    
    try {
      // Find the request to get employee info
      const request = leaveRequests.find(r => r.id === requestId);
      console.log('📋 Found request:', request);
      
      if (!request) {
        console.error('❌ Request not found in local state');
        toast.dismiss('approve-request');
        toast.error('Request not found');
        return;
      }
      
      // Use enhanced method with history tracking
      console.log('📤 Updating status in Firestore...');
      await firestoreService.updateLeaveRequestStatusEnhanced(requestId, 'approved', currentUser?.email, notes);
      console.log('✅ Firestore updated successfully');
      
      // Deduct from employee's leave balance
      try {
        await firestoreService.deductLeaveBalance(
          request.employeeId || request.employeeEmail,
          request.type,
          request.days || 1,
          requestId
        );
        console.log('✅ Leave balance deducted');
      } catch (balanceError) {
        console.warn('⚠️ Could not deduct balance:', balanceError);
      }
      
      // Send notification to employee
      try {
        await timeOffNotifications.notifyApproved(request, currentUser?.email);
        console.log('✅ Notification sent');
      } catch (notifError) {
        console.warn('⚠️ Could not send notification:', notifError);
      }
      
      // Add to Google Calendar for vacation/sick/other, when approver is Michelle or Matthew (or requester)
      const syncsToCalendar = request.type === 'vacation' || request.type === 'sick' || request.type === 'other';
      const approverGetsCalendarSync = currentUser?.email && LEAVE_CALENDAR_SYNC_EMAILS.includes(currentUser.email.toLowerCase());
      if (isGoogleConnected && syncsToCalendar && approverGetsCalendarSync) {
        try {
          const result = await googleCalendarService.createLeaveEvent(request);
          if (result?.id) {
            await firestoreService.setLeaveRequestCalendarEventIdForEmail(requestId, currentUser.email, result.id);
          }
          toast.dismiss('approve-request');
          toast.success('Leave approved & added to your Google Calendar!');
        } catch (calError) {
          console.warn('⚠️ Failed to sync to Google Calendar:', calError);
          toast.dismiss('approve-request');
          if (calError.message?.includes('expired') || calError.message?.includes('reconnect')) {
            setIsGoogleConnected(false);
            toast.success('Leave approved! (Calendar session expired - please reconnect)');
          } else {
            toast.success('Leave approved (calendar sync failed)');
          }
        }
      } else {
        toast.dismiss('approve-request');
        toast.success('Leave request approved!');
      }
      
      // Update local state
      setLeaveRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, status: 'approved', managerNotes: notes } : req)
      );
      setShowNotesModal(null);
      setApprovalNotes('');
      
      // Refresh Google Calendar events if connected
      if (isGoogleConnected) {
        loadGoogleCalendarEvents();
      }
    } catch (error) {
      console.error('❌ Error approving request:', error);
      toast.dismiss('approve-request');
      toast.error(`Failed to approve: ${error.message || 'Unknown error'}`);
    } finally {
      setModalLoading(false);
      setProcessingRequest(null);
    }
  };

  // Handle reject leave request with reason and notifications
  const handleRejectRequest = async (requestId, reason = '') => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setModalLoading(true);
    toast.loading('Processing rejection...', { id: 'reject-request' });
    
    try {
      // Find the request to get employee info
      const request = leaveRequests.find(r => r.id === requestId);
      
      // Use enhanced method with history tracking
      await firestoreService.updateLeaveRequestStatusEnhanced(requestId, 'rejected', currentUser?.email, reason);
      
      // Send notification to employee
      if (request) {
        try {
          await timeOffNotifications.notifyRejected(request, currentUser?.email, reason);
        } catch (notifError) {
          console.warn('⚠️ Could not send notification:', notifError);
        }
      }
      
      setLeaveRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, status: 'rejected', managerNotes: reason } : req)
      );
      toast.dismiss('reject-request');
      toast.success('Leave request rejected');
      setShowNotesModal(null);
      setApprovalNotes('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.dismiss('reject-request');
      toast.error(`Failed to reject: ${error.message || 'Unknown error'}`);
    } finally {
      setModalLoading(false);
      setProcessingRequest(null);
    }
  };
  
  // Open notes modal for approve/reject with reason
  const openNotesModal = (requestId, action) => {
    setProcessingRequest(requestId);
    setShowNotesModal(action);
    setApprovalNotes('');
  };

  // Archive a leave request
  const handleArchiveRequest = async (requestId) => {
    setArchiving(requestId);
    try {
      await firestoreService.archiveLeaveRequest(requestId, currentUser.email);
      setLeaveRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, archived: true } : req)
      );
      toast.success('Request archived');
    } catch (error) {
      console.error('Error archiving request:', error);
      toast.error('Failed to archive request');
    } finally {
      setArchiving(null);
    }
  };

  // Unarchive a leave request
  const handleUnarchiveRequest = async (requestId) => {
    setArchiving(requestId);
    try {
      await firestoreService.unarchiveLeaveRequest(requestId, currentUser.email);
      setLeaveRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, archived: false } : req)
      );
      toast.success('Request restored');
    } catch (error) {
      console.error('Error restoring request:', error);
      toast.error('Failed to restore request');
    } finally {
      setArchiving(null);
    }
  };

  // Permanently delete a leave request
  const handleDeleteRequest = async (requestId) => {
    setDeleting(requestId);
    try {
      await firestoreService.deleteLeaveRequest(requestId);
      setLeaveRequests(prev => prev.filter(req => req.id !== requestId));
      toast.success('Request permanently deleted');
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    } finally {
      setDeleting(null);
    }
  };

  // Open edit modal for an approved request (any admin)
  const openEditLeaveModal = (request) => {
    if (request.status !== 'approved') return;
    setEditingLeaveRequest(request);
    setEditLeaveForm({
      startDate: request.startDate || '',
      endDate: request.endDate || '',
      days: request.days ?? calculateBusinessDays(request.startDate, request.endDate),
      type: request.type || 'vacation',
      reason: request.reason || '',
      notes: request.description || request.notes || '',
      managerNotes: request.managerNotes || '',
      otherSubType: request.otherSubType || '',
      otherCustomLabel: request.otherCustomLabel || ''
    });
    setShowEditLeaveModal(true);
  };

  const handleEditLeaveFormChange = (field, value) => {
    setEditLeaveForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'type' && value !== 'other') {
        next.otherSubType = '';
        next.otherCustomLabel = '';
      }
      if ((field === 'startDate' || field === 'endDate') && next.startDate && next.endDate) {
        next.days = calculateBusinessDays(next.startDate, next.endDate);
      }
      return next;
    });
  };

  const handleSaveEditLeave = async () => {
    if (!editingLeaveRequest?.id || !currentUser?.email) return;
    setSavingEditLeave(true);
    try {
      const days = editLeaveForm.days ?? calculateBusinessDays(editLeaveForm.startDate, editLeaveForm.endDate);
      await firestoreService.updateLeaveRequestApproved(
        editingLeaveRequest.id,
        { ...editLeaveForm, days },
        currentUser.email
      );
      const updatedRequest = { ...editingLeaveRequest, ...editLeaveForm, days };
      await timeOffNotifications.notifyLeaveRequestEdited(updatedRequest, currentUser.email, 'Dates or details were changed.');
      // Update Google Calendar event for this admin (Michelle/Matthew) if they have one
      const eventId = (editingLeaveRequest.calendarEventIdsByEmail || {})[currentUser.email];
      if (eventId && LEAVE_CALENDAR_SYNC_EMAILS.includes(currentUser.email.toLowerCase()) && (updatedRequest.type === 'vacation' || updatedRequest.type === 'sick' || updatedRequest.type === 'other')) {
        try {
          if (googleCalendarService.getConnectionStatus().isConnected) {
            await googleCalendarService.updateLeaveEvent(updatedRequest, eventId);
          }
        } catch (calErr) {
          console.warn('Calendar event update failed:', calErr);
        }
      }
      setLeaveRequests((prev) =>
        prev.map((r) => (r.id === editingLeaveRequest.id ? { ...r, ...editLeaveForm, days } : r))
      );
      toast.success('Leave request updated. Requester will be notified.');
      setShowEditLeaveModal(false);
      setEditingLeaveRequest(null);
    } catch (error) {
      console.error('Error saving leave edit:', error);
      toast.error(error.message || 'Failed to update request');
    } finally {
      setSavingEditLeave(false);
    }
  };

  // Filter requests based on archive status
  const activeRequests = leaveRequests.filter(r => !r.archived);
  const archivedRequests = leaveRequests.filter(r => r.archived);

  const handleExport = () => {
    const rows = leaveRequests.map(r => ({
      Employee: (r.employeeName || '').replace(/"/g, '""'),
      Type: getLeaveTypeLabel(r),
      'Start Date': r.startDate,
      'End Date': r.endDate,
      Days: r.days ?? '',
      Status: r.status,
      Reason: (r.reason || r.description || '').replace(/"/g, '""')
    }));
    const headers = ['Employee', 'Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'];
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr-calendar-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  };
  const displayRequests = showArchived ? archivedRequests : activeRequests;

  // Form handling functions
  const handleFormChange = (field, value) => {
    setLeaveForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (field, value) => {
    setLeaveForm(prev => ({ 
      ...prev, 
      [field]: value,
      // Auto-calculate days if both dates are set
      days: field === 'endDate' && prev.startDate ? 
        differenceInDays(new Date(value), new Date(prev.startDate)) + 1 : 
        prev.days
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newRequest = {
      id: Date.now(),
      ...leaveForm,
      days: differenceInDays(new Date(leaveForm.endDate), new Date(leaveForm.startDate)) + 1,
      status: 'pending',
      tags: [leaveForm.type, 'pending']
    };

    setLeaveRequests(prev => [...prev, newRequest]);
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setLeaveForm({
      employeeId: '',
      employeeName: '',
      type: 'vacation',
      startDate: '',
      endDate: '',
      startTime: '09:00',
      endTime: '17:00',
      isAllDay: true,
      reason: '',
      location: '',
      description: '',
      attendees: '',
      reminders: ['15'],
      recurrence: 'none',
      recurrenceEndDate: '',
      tags: [],
      priority: 'medium',
      otherSubType: '',
      otherCustomLabel: ''
    });
  };

  const openAddModal = () => {
    setShowAddModal(true);
  };

  // Check existing connection (doesn't trigger OAuth popup)
  const checkGoogleCalendarConnection = async () => {
    try {
      if (!currentUser?.email) return;
      
      setIsLoadingGoogle(true);
      
      // Check if already connected
      const status = googleCalendarService.getConnectionStatus();
      if (status.isConnected) {
        setIsGoogleConnected(true);
        await loadGoogleCalendarEvents();
        return;
      }
      
      // Try to auto-reconnect with stored token (no popup)
      if (status.hasStoredToken || googleCalendarService.hasStoredSession(currentUser.email)) {
        console.log('🔄 Attempting auto-reconnect to Google Calendar...');
        const reconnected = await googleCalendarService.tryAutoReconnect(currentUser.email);
        setIsGoogleConnected(reconnected);
        
        if (reconnected) {
          console.log('✅ Auto-reconnected to Google Calendar');
          await loadGoogleCalendarEvents();
        } else {
          console.log('⚠️ Auto-reconnect failed, user needs to re-authorize');
        }
      } else {
        setIsGoogleConnected(false);
      }
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
      setIsGoogleConnected(false);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  // Explicitly connect/authorize Google Calendar (triggers OAuth popup)
  const connectGoogleCalendar = async () => {
    try {
      if (!currentUser?.email) {
        toast.error('Please log in first to connect Google Calendar.');
        return;
      }
      
      setIsLoadingGoogle(true);
      toast.loading('Opening Google authorization...', { id: 'google-auth' });
      
      // This will trigger the OAuth popup
      await googleCalendarService.authorize(currentUser.email);
      
      toast.dismiss('google-auth');
      toast.success('🎉 Google Calendar connected successfully!');
      setIsGoogleConnected(true);
      
      // Load events after successful connection
      await loadGoogleCalendarEvents();
      
    } catch (error) {
      toast.dismiss('google-auth');
      console.error('Failed to connect Google Calendar:', error);
      
      if (error.message?.includes('popup_closed')) {
        toast.error('Authorization cancelled. Please try again.');
      } else if (error.message?.includes('access_denied')) {
        toast.error('Access denied. Please grant calendar permissions.');
      } else {
        toast.error(`Failed to connect: ${error.message || 'Unknown error'}`);
      }
      setIsGoogleConnected(false);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  // Disconnect Google Calendar
  const disconnectGoogleCalendar = async () => {
    try {
      await googleCalendarService.signOut();
      setIsGoogleConnected(false);
      setGoogleEvents([]);
      toast.success('Google Calendar disconnected');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect Google Calendar');
    }
  };

  const loadGoogleCalendarEvents = async () => {
    try {
      const events = await googleCalendarService.getEvents();
      setGoogleEvents(events);
    } catch (error) {
      console.error('Failed to load Google Calendar events:', error);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    // You can add logic here to show events for the selected date
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    // You can add logic here to show event details
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
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getRoleSpecificStats = () => {
    return [
      { label: 'Team Members', value: teamMembers.length, icon: Users, color: 'blue' },
      { label: 'Pending Requests', value: leaveRequests.filter(req => req.status === 'pending').length, icon: Clock, color: 'yellow' },
      { label: 'Google Calendar Events', value: googleEvents.length, icon: CalendarIcon, color: 'green' },
      { label: 'Leave Requests', value: leaveRequests.length, icon: User, color: 'purple' }
    ];
  };

  // Apply archive filter first, then status/type filter
  const baseRequests = showArchived ? archivedRequests : activeRequests;
  const filteredRequests = filterType === 'all' 
    ? baseRequests 
    : filterType === 'pending' || filterType === 'approved' || filterType === 'rejected'
      ? baseRequests.filter(req => req.status === filterType)
      : baseRequests.filter(req => req.type === filterType);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">HR Calendar</h1>
          <p className="text-[15px] sm:text-[17px] text-[#86868b] mt-1">Track team leave, vacation days, and sync with Google Calendar</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={checkGoogleCalendarConnection}
            disabled={isLoadingGoogle}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingGoogle ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Leave</span>
          </button>
        </div>
      </div>

      {/* Google Calendar Connection Status */}
      <div className={`rounded-2xl border p-5 ${isGoogleConnected ? 'border-[#34c759]/30 bg-[#34c759]/5' : 'border-[#0071e3]/30 bg-[#0071e3]/5'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full ${isGoogleConnected ? 'bg-[#34c759]/10' : 'bg-[#0071e3]/10'}`}>
              <CalendarIcon className={`w-5 h-5 ${isGoogleConnected ? 'text-[#34c759]' : 'text-[#0071e3]'}`} />
            </div>
            <div>
              <h3 className="text-[14px] font-medium text-[#1d1d1f] dark:text-white flex items-center gap-2">
                Google Calendar 
                {isGoogleConnected && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#34c759]/10 text-[#34c759]">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </span>
                )}
              </h3>
              <p className="text-[12px] text-[#86868b] mt-0.5">
                {isGoogleConnected 
                  ? `${googleEvents.length} events synced • Approved leave will sync to your calendar`
                  : 'Connect to sync events and automatically add approved leave to your calendar'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isGoogleConnected ? (
              <>
                <button 
                  onClick={async () => {
                    setIsLoadingGoogle(true);
                    await loadGoogleCalendarEvents();
                    setIsLoadingGoogle(false);
                    toast.success('Calendar refreshed');
                  }}
                  disabled={isLoadingGoogle}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGoogle ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button 
                  onClick={disconnectGoogleCalendar}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button 
                onClick={connectGoogleCalendar}
                disabled={isLoadingGoogle}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
              >
                {isLoadingGoogle ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Connect Google Calendar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {getRoleSpecificStats().map((stat, index) => {
          const Icon = stat.icon;
          const colorMap = {
            blue: { bg: 'bg-[#0071e3]/10', text: 'text-[#0071e3]' },
            yellow: { bg: 'bg-[#ff9500]/10', text: 'text-[#ff9500]' },
            green: { bg: 'bg-[#34c759]/10', text: 'text-[#34c759]' },
            purple: { bg: 'bg-[#af52de]/10', text: 'text-[#af52de]' }
          };
          const colors = colorMap[stat.color] || colorMap.blue;
          return (
            <div key={index} className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[#86868b] mb-1">{stat.label}</p>
                  <p className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-full ${colors.bg}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Requests - Moved to top for quick admin access */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">
                {showArchived ? 'Archived Requests' : 'Leave Requests'}
              </span>
              {!showArchived && activeRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#ff9500]/10 text-[#ff9500] font-medium">
                  {activeRequests.filter(r => r.status === 'pending').length} Pending
                </span>
              )}
            </div>
            {archivedRequests.length > 0 && (
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors bg-black/5 dark:bg-white/10 text-[#86868b] hover:bg-black/10 dark:hover:bg-white/15"
              >
                {showArchived ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Show Active ({activeRequests.length})
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    Show Archived ({archivedRequests.length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            <button 
              onClick={() => setFilterType('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                filterType === 'all' 
                  ? 'bg-[#0071e3] text-white' 
                  : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              All ({leaveRequests.length})
            </button>
            <button 
              onClick={() => setFilterType('pending')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                filterType === 'pending' 
                  ? 'bg-[#ff9500] text-white' 
                  : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending ({leaveRequests.filter(r => r.status === 'pending').length})
            </button>
            <button 
              onClick={() => setFilterType('approved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                filterType === 'approved' 
                  ? 'bg-[#34c759] text-white' 
                  : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              Approved ({leaveRequests.filter(r => r.status === 'approved').length})
            </button>
            <button 
              onClick={() => setFilterType('vacation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                filterType === 'vacation' 
                  ? 'bg-[#0071e3] text-white' 
                  : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
              }`}
            >
              <Plane className="w-3.5 h-3.5" />
              Vacation
            </button>
            <button 
              onClick={() => setFilterType('sick')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                filterType === 'sick' 
                  ? 'bg-[#ff3b30] text-white' 
                  : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Sick
            </button>
            <button 
              onClick={() => setFilterType('remote')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                filterType === 'remote' 
                  ? 'bg-[#34c759] text-white' 
                  : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              Remote
            </button>
            <button 
              onClick={() => setFilterType('other')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                filterType === 'other' 
                  ? 'bg-indigo-500 text-white' 
                  : 'bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Other
            </button>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto mb-2 text-[#86868b] opacity-50" />
              <p className="text-[14px] text-[#86868b]">No leave requests found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div 
                  key={request.id} 
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl transition-colors gap-3
                    ${request.status === 'pending' 
                      ? 'bg-[#ff9500]/5 border border-[#ff9500]/20' 
                      : 'bg-black/[0.02] dark:bg-white/5 border border-transparent hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      request.type === 'vacation' 
                        ? 'bg-[#0071e3]/10' 
                        : request.type === 'sick' 
                          ? 'bg-[#ff3b30]/10' 
                          : request.type === 'remote'
                            ? 'bg-[#34c759]/10'
                            : request.type === 'other'
                              ? 'bg-indigo-500/10'
                              : 'bg-[#86868b]/10'
                    }`}>
                      {request.type === 'vacation' 
                        ? <Plane className="w-5 h-5 text-[#0071e3]" /> 
                        : request.type === 'sick' 
                          ? <Heart className="w-5 h-5 text-[#ff3b30]" />
                          : request.type === 'remote'
                            ? <Laptop className="w-5 h-5 text-[#34c759]" />
                            : request.type === 'other'
                              ? <Tag className="w-5 h-5 text-indigo-500" />
                              : <CalendarIcon className="w-5 h-5 text-[#86868b]" />
                      }
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{request.employeeName}</p>
                      <p className="text-[12px] text-[#86868b]">
                        {getLeaveTypeLabel(request)} · {request.startDate} - {request.endDate} ({request.days} days)
                      </p>
                      {request.reason && <p className="text-[12px] text-[#86868b] mt-0.5">{request.reason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-11 sm:ml-0">
                    <span className={`text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1 ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      <span className="capitalize">{request.status}</span>
                    </span>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openNotesModal(request.id, 'approve')}
                          disabled={processingRequest === request.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#34c759] text-white text-[12px] font-medium hover:bg-[#2db14e] transition-colors disabled:opacity-50"
                        >
                          {processingRequest === request.id ? 'Processing...' : <><Check className="w-3.5 h-3.5" /> Approve</>}
                        </button>
                        <button 
                          onClick={() => openNotesModal(request.id, 'reject')}
                          disabled={processingRequest === request.id}
                          className="px-3 py-1.5 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                    {/* Edit approved (anyone who can manage leave) */}
                    {request.status === 'approved' && canManageLeave && (
                      <button
                        onClick={() => openEditLeaveModal(request)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#0071e3]/10 text-[#0071e3] text-[12px] font-medium hover:bg-[#0071e3]/20 transition-colors"
                        title="Edit request"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                    {/* Archive/Unarchive Button */}
                    {request.status !== 'pending' && (
                      <button 
                        onClick={() => request.archived 
                          ? handleUnarchiveRequest(request.id) 
                          : handleArchiveRequest(request.id)
                        }
                        disabled={archiving === request.id}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 ${
                          request.archived 
                            ? 'bg-[#34c759]/10 text-[#34c759] hover:bg-[#34c759]/20'
                            : 'bg-black/5 dark:bg-white/10 text-[#86868b] hover:bg-black/10 dark:hover:bg-white/15'
                        }`}
                        title={request.archived ? 'Restore' : 'Archive'}
                      >
                        {archiving === request.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : request.archived ? (
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    
                    {/* Delete Button (only for archived requests) */}
                    {request.archived && (
                      <button 
                        onClick={() => setShowDeleteConfirm(request.id)}
                        disabled={deleting === request.id}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] text-[12px] font-medium hover:bg-[#ff3b30]/20 transition-colors disabled:opacity-50"
                        title="Delete permanently"
                      >
                        {deleting === request.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-[#ff3b30] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-md border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#ff3b30]/10 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-[#ff3b30]" />
              </div>
              <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
                Delete Request Permanently?
              </h3>
              <p className="text-[14px] text-[#86868b] mb-6">
                This action cannot be undone. The leave request will be permanently removed from the system.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteRequest(showDeleteConfirm)}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl bg-[#ff3b30] text-white text-[14px] font-medium hover:bg-[#ff453a] transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Approved Leave Modal */}
      {showEditLeaveModal && editingLeaveRequest && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-lg border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="border-b border-black/5 dark:border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Edit Leave Request</h2>
                <button onClick={() => { setShowEditLeaveModal(false); setEditingLeaveRequest(null); }} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <XCircle className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
              <p className="text-[13px] text-[#86868b] mt-1">{editingLeaveRequest.employeeName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1">Start Date</label>
                  <input type="date" value={editLeaveForm.startDate} onChange={(e) => handleEditLeaveFormChange('startDate', e.target.value)} className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white text-[14px]" />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1">End Date</label>
                  <input type="date" value={editLeaveForm.endDate} onChange={(e) => handleEditLeaveFormChange('endDate', e.target.value)} min={editLeaveForm.startDate} className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white text-[14px]" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1">Type</label>
                  <select value={editLeaveForm.type} onChange={(e) => handleEditLeaveFormChange('type', e.target.value)} className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white text-[14px]">
                    <option value="vacation">Vacation</option>
                    <option value="sick">Sick</option>
                    <option value="remote">Remote</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1">Work days</label>
                  <p className="h-11 flex items-center text-[14px] font-medium text-[#0071e3]">{editLeaveForm.days}</p>
                </div>
              </div>
              {editLeaveForm.type === 'other' && (
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white">Kind of leave</label>
                  <select value={editLeaveForm.otherSubType} onChange={(e) => handleEditLeaveFormChange('otherSubType', e.target.value)} className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white text-[14px]">
                    <option value="">Select...</option>
                    <option value="bereavement">Bereavement</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="custom">Custom</option>
                  </select>
                  {editLeaveForm.otherSubType === 'custom' && (
                    <input type="text" value={editLeaveForm.otherCustomLabel} onChange={(e) => handleEditLeaveFormChange('otherCustomLabel', e.target.value)} placeholder="Custom label (optional)" className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white text-[14px]" />
                  )}
                </div>
              )}
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1">Reason</label>
                <input type="text" value={editLeaveForm.reason} onChange={(e) => handleEditLeaveFormChange('reason', e.target.value)} className="w-full h-11 px-3 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white text-[14px]" placeholder="Reason" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1">Notes / Manager notes</label>
                <textarea value={editLeaveForm.managerNotes || editLeaveForm.notes} onChange={(e) => { handleEditLeaveFormChange('managerNotes', e.target.value); handleEditLeaveFormChange('notes', e.target.value); }} rows={2} className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white text-[14px] resize-none" placeholder="Optional" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowEditLeaveModal(false); setEditingLeaveRequest(null); }} className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium">Cancel</button>
                <button type="button" onClick={handleSaveEditLeave} disabled={savingEditLeave} className="px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50">{savingEditLeave ? 'Saving...' : 'Save & notify requester'}</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* View Member Details Modal */}
      {viewingMember && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] border-b border-black/5 dark:border-white/10 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0071e3] to-[#5856d6] rounded-full flex items-center justify-center text-white text-[15px] font-medium">
                    {viewingMember.avatar}
                  </div>
                  <div>
                    <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">{viewingMember.name}</h2>
                    <p className="text-[13px] text-[#86868b]">{viewingMember.position} • {viewingMember.department}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingMember(null)}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {isTimeOffAdmin && viewingMember.totalVacationDays != null && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl bg-[#0071e3]/5 border border-[#0071e3]/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="w-4 h-4 text-[#0071e3]" />
                    <span className="text-[13px] font-medium text-[#0071e3]">Vacation Days</span>
                  </div>
                  <p className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white">
                    {viewingMember.totalVacationDays - viewingMember.usedVacationDays}
                    <span className="text-[14px] text-[#86868b] font-normal ml-1">remaining</span>
                  </p>
                  <p className="text-[12px] text-[#86868b] mt-1">
                    {viewingMember.usedVacationDays} used of {viewingMember.totalVacationDays} total
                  </p>
                  <div className="mt-2 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0071e3] rounded-full" 
                      style={{ width: `${(viewingMember.usedVacationDays / viewingMember.totalVacationDays) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-[#ff3b30]/5 border border-[#ff3b30]/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-[#ff3b30]" />
                    <span className="text-[13px] font-medium text-[#ff3b30]">Sick Days</span>
                  </div>
                  <p className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white">
                    {viewingMember.totalSickDays - viewingMember.usedSickDays}
                    <span className="text-[14px] text-[#86868b] font-normal ml-1">remaining</span>
                  </p>
                  <p className="text-[12px] text-[#86868b] mt-1">
                    {viewingMember.usedSickDays} used of {viewingMember.totalSickDays} total
                  </p>
                  <div className="mt-2 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#ff3b30] rounded-full" 
                      style={{ width: `${(viewingMember.usedSickDays / viewingMember.totalSickDays) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              )}
              {/* Leave Request History */}
              <div>
                <h3 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white mb-3">Leave Request History</h3>
                {(() => {
                  const memberRequests = leaveRequests.filter(
                    r => r.employeeEmail === viewingMember.email || r.employeeId === viewingMember.email
                  );
                  
                  if (memberRequests.length === 0) {
                    return (
                      <div className="text-center py-8 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                        <CalendarIcon className="w-10 h-10 text-[#86868b] mx-auto mb-2 opacity-50" />
                        <p className="text-[14px] text-[#86868b]">No leave requests found</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-2">
                      {memberRequests.map(request => (
                        <div 
                          key={request.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            request.status === 'pending' 
                              ? 'bg-[#ff9500]/5 border-[#ff9500]/20' 
                              : request.status === 'approved'
                                ? 'bg-[#34c759]/5 border-[#34c759]/20'
                                : request.status === 'rejected'
                                  ? 'bg-[#ff3b30]/5 border-[#ff3b30]/20'
                                  : 'bg-black/[0.02] dark:bg-white/5 border-black/5 dark:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              request.type === 'vacation' 
                                ? 'bg-[#0071e3]/10' 
                                : request.type === 'sick'
                                  ? 'bg-[#ff3b30]/10'
                                  : request.type === 'remote'
                                    ? 'bg-[#34c759]/10'
                                    : request.type === 'other'
                                      ? 'bg-indigo-500/10'
                                      : 'bg-[#86868b]/10'
                            }`}>
                              {request.type === 'vacation' 
                                ? <Plane className="w-4 h-4 text-[#0071e3]" />
                                : request.type === 'sick'
                                  ? <Heart className="w-4 h-4 text-[#ff3b30]" />
                                  : request.type === 'remote'
                                    ? <Laptop className="w-4 h-4 text-[#34c759]" />
                                    : request.type === 'other'
                                      ? <Tag className="w-4 h-4 text-indigo-500" />
                                      : <CalendarIcon className="w-4 h-4 text-[#86868b]" />
                              }
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{getLeaveTypeLabel(request)}</p>
                              <p className="text-[12px] text-[#86868b]">
                                {request.startDate} - {request.endDate} ({request.days} days)
                              </p>
                              {request.reason && (
                                <p className="text-[11px] text-[#86868b] mt-0.5">{request.reason}</p>
                              )}
                            </div>
                          </div>
                          <span className={`text-[11px] px-2 py-1 rounded-md font-medium capitalize ${
                            request.status === 'approved' 
                              ? 'bg-[#34c759]/10 text-[#34c759]'
                              : request.status === 'pending'
                                ? 'bg-[#ff9500]/10 text-[#ff9500]'
                                : request.status === 'rejected'
                                  ? 'bg-[#ff3b30]/10 text-[#ff3b30]'
                                  : 'bg-black/5 dark:bg-white/10 text-[#86868b]'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              
              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => {
                    const user = allUsers.find(u => u.email === viewingMember.email) || {
                      email: viewingMember.email,
                      displayName: viewingMember.name,
                      leaveBalances: {
                        vacation: { total: viewingMember.totalVacationDays, used: viewingMember.usedVacationDays },
                        sick: { total: viewingMember.totalSickDays, used: viewingMember.usedSickDays }
                      }
                    };
                    startEditingUser(user);
                    setShowBalanceEditor(true);
                    setViewingMember(null);
                    if (allUsers.length === 0) {
                      loadUsersWithBalances();
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
                >
                  Edit Balances
                </button>
                <button
                  onClick={() => setViewingMember(null)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Calendar View */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
            <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Calendar View</span>
            {isGoogleConnected && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#34c759]/10 text-[#34c759] font-medium">
                Google Calendar Synced
              </span>
            )}
          </div>
        </div>
        <div className="p-5">
          {/* Leave Type Legend */}
          <div className="mb-6 p-4 bg-black/[0.02] dark:bg-white/5 rounded-xl">
            <h4 className="text-[12px] font-medium text-[#1d1d1f] dark:text-white mb-3">Leave Type Legend</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(leaveTypes).map(([key, type]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${type.dotColor}`}></div>
                  <span className="text-[11px] text-[#86868b]">{type.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Calendar 
            events={allEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        </div>
      </div>

      {/* Team Overview - leave balance visible to time-off admins only */}
      {isTimeOffAdmin && (
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
            <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Team Leave Overview</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/10">
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Employee</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Vacation Days</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Sick Days</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.filter(m => m.totalVacationDays != null).map((member) => (
                <tr key={member.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#0071e3] to-[#5856d6] rounded-full flex items-center justify-center text-white text-[13px] font-medium">
                        {member.avatar}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{member.name}</p>
                        <p className="text-[11px] text-[#86868b]">{member.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#1d1d1f] dark:text-white">{member.department}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#86868b]">
                        {member.usedVacationDays}/{member.totalVacationDays}
                      </span>
                      <div className="w-16 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#34c759] rounded-full" 
                          style={{ width: `${(member.usedVacationDays / member.totalVacationDays) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#86868b]">
                        {member.usedSickDays}/{member.totalSickDays}
                      </span>
                      <div className="w-16 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#ff3b30] rounded-full" 
                          style={{ width: `${(member.usedSickDays / member.totalSickDays) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          // Find matching user in allUsers or use member data
                          const user = allUsers.find(u => u.email === member.email) || {
                            email: member.email,
                            displayName: member.name,
                            leaveBalances: {
                              vacation: { total: member.totalVacationDays, used: member.usedVacationDays },
                              sick: { total: member.totalSickDays, used: member.usedSickDays }
                            }
                          };
                          startEditingUser(user);
                          setShowBalanceEditor(true);
                          if (allUsers.length === 0) {
                            loadUsersWithBalances();
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#0071e3]/10 text-[#0071e3] text-[12px] font-medium hover:bg-[#0071e3]/20 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setViewingMember(member)}
                        className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Admin: Team Leave Balances */}
      {isTimeOffAdmin && (
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Team Leave Balances</span>
            </div>
            <button
              onClick={() => {
                setShowBalanceEditor(!showBalanceEditor);
                if (!showBalanceEditor && allUsers.length === 0) {
                  loadUsersWithBalances();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              {showBalanceEditor ? 'Hide' : 'Manage Balances'}
            </button>
          </div>
          
          {showBalanceEditor && (
            <div className="p-5">
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-[14px] text-[#86868b]">Loading team members...</p>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-[#86868b] mx-auto mb-2 opacity-50" />
                  <p className="text-[14px] text-[#86868b]">No team members found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allUsers.map((user) => {
                    const balances = user.leaveBalances || {};
                    const isEditing = editingUser?.email === user.email;
                    
                    return (
                      <div 
                        key={user.email}
                        className={`p-4 rounded-xl transition-colors ${isEditing ? 'bg-[#0071e3]/5 border border-[#0071e3]/30' : 'bg-black/[0.02] dark:bg-white/5 border border-transparent hover:bg-black/5 dark:hover:bg-white/10'}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{user.displayName || user.email}</p>
                            <p className="text-[12px] text-[#86868b]">{user.email}</p>
                          </div>
                          {!isEditing && (
                            <button
                              onClick={() => startEditingUser(user)}
                              className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[12px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                            >
                              Edit Balances
                            </button>
                          )}
                        </div>
                        
                        {isEditing ? (
                          <div className="space-y-4">
                            {/* Vacation */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[12px] font-medium text-[#1d1d1f] dark:text-white mb-1">
                                  Vacation Total Days
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editBalances.vacation?.total || 0}
                                  onChange={(e) => setEditBalances(prev => ({
                                    ...prev,
                                    vacation: { ...prev.vacation, total: parseInt(e.target.value) || 0 }
                                  }))}
                                  className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                                />
                              </div>
                              <div>
                                <label className="block text-[12px] font-medium text-[#1d1d1f] dark:text-white mb-1">
                                  Vacation Used Days
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editBalances.vacation?.used || 0}
                                  onChange={(e) => setEditBalances(prev => ({
                                    ...prev,
                                    vacation: { ...prev.vacation, used: parseInt(e.target.value) || 0 }
                                  }))}
                                  className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                                />
                              </div>
                            </div>
                            
                            {/* Sick */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[12px] font-medium text-[#1d1d1f] dark:text-white mb-1">
                                  Sick Leave Total Days
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editBalances.sick?.total || 0}
                                  onChange={(e) => setEditBalances(prev => ({
                                    ...prev,
                                    sick: { ...prev.sick, total: parseInt(e.target.value) || 0 }
                                  }))}
                                  className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                                />
                              </div>
                              <div>
                                <label className="block text-[12px] font-medium text-[#1d1d1f] dark:text-white mb-1">
                                  Sick Leave Used Days
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editBalances.sick?.used || 0}
                                  onChange={(e) => setEditBalances(prev => ({
                                    ...prev,
                                    sick: { ...prev.sick, used: parseInt(e.target.value) || 0 }
                                  }))}
                                  className="w-full h-10 px-3 text-[14px] rounded-xl bg-white dark:bg-black/20 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-2">
                              <button
                                onClick={() => setEditingUser(null)}
                                disabled={savingBalances}
                                className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveUserBalances}
                                disabled={savingBalances}
                                className="px-3 py-2 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                              >
                                {savingBalances ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[11px] text-[#86868b]">Vacation</p>
                              <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                                {(balances.vacation?.total || 15) - (balances.vacation?.used || 0)} / {balances.vacation?.total || 15} days
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-[#86868b]">Sick</p>
                              <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">
                                {(balances.sick?.total || 10) - (balances.sick?.used || 0)} / {balances.sick?.total || 10} days
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leave Request Form Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] border-b border-black/5 dark:border-white/10 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Add Leave Request</h2>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee Name *
                  </label>
                  <select
                    value={leaveForm.employeeId}
                    onChange={(e) => {
                      const employee = teamMembers.find(emp => emp.id === parseInt(e.target.value));
                      handleFormChange('employeeId', e.target.value);
                      handleFormChange('employeeName', employee?.name || '');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Employee</option>
                    {teamMembers.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} - {emp.department}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Type *
                  </label>
                  <select
                    value={leaveForm.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {Object.entries(leaveTypes).map(([key, type]) => (
                      <option key={key} value={key}>
                        <div className={`w-3 h-3 rounded-full ${type.dotColor} mr-2`}></div> {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {leaveForm.type === 'other' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kind of leave</label>
                    <select value={leaveForm.otherSubType} onChange={(e) => handleFormChange('otherSubType', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-white/10 text-[#1d1d1f] dark:text-white">
                      <option value="">Select...</option>
                      <option value="bereavement">Bereavement</option>
                      <option value="maternity">Maternity Leave</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  {leaveForm.otherSubType === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom label</label>
                      <input type="text" value={leaveForm.otherCustomLabel} onChange={(e) => handleFormChange('otherCustomLabel', e.target.value)} placeholder="e.g. Jury duty" className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-white/10 text-[#1d1d1f] dark:text-white" />
                    </div>
                  )}
                </div>
              )}

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
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
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    min={leaveForm.startDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Days
                  </label>
                  <input
                    type="number"
                    value={leaveForm.days || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>

              {/* Time Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isAllDay"
                    checked={leaveForm.isAllDay}
                    onChange={(e) => handleFormChange('isAllDay', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isAllDay" className="text-sm font-medium text-gray-700">
                    All Day Event
                  </label>
                </div>
                
                {!leaveForm.isAllDay && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={leaveForm.startTime}
                        onChange={(e) => handleFormChange('startTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={leaveForm.endTime}
                        onChange={(e) => handleFormChange('endTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Description and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason *
                  </label>
                  <input
                    type="text"
                    value={leaveForm.reason}
                    onChange={(e) => handleFormChange('reason', e.target.value)}
                    placeholder="Brief reason for leave"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={leaveForm.location}
                    onChange={(e) => handleFormChange('location', e.target.value)}
                    placeholder="Where will you be?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Description
                </label>
                <textarea
                  value={leaveForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                  placeholder="Additional details about your leave request..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Advanced Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attendees
                  </label>
                  <input
                    type="text"
                    value={leaveForm.attendees}
                    onChange={(e) => handleFormChange('attendees', e.target.value)}
                    placeholder="Email addresses separated by commas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={leaveForm.priority}
                    onChange={(e) => handleFormChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(priorityLevels).map(([key, level]) => (
                      <option key={key} value={key}>{level.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recurrence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recurrence
                  </label>
                  <select
                    value={leaveForm.recurrence}
                    onChange={(e) => handleFormChange('recurrence', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {recurrenceOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                {leaveForm.recurrence !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recurrence End Date
                    </label>
                    <input
                      type="date"
                      value={leaveForm.recurrenceEndDate}
                      onChange={(e) => handleFormChange('recurrenceEndDate', e.target.value)}
                      min={leaveForm.endDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Reminders */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminders
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {reminderOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={leaveForm.reminders.includes(option.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleFormChange('reminders', [...leaveForm.reminders, option.value]);
                          } else {
                            handleFormChange('reminders', leaveForm.reminders.filter(r => r !== option.value));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
                >
                  Create Leave Request
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Approval/Rejection Notes Modal */}
      {showNotesModal && processingRequest && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full border border-black/10 dark:border-white/10 shadow-2xl">
            <div className="border-b border-black/5 dark:border-white/10 px-6 py-4">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">
                {showNotesModal === 'approve' ? '✓ Approve Request' : '✗ Reject Request'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-2">
                  {showNotesModal === 'approve' ? 'Notes (Optional)' : 'Reason for Rejection *'}
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={showNotesModal === 'approve' 
                    ? 'Add any notes for the employee...' 
                    : 'Please provide a reason for rejection...'}
                  rows={3}
                  className="w-full px-4 py-3 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] resize-none"
                  required={showNotesModal === 'reject'}
                  disabled={modalLoading}
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowNotesModal(null);
                    setProcessingRequest(null);
                    setApprovalNotes('');
                  }}
                  disabled={modalLoading}
                  className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showNotesModal === 'approve') {
                      handleApproveRequest(processingRequest, approvalNotes);
                    } else {
                      handleRejectRequest(processingRequest, approvalNotes);
                    }
                  }}
                  disabled={(showNotesModal === 'reject' && !approvalNotes.trim()) || modalLoading}
                  className={`px-4 py-2.5 rounded-xl text-white text-[14px] font-medium transition-colors disabled:opacity-50 ${
                    showNotesModal === 'approve' 
                      ? 'bg-[#34c759] hover:bg-[#2db14e]' 
                      : 'bg-[#ff3b30] hover:bg-[#e5342b]'
                  }`}
                >
                  {modalLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    showNotesModal === 'approve' ? 'Approve' : 'Reject'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HRCalendar;
