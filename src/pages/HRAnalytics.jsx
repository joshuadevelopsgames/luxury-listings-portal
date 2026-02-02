import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar, 
  Award, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  Activity,
  Download,
  Filter,
  Eye,
  Star,
  Building,
  Target,
  Zap,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  Briefcase,
  GraduationCap,
  Heart,
  Shield
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

const HRAnalytics = () => {
  const { currentUser } = useAuth();
  const [timeRange, setTimeRange] = useState('6months');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    teamOverview: { totalEmployees: 0, activeEmployees: 0, newHires: 0, terminations: 0, retentionRate: 0, averageTenure: 0, genderDistribution: {}, ageDistribution: {} },
    performance: { averageRating: 0, topPerformers: 0, needsImprovement: 0, onTrack: 0, ratingDistribution: {}, monthlyTrend: [] },
    departmentPerformance: {},
    turnover: { overallRate: 0, voluntary: 0, involuntary: 0, byDepartment: {}, reasons: {}, costPerHire: 0, totalTurnoverCost: 0 },
    training: { totalPrograms: 0, activeEnrollments: 0, completionRate: 0, averageScore: 0, popularPrograms: [], skillGaps: [] },
    compensation: { averageSalary: 0, salaryRange: { min: 0, max: 0 }, byDepartment: {}, benefitsUtilization: 0, satisfaction: 0 },
    satisfaction: { overall: 0, byCategory: {}, monthlyTrend: [], feedbackCount: 0 },
    attendance: { averageAttendance: 0, lateArrivals: 0, earlyDepartures: 0, overtimeHours: 0, remoteWorkDays: 0, byDepartment: {} }
  });

  // Load analytics data from Firestore
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const users = await firestoreService.getApprovedUsers();
        const totalEmployees = users.length;
        const activeEmployees = users.filter(u => u.status !== 'inactive').length;
        
        // Group by department
        const deptCounts = {};
        users.forEach(u => {
          const dept = u.department || 'General';
          deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });
        
        setAnalyticsData(prev => ({
          ...prev,
          teamOverview: { ...prev.teamOverview, totalEmployees, activeEmployees, retentionRate: totalEmployees > 0 ? (activeEmployees / totalEmployees) * 100 : 0 },
          departmentPerformance: Object.keys(deptCounts).reduce((acc, dept) => ({ ...acc, [dept]: { headcount: deptCounts[dept], avgRating: 0, turnover: 0, satisfaction: 0 } }), {})
        }));
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  // Time range options
  const timeRanges = [
    { value: '3months', label: '3 Months' },
    { value: '6months', label: '6 Months' },
    { value: '1year', label: '1 Year' },
    { value: '2years', label: '2 Years' }
  ];

  // Departments for filtering
  const departments = ['all', 'Marketing', 'Sales', 'Design', 'Engineering', 'HR', 'Finance'];

  // Calculate trends
  const calculateTrend = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">HR Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive insights into team performance, trends, and HR metrics</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
          <Button variant="outline" className="flex items-center space-x-2 dark:bg-white/10 dark:border-white/20 dark:text-white dark:hover:bg-white/20">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retention Rate</p>
                <p className="text-2xl font-bold text-green-600">{analyticsData.teamOverview.retentionRate}%</p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(2.1)}
                  <span className={`text-xs ${getTrendColor(2.1)}`}>+2.1% vs last period</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                <p className="text-2xl font-bold text-blue-600">{analyticsData.performance.averageRating}</p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(0.4)}
                  <span className={`text-xs ${getTrendColor(0.4)}`}>+0.4 vs last period</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Employee Satisfaction</p>
                <p className="text-2xl font-bold text-purple-600">{analyticsData.satisfaction.overall}</p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(0.3)}
                  <span className={`text-xs ${getTrendColor(0.3)}`}>+0.3 vs last period</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Heart className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Turnover Rate</p>
                <p className="text-2xl font-bold text-orange-600">{analyticsData.turnover.overallRate}%</p>
                <div className="flex items-center space-x-1 mt-1">
                  {getTrendIcon(-1.2)}
                  <span className={`text-xs ${getTrendColor(-1.2)}`}>-1.2% vs last period</span>
                </div>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <UserX className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Department Performance Comparison</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Headcount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Avg Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Turnover Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Satisfaction</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analyticsData.departmentPerformance).map(([dept, data]) => (
                  <tr key={dept} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{dept}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700">{data.headcount}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">{data.avgRating}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={data.turnover === 0 ? "secondary" : "destructive"}>
                        {data.turnover}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span>{data.satisfaction}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span>{analyticsData.attendance.byDepartment[dept]}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="w-5 h-5" />
              <span>Performance Rating Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analyticsData.performance.ratingDistribution).map(([range, count]) => (
                <div key={range} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-700">{range}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500">
                      ({((count / analyticsData.teamOverview.totalEmployees) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Monthly Performance Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.performance.monthlyTrend.map((rating, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {format(subMonths(new Date(), 5 - index), 'MMM yyyy')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(rating / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training & Development */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GraduationCap className="w-5 h-5" />
            <span>Training & Development Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{analyticsData.training.totalPrograms}</p>
              <p className="text-sm text-blue-700">Training Programs</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{analyticsData.training.activeEnrollments}</p>
              <p className="text-sm text-green-700">Active Enrollments</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{analyticsData.training.completionRate}%</p>
              <p className="text-sm text-yellow-700">Completion Rate</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{analyticsData.training.averageScore}</p>
              <p className="text-sm text-purple-700">Average Score</p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Popular Programs</h4>
              <div className="space-y-2">
                {analyticsData.training.popularPrograms.map((program, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">{program}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Identified Skill Gaps</h4>
              <div className="space-y-2">
                {analyticsData.training.skillGaps.map((skill, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Satisfaction Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5" />
            <span>Employee Satisfaction by Category</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analyticsData.satisfaction.byCategory).map(([category, rating]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{category}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-48 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full" 
                      style={{ width: `${(rating / 5) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">{rating}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Turnover Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserX className="w-5 h-5" />
            <span>Turnover Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{analyticsData.turnover.overallRate}%</p>
              <p className="text-sm text-red-700">Overall Turnover</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{analyticsData.turnover.voluntary}%</p>
              <p className="text-sm text-orange-700">Voluntary</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{analyticsData.turnover.involuntary}%</p>
              <p className="text-sm text-yellow-700">Involuntary</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">${(analyticsData.turnover.totalTurnoverCost / 1000).toFixed(0)}k</p>
              <p className="text-sm text-purple-700">Total Cost</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Turnover by Department</h4>
              <div className="space-y-3">
                {Object.entries(analyticsData.turnover.byDepartment).map(([dept, rate]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{dept}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${rate > 10 ? 'bg-red-500' : rate > 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(rate * 2, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12">{rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Turnover Reasons</h4>
              <div className="space-y-3">
                {Object.entries(analyticsData.turnover.reasons).map(([reason, percentage]) => (
                  <div key={reason} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{reason}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${percentage * 2}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12">{percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRAnalytics;
