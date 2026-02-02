import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firestoreService } from '../services/firestoreService';
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
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">HR Analytics</h1>
          <p className="text-[15px] sm:text-[17px] text-[#86868b] mt-1">Comprehensive insights into team performance, trends, and HR metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-10 px-4 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="h-10 px-4 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#86868b]">Retention Rate</p>
              <p className="text-[24px] font-semibold text-[#34c759] mt-1">{analyticsData.teamOverview.retentionRate}%</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(2.1)}
                <span className={`text-[11px] ${getTrendColor(2.1)}`}>+2.1% vs last period</span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-[#34c759]/10">
              <UserCheck className="w-5 h-5 text-[#34c759]" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#86868b]">Avg Performance</p>
              <p className="text-[24px] font-semibold text-[#0071e3] mt-1">{analyticsData.performance.averageRating}</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(0.4)}
                <span className={`text-[11px] ${getTrendColor(0.4)}`}>+0.4 vs last period</span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-[#0071e3]/10">
              <Star className="w-5 h-5 text-[#0071e3]" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#86868b]">Employee Satisfaction</p>
              <p className="text-[24px] font-semibold text-[#af52de] mt-1">{analyticsData.satisfaction.overall}</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(0.3)}
                <span className={`text-[11px] ${getTrendColor(0.3)}`}>+0.3 vs last period</span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-[#af52de]/10">
              <Heart className="w-5 h-5 text-[#af52de]" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#86868b]">Turnover Rate</p>
              <p className="text-[24px] font-semibold text-[#ff9500] mt-1">{analyticsData.turnover.overallRate}%</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(-1.2)}
                <span className={`text-[11px] ${getTrendColor(-1.2)}`}>-1.2% vs last period</span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-[#ff9500]/10">
              <UserX className="w-5 h-5 text-[#ff9500]" />
            </div>
          </div>
        </div>
      </div>

      {/* Department Performance Comparison */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
            <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Department Performance Comparison</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/10">
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Headcount</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Avg Rating</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Turnover Rate</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Satisfaction</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analyticsData.departmentPerformance).map(([dept, data]) => (
                <tr key={dept} className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-[#86868b]" />
                      <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{dept}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#1d1d1f] dark:text-white">{data.headcount}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-[#ff9500]" />
                      <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{data.avgRating}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${data.turnover === 0 ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}`}>
                      {data.turnover}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-[#ff3b30]" />
                      <span className="text-[13px] text-[#1d1d1f] dark:text-white">{data.satisfaction}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-[#0071e3]" />
                      <span className="text-[13px] text-[#1d1d1f] dark:text-white">{analyticsData.attendance.byDepartment[dept]}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Performance Rating Distribution</span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(analyticsData.performance.ratingDistribution).map(([range, count]) => (
              <div key={range} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#0071e3]"></div>
                  <span className="text-[13px] text-[#1d1d1f] dark:text-white">{range}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{count}</span>
                  <span className="text-[11px] text-[#86868b]">
                    ({((count / analyticsData.teamOverview.totalEmployees) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
              <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Monthly Performance Trend</span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {analyticsData.performance.monthlyTrend.map((rating, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-[13px] text-[#1d1d1f] dark:text-white">
                  {format(subMonths(new Date(), 5 - index), 'MMM yyyy')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0071e3] rounded-full" 
                      style={{ width: `${(rating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white w-6">{rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Training & Development */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
            <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Training & Development Overview</span>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[#0071e3]/5 dark:bg-[#0071e3]/10 rounded-xl">
              <p className="text-[24px] font-semibold text-[#0071e3]">{analyticsData.training.totalPrograms}</p>
              <p className="text-[12px] text-[#0071e3]/80">Training Programs</p>
            </div>
            <div className="text-center p-4 bg-[#34c759]/5 dark:bg-[#34c759]/10 rounded-xl">
              <p className="text-[24px] font-semibold text-[#34c759]">{analyticsData.training.activeEnrollments}</p>
              <p className="text-[12px] text-[#34c759]/80">Active Enrollments</p>
            </div>
            <div className="text-center p-4 bg-[#ff9500]/5 dark:bg-[#ff9500]/10 rounded-xl">
              <p className="text-[24px] font-semibold text-[#ff9500]">{analyticsData.training.completionRate}%</p>
              <p className="text-[12px] text-[#ff9500]/80">Completion Rate</p>
            </div>
            <div className="text-center p-4 bg-[#af52de]/5 dark:bg-[#af52de]/10 rounded-xl">
              <p className="text-[24px] font-semibold text-[#af52de]">{analyticsData.training.averageScore}</p>
              <p className="text-[12px] text-[#af52de]/80">Average Score</p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-3">Popular Programs</h4>
              <div className="space-y-2">
                {analyticsData.training.popularPrograms.map((program, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#0071e3] rounded-full"></div>
                    <span className="text-[12px] text-[#86868b]">{program}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-3">Identified Skill Gaps</h4>
              <div className="space-y-2">
                {analyticsData.training.skillGaps.map((skill, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#ff3b30] rounded-full"></div>
                    <span className="text-[12px] text-[#86868b]">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Satisfaction Breakdown */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
            <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Employee Satisfaction by Category</span>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {Object.entries(analyticsData.satisfaction.byCategory).map(([category, rating]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">{category}</span>
              <div className="flex items-center gap-3">
                <div className="w-36 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#34c759] rounded-full" 
                    style={{ width: `${(rating / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white w-6">{rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Turnover Analysis */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
            <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Turnover Analysis</span>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-[#ff3b30]/5 dark:bg-[#ff3b30]/10 rounded-xl">
              <p className="text-[24px] font-semibold text-[#ff3b30]">{analyticsData.turnover.overallRate}%</p>
              <p className="text-[12px] text-[#ff3b30]/80">Overall Turnover</p>
            </div>
            <div className="text-center p-4 bg-[#ff9500]/5 dark:bg-[#ff9500]/10 rounded-xl">
              <p className="text-[24px] font-semibold text-[#ff9500]">{analyticsData.turnover.voluntary}%</p>
              <p className="text-[12px] text-[#ff9500]/80">Voluntary</p>
            </div>
            <div className="text-center p-4 bg-[#ff9500]/5 dark:bg-[#ff9500]/10 rounded-xl">
              <p className="text-[24px] font-semibold text-[#ff9500]">{analyticsData.turnover.involuntary}%</p>
              <p className="text-[12px] text-[#ff9500]/80">Involuntary</p>
            </div>
            <div className="text-center p-4 bg-[#af52de]/5 dark:bg-[#af52de]/10 rounded-xl">
              <p className="text-[24px] font-semibold text-[#af52de]">${(analyticsData.turnover.totalTurnoverCost / 1000).toFixed(0)}k</p>
              <p className="text-[12px] text-[#af52de]/80">Total Cost</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-3">Turnover by Department</h4>
              <div className="space-y-3">
                {Object.entries(analyticsData.turnover.byDepartment).map(([dept, rate]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <span className="text-[12px] text-[#86868b]">{dept}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${rate > 10 ? 'bg-[#ff3b30]' : rate > 5 ? 'bg-[#ff9500]' : 'bg-[#34c759]'}`}
                          style={{ width: `${Math.min(rate * 2, 100)}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-medium text-[#1d1d1f] dark:text-white w-10">{rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-3">Turnover Reasons</h4>
              <div className="space-y-3">
                {Object.entries(analyticsData.turnover.reasons).map(([reason, percentage]) => (
                  <div key={reason} className="flex items-center justify-between">
                    <span className="text-[12px] text-[#86868b]">{reason}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#0071e3] rounded-full" 
                          style={{ width: `${percentage * 2}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-medium text-[#1d1d1f] dark:text-white w-10">{percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRAnalytics;
