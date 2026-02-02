import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Calendar from '../components/ui/calendar';
import { googleCalendarService } from '../services/googleCalendarService';
import { toast } from 'react-hot-toast';
import { PERMISSIONS } from '../entities/Permissions';
import { firestoreService } from '../services/firestoreService';
import { timeOffNotifications } from '../services/timeOffNotificationService';
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
  Tag
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Admin balance editor state
  const [showBalanceEditor, setShowBalanceEditor] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editBalances, setEditBalances] = useState({
    vacation: { total: 15, used: 0 },
    sick: { total: 10, used: 0 },
    personal: { total: 3, used: 0 }
  });
  const [savingBalances, setSavingBalances] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
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
      sick: { total: 10, used: 0 },
      personal: { total: 3, used: 0 }
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
    priority: 'medium'
  });

  // Leave requests state - loaded from Firestore
  const [leaveRequests, setLeaveRequests] = useState([]);

  // Leave type definitions with colors
  const leaveTypes = {
    vacation: { label: 'Vacation', color: 'bg-blue-100 text-blue-800', dotColor: 'bg-blue-500' },
    sick: { label: 'Sick Leave', color: 'bg-red-100 text-red-800', dotColor: 'bg-red-500' },
    personal: { label: 'Personal Time', color: 'bg-purple-100 text-purple-800', dotColor: 'bg-purple-500' },
    bereavement: { label: 'Bereavement', color: 'bg-gray-100 text-gray-800', dotColor: 'bg-gray-500' },
    other: { label: 'Other', color: 'bg-indigo-100 text-indigo-800', dotColor: 'bg-indigo-500' }
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
      title: `${request.employeeName} - ${leaveTypes[request.type]?.label || request.type}`,
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
            employeeId: req.employeeId || req.userEmail,
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
            priority: req.priority || 'medium'
          }));
          setLeaveRequests(prev => [...formattedRequests, ...prev.filter(r => !requests.find(fr => fr.id === r.id))]);
        }
      } catch (error) {
        console.error('Error loading leave requests from Firestore:', error);
      }
    };

    loadLeaveRequests();
  }, [currentUser?.email]);

  // Handle approve leave request with notes and notifications
  const handleApproveRequest = async (requestId, notes = '') => {
    setProcessingRequest(requestId);
    try {
      // Find the request to get employee info
      const request = leaveRequests.find(r => r.id === requestId);
      
      // Use enhanced method with history tracking
      await firestoreService.updateLeaveRequestStatusEnhanced(requestId, 'approved', currentUser?.email, notes);
      
      // Deduct from employee's leave balance
      if (request) {
        await firestoreService.deductLeaveBalance(
          request.employeeId || request.employeeEmail,
          request.type,
          request.days || 1,
          requestId
        );
        
        // Send notification to employee
        await timeOffNotifications.notifyApproved(request, currentUser?.email);
      }
      
      setLeaveRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, status: 'approved', managerNotes: notes } : req)
      );
      toast.success('Leave request approved');
      setShowNotesModal(null);
      setApprovalNotes('');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Handle reject leave request with reason and notifications
  const handleRejectRequest = async (requestId, reason = '') => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setProcessingRequest(requestId);
    try {
      // Find the request to get employee info
      const request = leaveRequests.find(r => r.id === requestId);
      
      // Use enhanced method with history tracking
      await firestoreService.updateLeaveRequestStatusEnhanced(requestId, 'rejected', currentUser?.email, reason);
      
      // Send notification to employee
      if (request) {
        await timeOffNotifications.notifyRejected(request, currentUser?.email, reason);
      }
      
      setLeaveRequests(prev => 
        prev.map(req => req.id === requestId ? { ...req, status: 'rejected', managerNotes: reason } : req)
      );
      toast.success('Leave request rejected');
      setShowNotesModal(null);
      setApprovalNotes('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };
  
  // Open notes modal for approve/reject with reason
  const openNotesModal = (requestId, action) => {
    setProcessingRequest(requestId);
    setShowNotesModal(action);
    setApprovalNotes('');
  };

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
      priority: 'medium'
    });
  };

  const openAddModal = () => {
    setShowAddModal(true);
  };

  const checkGoogleCalendarConnection = async () => {
    try {
      console.log('🔄 Starting Google Calendar connection...');
      console.log('API Key available:', !!process.env.REACT_APP_GOOGLE_API_KEY);
      console.log('Client ID available:', !!process.env.REACT_APP_GOOGLE_CLIENT_ID);
      console.log('Current user:', currentUser?.email);
      
      if (!currentUser?.email) {
        toast.error('User email not available. Please log in again.');
        return;
      }
      
      setIsLoadingGoogle(true);
      
      const isConnected = await googleCalendarService.initialize(currentUser.email);
      console.log('✅ Google Calendar initialized:', isConnected);
      
      setIsGoogleConnected(isConnected);
      
      if (isConnected) {
        console.log('📅 Loading Google Calendar events...');
        await loadGoogleCalendarEvents();
        toast.success('📅 Google Calendar connected successfully!');
      } else {
        toast.error('Failed to connect to Google Calendar. Please try again.');
      }
    } catch (error) {
      console.error('❌ Failed to connect to Google Calendar:', error);
      console.error('Error details:', error.message, error.stack);
      setIsGoogleConnected(false);
      toast.error(`Failed to connect Google Calendar: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoadingGoogle(false);
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

  const filteredRequests = filterType === 'all' 
    ? leaveRequests 
    : leaveRequests.filter(req => req.type === filterType);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Calendar</h1>
          <p className="text-gray-600 mt-2">Track team leave, vacation days, and sync with Google Calendar</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            className="flex items-center space-x-2"
            onClick={checkGoogleCalendarConnection}
            disabled={isLoadingGoogle}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingGoogle ? 'animate-spin' : ''}`} />
            <span>Sync Calendar</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
          <Button className="flex items-center space-x-2" onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            <span>Add Leave Request</span>
          </Button>
        </div>
      </div>

      {/* Google Calendar Connection Status */}
      <Card className={`border-2 ${isGoogleConnected ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
        <CardContent className="p-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CalendarIcon className={`w-5 h-5 ${isGoogleConnected ? 'text-green-600' : 'text-yellow-600'}`} />
              <div>
                <h3 className="font-medium text-gray-900">
                  Google Calendar {isGoogleConnected ? 'Connected' : 'Not Connected'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isGoogleConnected 
                    ? `${googleEvents.length} events synced from Google Calendar`
                    : 'Connect your Google Calendar to see all team events and meetings'
                  }
                </p>
              </div>
            </div>
            <Button 
              variant={isGoogleConnected ? "outline" : "default"}
              size="sm"
              onClick={checkGoogleCalendarConnection}
              disabled={isLoadingGoogle}
            >
              {isLoadingGoogle ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Connecting...
                </>
              ) : (
                isGoogleConnected ? 'Reconnect' : 'Connect'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {getRoleSpecificStats().map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 pt-8">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-${stat.color}-100 flex-shrink-0`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <span>Calendar View</span>
            {isGoogleConnected && (
              <Badge variant="secondary" className="ml-2">
                Google Calendar Synced
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Leave Type Legend */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Leave Type Legend</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(leaveTypes).map(([key, type]) => (
                <div key={key} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${type.dotColor}`}></div>
                  <span className="text-xs text-gray-600">{type.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          <Calendar 
            events={allEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        </CardContent>
      </Card>

      {/* Team Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Team Leave Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Vacation Days</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Sick Days</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {member.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{member.department}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {member.usedVacationDays}/{member.totalVacationDays}
                        </span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(member.usedVacationDays / member.totalVacationDays) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {member.usedSickDays}/{member.totalSickDays}
                        </span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${(member.usedSickDays / member.totalSickDays) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm">View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <span>Leave Requests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Button 
              variant={filterType === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button 
              variant={filterType === 'vacation' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType('vacation')}
            >
              🏖️ Vacation
            </Button>
            <Button 
              variant={filterType === 'sick' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilterType('sick')}
            >
              🏥 Sick Leave
            </Button>
          </div>

          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">
                    {request.type === 'vacation' ? '🏖️' : '🏥'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{request.employeeName}</p>
                    <p className="text-sm text-gray-500">
                      {request.startDate} - {request.endDate} ({request.days} days)
                    </p>
                    <p className="text-sm text-gray-600">{request.reason}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={`${getStatusColor(request.status)} flex items-center space-x-1`}>
                    {getStatusIcon(request.status)}
                    <span className="capitalize">{request.status}</span>
                  </Badge>
                  {request.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-green-600 hover:text-green-700"
                        onClick={() => openNotesModal(request.id, 'approve')}
                        disabled={processingRequest === request.id}
                      >
                        {processingRequest === request.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => openNotesModal(request.id, 'reject')}
                        disabled={processingRequest === request.id}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin: Team Leave Balances */}
      {isTimeOffAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Team Leave Balances</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowBalanceEditor(!showBalanceEditor);
                  if (!showBalanceEditor && allUsers.length === 0) {
                    loadUsersWithBalances();
                  }
                }}
              >
                {showBalanceEditor ? 'Hide' : 'Manage Balances'}
              </Button>
            </div>
          </CardHeader>
          
          {showBalanceEditor && (
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading team members...</p>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No team members found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allUsers.map((user) => {
                    const balances = user.leaveBalances || {};
                    const isEditing = editingUser?.email === user.email;
                    
                    return (
                      <div 
                        key={user.email}
                        className={`p-4 border rounded-lg ${isEditing ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900">{user.displayName || user.email}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          {!isEditing && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditingUser(user)}
                            >
                              Edit Balances
                            </Button>
                          )}
                        </div>
                        
                        {isEditing ? (
                          <div className="space-y-4">
                            {/* Vacation */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            
                            {/* Sick */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            
                            {/* Personal */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Personal Days Total
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editBalances.personal?.total || 0}
                                  onChange={(e) => setEditBalances(prev => ({
                                    ...prev,
                                    personal: { ...prev.personal, total: parseInt(e.target.value) || 0 }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Personal Days Used
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editBalances.personal?.used || 0}
                                  onChange={(e) => setEditBalances(prev => ({
                                    ...prev,
                                    personal: { ...prev.personal, used: parseInt(e.target.value) || 0 }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            
                            <div className="flex justify-end space-x-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(null)}
                                disabled={savingBalances}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={saveUserBalances}
                                disabled={savingBalances}
                              >
                                {savingBalances ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Vacation</p>
                              <p className="font-medium">
                                {(balances.vacation?.total || 15) - (balances.vacation?.used || 0)} / {balances.vacation?.total || 15} days
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Sick</p>
                              <p className="font-medium">
                                {(balances.sick?.total || 10) - (balances.sick?.used || 0)} / {balances.sick?.total || 10} days
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Personal</p>
                              <p className="font-medium">
                                {(balances.personal?.total || 3) - (balances.personal?.used || 0)} / {balances.personal?.total || 3} days
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Leave Request Form Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Add Leave Request</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
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
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Create Leave Request
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Approval/Rejection Notes Modal */}
      {showNotesModal && processingRequest && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {showNotesModal === 'approve' ? 'Approve Request' : 'Reject Request'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {showNotesModal === 'approve' ? 'Notes (Optional)' : 'Reason for Rejection *'}
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={showNotesModal === 'approve' 
                    ? 'Add any notes for the employee...' 
                    : 'Please provide a reason for rejection...'}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={showNotesModal === 'reject'}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNotesModal(null);
                    setProcessingRequest(null);
                    setApprovalNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className={showNotesModal === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'}
                  onClick={() => {
                    if (showNotesModal === 'approve') {
                      handleApproveRequest(processingRequest, approvalNotes);
                    } else {
                      handleRejectRequest(processingRequest, approvalNotes);
                    }
                  }}
                  disabled={showNotesModal === 'reject' && !approvalNotes.trim()}
                >
                  {showNotesModal === 'approve' ? 'Approve' : 'Reject'}
                </Button>
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
