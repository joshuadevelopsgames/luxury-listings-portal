import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Calendar from '../components/ui/calendar';
import { googleCalendarService } from '../services/googleCalendarService';
import { toast } from 'react-hot-toast';
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
  const { currentUser } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [googleEvents, setGoogleEvents] = useState([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

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

  // Mock data for team members and their leave
  const teamMembers = [
    {
      id: 1,
      name: 'Sarah Johnson',
      department: 'Marketing',
      position: 'Content Specialist',
      totalVacationDays: 20,
      usedVacationDays: 12,
      totalSickDays: 10,
      usedSickDays: 3,
      avatar: 'SJ'
    },
    {
      id: 2,
      name: 'Mike Chen',
      department: 'Sales',
      position: 'Account Manager',
      totalVacationDays: 20,
      usedVacationDays: 8,
      totalSickDays: 10,
      usedSickDays: 1,
      avatar: 'MC'
    },
    {
      id: 3,
      name: 'Emma Rodriguez',
      department: 'Design',
      position: 'UI/UX Designer',
      totalVacationDays: 20,
      usedVacationDays: 15,
      totalSickDays: 10,
      usedSickDays: 2,
      avatar: 'ER'
    },
    {
      id: 4,
      name: 'David Kim',
      department: 'Engineering',
      position: 'Frontend Developer',
      totalVacationDays: 20,
      usedVacationDays: 6,
      totalSickDays: 10,
      usedSickDays: 0,
      avatar: 'DK'
    }
  ];

  // Mock leave requests
  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: 1,
      employeeId: 1,
      employeeName: 'Sarah Johnson',
      type: 'vacation',
      startDate: '2024-01-15',
      endDate: '2024-01-19',
      startTime: '09:00',
      endTime: '17:00',
      isAllDay: true,
      days: 5,
      status: 'approved',
      reason: 'Family vacation',
      location: 'Beach Resort',
      description: 'Annual family vacation to the beach',
      attendees: '',
      reminders: ['15'],
      recurrence: 'none',
      tags: ['approved', 'vacation'],
      priority: 'medium'
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: 'Mike Chen',
      type: 'sick',
      startDate: '2024-01-10',
      endDate: '2024-01-10',
      startTime: '09:00',
      endTime: '17:00',
      isAllDay: true,
      days: 1,
      status: 'approved',
      reason: 'Doctor appointment',
      location: 'Medical Center',
      description: 'Annual checkup and consultation',
      attendees: '',
      reminders: ['15'],
      recurrence: 'none',
      tags: ['approved', 'sick'],
      priority: 'high'
    },
    {
      id: 3,
      employeeId: 3,
      employeeName: 'Emma Rodriguez',
      type: 'vacation',
      startDate: '2024-02-01',
      endDate: '2024-02-05',
      startTime: '09:00',
      endTime: '17:00',
      isAllDay: true,
      days: 5,
      status: 'pending',
      reason: 'Personal time off',
      location: 'Home',
      description: 'Personal time off for mental health day',
      attendees: '',
      reminders: ['15'],
      recurrence: 'none',
      tags: ['pending', 'vacation'],
      priority: 'medium'
    }
  ]);

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
      
      setIsLoadingGoogle(true);
      
      const isConnected = await googleCalendarService.initialize();
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
                      <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700">
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
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

      {/* Leave Request Form Modal */}
      {showAddModal && (
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
        </div>
      )}
    </div>
  );
};

export default HRCalendar;
