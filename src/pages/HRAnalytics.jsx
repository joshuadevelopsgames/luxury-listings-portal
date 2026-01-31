import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

  // Mock analytics data
  const analyticsData = {
    // Team Overview
    teamOverview: {
      totalEmployees: 25,
      activeEmployees: 23,
      newHires: 3,
      terminations: 1,
      retentionRate: 96.0,
      averageTenure: 2.4,
      genderDistribution: { male: 12, female: 13 },
      ageDistribution: { '18-25': 2, '26-35': 8, '36-45': 10, '46-55': 4, '55+': 1 }
    },

    // Performance Metrics
    performance: {
      averageRating: 4.6,
      topPerformers: 8,
      needsImprovement: 2,
      onTrack: 13,
      ratingDistribution: { '5.0': 3, '4.5-4.9': 8, '4.0-4.4': 10, '3.5-3.9': 3, '3.0-3.4': 1 },
      monthlyTrend: [4.2, 4.3, 4.4, 4.5, 4.6, 4.6]
    },

    // Department Performance
    departmentPerformance: {
      'Marketing': { avgRating: 4.7, headcount: 6, turnover: 0, satisfaction: 4.8 },
      'Sales': { avgRating: 4.5, headcount: 5, turnover: 1, satisfaction: 4.6 },
      'Design': { avgRating: 4.8, headcount: 4, turnover: 0, satisfaction: 4.9 },
      'Engineering': { avgRating: 4.6, headcount: 6, turnover: 0, satisfaction: 4.7 },
      'HR': { avgRating: 4.9, headcount: 2, turnover: 0, satisfaction: 5.0 },
      'Finance': { avgRating: 4.4, headcount: 2, turnover: 0, satisfaction: 4.5 }
    },

    // Turnover Analysis
    turnover: {
      overallRate: 4.0,
      voluntary: 2.0,
      involuntary: 2.0,
      byDepartment: { 'Sales': 20.0, 'Marketing': 0.0, 'Design': 0.0, 'Engineering': 0.0, 'HR': 0.0, 'Finance': 0.0 },
      reasons: { 'Career Growth': 50, 'Relocation': 25, 'Performance': 25 },
      costPerHire: 15000,
      totalTurnoverCost: 60000
    },

    // Training & Development
    training: {
      totalPrograms: 12,
      activeEnrollments: 18,
      completionRate: 85.0,
      averageScore: 88.0,
      popularPrograms: ['Leadership Skills', 'Technical Training', 'Communication', 'Project Management'],
      skillGaps: ['Advanced Analytics', 'AI/ML', 'Cybersecurity', 'Data Science']
    },

    // Compensation & Benefits
    compensation: {
      averageSalary: 72000,
      salaryRange: { min: 45000, max: 120000 },
      byDepartment: {
        'Marketing': 68000,
        'Sales': 75000,
        'Design': 72000,
        'Engineering': 85000,
        'HR': 65000,
        'Finance': 70000
      },
      benefitsUtilization: 92.0,
      satisfaction: 4.3
    },

    // Employee Satisfaction
    satisfaction: {
      overall: 4.4,
      byCategory: {
        'Work Environment': 4.5,
        'Compensation': 4.2,
        'Career Growth': 4.6,
        'Work-Life Balance': 4.3,
        'Management': 4.4,
        'Company Culture': 4.7
      },
      monthlyTrend: [4.1, 4.2, 4.3, 4.3, 4.4, 4.4],
      feedbackCount: 156
    },

    // Time & Attendance
    attendance: {
      averageAttendance: 96.5,
      lateArrivals: 2.1,
      earlyDepartures: 1.8,
      overtimeHours: 8.5,
      remoteWorkDays: 2.3,
      byDepartment: {
        'Marketing': 97.2,
        'Sales': 95.8,
        'Design': 96.9,
        'Engineering': 96.1,
        'HR': 98.0,
        'Finance': 96.8
      }
    }
  };

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
