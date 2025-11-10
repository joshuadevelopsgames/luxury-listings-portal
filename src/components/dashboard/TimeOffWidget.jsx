import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Calendar, 
  Plane, 
  Heart, 
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const TimeOffWidget = () => {
  const navigate = useNavigate();

  // Mock data - in production this would come from Firestore
  const leaveBalances = {
    vacation: {
      total: 20,
      used: 8,
      remaining: 12
    },
    sick: {
      total: 10,
      used: 2,
      remaining: 8
    }
  };

  const pendingRequests = [
    {
      id: 1,
      type: 'vacation',
      startDate: '2024-03-10',
      endDate: '2024-03-12',
      days: 3,
      status: 'pending'
    }
  ];

  const upcomingTimeOff = [
    {
      id: 1,
      type: 'vacation',
      startDate: '2024-02-15',
      endDate: '2024-02-19',
      days: 5,
      status: 'approved'
    }
  ];

  const vacationUsagePercent = (leaveBalances.vacation.used / leaveBalances.vacation.total) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>My Time Off</span>
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => navigate('/my-time-off')}
            className="flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Balances */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Plane className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Vacation</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{leaveBalances.vacation.remaining}</p>
            <p className="text-xs text-blue-700">days remaining</p>
          </div>
          
          <div className="bg-red-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">Sick Leave</span>
            </div>
            <p className="text-2xl font-bold text-red-900">{leaveBalances.sick.remaining}</p>
            <p className="text-xs text-red-700">days remaining</p>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-700" />
              <span className="text-sm font-medium text-yellow-900">Pending Approval</span>
            </div>
            {pendingRequests.map((request) => (
              <div key={request.id} className="text-sm text-yellow-800">
                {format(new Date(request.startDate), 'MMM dd')} - {format(new Date(request.endDate), 'MMM dd')} ({request.days} days)
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Time Off */}
        {upcomingTimeOff.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-700" />
              <span className="text-sm font-medium text-green-900">Upcoming Time Off</span>
            </div>
            {upcomingTimeOff.map((timeOff) => (
              <div key={timeOff.id} className="text-sm text-green-800">
                {format(new Date(timeOff.startDate), 'MMM dd')} - {format(new Date(timeOff.endDate), 'MMM dd')} ({timeOff.days} days)
              </div>
            ))}
          </div>
        )}

        {/* Quick Action Button */}
        <Button 
          className="w-full"
          onClick={() => navigate('/my-time-off')}
        >
          Request Time Off
        </Button>
      </CardContent>
    </Card>
  );
};

export default TimeOffWidget;

