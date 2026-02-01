import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Calendar, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  UserCheck,
  UserPlus,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HRQuickActions = () => {
  const navigate = useNavigate();

  // Mock data - in production this would come from your HR system
  const pendingLeaveRequests = [
    {
      id: 1,
      employeeName: 'Emma Rodriguez',
      type: 'vacation',
      dates: 'Feb 1-5, 2024',
      days: 5,
      status: 'pending'
    },
    {
      id: 2,
      employeeName: 'David Kim',
      type: 'sick',
      dates: 'Jan 22, 2024',
      days: 1,
      status: 'pending'
    },
    {
      id: 3,
      employeeName: 'Sarah Johnson',
      type: 'personal',
      dates: 'Feb 10-12, 2024',
      days: 3,
      status: 'pending'
    }
  ];

  const upcomingReviews = [
    {
      id: 1,
      employeeName: 'Mike Chen',
      department: 'Sales',
      dueDate: 'This Week',
      type: 'Quarterly Review'
    },
    {
      id: 2,
      employeeName: 'Emma Rodriguez',
      department: 'Design',
      dueDate: 'Next Week',
      type: '90-Day Review'
    }
  ];

  const todayAbsences = [
    { name: 'Sarah Johnson', reason: 'Vacation', duration: 'All Day' },
    { name: 'Alex Thompson', reason: 'Sick Leave', duration: 'All Day' }
  ];

  const recentHires = [
    {
      name: 'James Wilson',
      position: 'Marketing Specialist',
      startDate: 'Jan 15, 2024',
      onboardingProgress: 75
    }
  ];

  const getLeaveTypeEmoji = (type) => {
    switch (type) {
      case 'vacation': return '🏖️';
      case 'sick': return '🏥';
      case 'personal': return '🏠';
      default: return '📅';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pending Leave Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Pending Leave Requests</span>
            </CardTitle>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              {pendingLeaveRequests.length} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingLeaveRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getLeaveTypeEmoji(request.type)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{request.employeeName}</p>
                    <p className="text-sm text-gray-600">
                      {request.dates} ({request.days} {request.days === 1 ? 'day' : 'days'})
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <AlertCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => navigate('/hr-calendar')}
            >
              View All Leave Requests
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Team Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-green-600" />
              <span>Today's Team Status</span>
            </CardTitle>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              23 Present
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Absences */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Out Today ({todayAbsences.length})</span>
              </h4>
              <div className="space-y-2">
                {todayAbsences.map((absence, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-gray-900">{absence.name}</span>
                    </div>
                    <span className="text-xs text-gray-600">{absence.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Hires */}
            {recentHires.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Recent Hires</span>
                </h4>
                <div className="space-y-2">
                  {recentHires.map((hire, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{hire.name}</p>
                          <p className="text-xs text-gray-600">{hire.position}</p>
                        </div>
                        <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                          {hire.onboardingProgress}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${hire.onboardingProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/hr-analytics')}
            >
              View Team Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Performance Reviews */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span>Upcoming Reviews</span>
            </CardTitle>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {upcomingReviews.length} Scheduled
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingReviews.map((review) => (
              <div key={review.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{review.employeeName}</p>
                    <p className="text-xs text-gray-600">{review.department} • {review.type}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {review.dueDate}
                </Badge>
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => navigate('/hr-analytics')}
            >
              View All Reviews
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick HR Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="flex flex-col items-center justify-center h-24 space-y-2"
              onClick={() => navigate('/hr-calendar')}
            >
              <Calendar className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium">HR Calendar</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col items-center justify-center h-24 space-y-2"
              onClick={() => navigate('/hr-analytics')}
            >
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium">Team Analytics</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col items-center justify-center h-24 space-y-2"
              onClick={() => navigate('/team')}
            >
              <User className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium">Team Directory</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col items-center justify-center h-24 space-y-2"
              onClick={() => navigate('/permissions')}
            >
              <UserPlus className="w-6 h-6 text-orange-600" />
              <span className="text-sm font-medium">Manage Users</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRQuickActions;

