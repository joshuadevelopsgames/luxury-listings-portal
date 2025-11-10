import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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
  Info
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const MyTimeOff = () => {
  const { currentUser } = useAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Leave request form state
  const [leaveForm, setLeaveForm] = useState({
    type: 'vacation',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    isAllDay: true,
    reason: '',
    notes: ''
  });

  // Mock data - in production this would come from Firestore
  const leaveBalances = {
    vacation: {
      total: 20,
      used: 8,
      remaining: 12,
      pending: 3
    },
    sick: {
      total: 10,
      used: 2,
      remaining: 8,
      pending: 0
    },
    personal: {
      total: 5,
      used: 1,
      remaining: 4,
      pending: 0
    }
  };

  const [myRequests, setMyRequests] = useState([
    {
      id: 1,
      type: 'vacation',
      startDate: '2024-02-15',
      endDate: '2024-02-19',
      days: 5,
      reason: 'Family vacation to Hawaii',
      status: 'approved',
      submittedDate: '2024-01-20',
      reviewedBy: 'Matthew Rodriguez',
      reviewedDate: '2024-01-21'
    },
    {
      id: 2,
      type: 'sick',
      startDate: '2024-01-10',
      endDate: '2024-01-10',
      days: 1,
      reason: 'Doctor appointment',
      status: 'approved',
      submittedDate: '2024-01-09',
      reviewedBy: 'Matthew Rodriguez',
      reviewedDate: '2024-01-09'
    },
    {
      id: 3,
      type: 'vacation',
      startDate: '2024-03-10',
      endDate: '2024-03-12',
      days: 3,
      reason: 'Long weekend getaway',
      status: 'pending',
      submittedDate: '2024-01-25',
      reviewedBy: null,
      reviewedDate: null
    },
    {
      id: 4,
      type: 'personal',
      startDate: '2024-01-05',
      endDate: '2024-01-05',
      days: 1,
      reason: 'Personal matters',
      status: 'approved',
      submittedDate: '2024-01-03',
      reviewedBy: 'Matthew Rodriguez',
      reviewedDate: '2024-01-04'
    }
  ]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newRequest = {
      id: Date.now(),
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      days: calculateDays(),
      reason: leaveForm.reason,
      notes: leaveForm.notes,
      status: 'pending',
      submittedDate: new Date().toISOString().split('T')[0],
      reviewedBy: null,
      reviewedDate: null
    };

    setMyRequests(prev => [newRequest, ...prev]);
    setShowRequestModal(false);
    resetForm();
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
      notes: ''
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Time Off</h1>
          <p className="text-gray-600 mt-2">Manage your vacation, sick leave, and time-off requests</p>
        </div>
        <Button className="flex items-center space-x-2" onClick={() => setShowRequestModal(true)}>
          <Plus className="w-4 h-4" />
          <span>Request Time Off</span>
        </Button>
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
        <CardContent className="px-6 pt-10 pb-8">
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
                const type = leaveTypes[request.type];
                const Icon = type.icon;
                
                return (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${type.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-gray-900">{type.label}</p>
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
                    <div className="text-right text-sm text-gray-500">
                      <p>Submitted {format(new Date(request.submittedDate), 'MMM dd')}</p>
                      {request.reviewedDate && (
                        <p className="text-xs mt-1">
                          Reviewed by {request.reviewedBy}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Time Off Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                    <span className="text-sm font-medium text-blue-900">Total Days Requested:</span>
                    <span className="text-2xl font-bold text-blue-900">{calculateDays()}</span>
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
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
      )}
    </div>
  );
};

export default MyTimeOff;

