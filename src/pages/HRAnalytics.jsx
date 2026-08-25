import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
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
  const [clientMovements, setClientMovements] = useState([]);
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
        const users = await supabaseService.getApprovedUsers();
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
        const movements = await supabaseService.getClientMovements({ limitCount: 100 });
        setClientMovements(movements);
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
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-positive" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-danger" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-positive';
    if (trend < 0) return 'text-danger';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-ink tracking-[-0.02em]">HR Analytics</h1>
          <p className="text-[15px] sm:text-[17px] text-ink-muted mt-1">Comprehensive insights into team performance, trends, and HR metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="h-10 px-4 text-[13px] rounded-xl bg-surface border border-hairline-strong text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="h-10 px-4 text-[13px] rounded-xl bg-surface border border-hairline-strong text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-3 text-ink text-[14px] font-medium hover:bg-hairline-strong transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-ink-muted">Retention Rate</p>
              <p className="text-[24px] font-semibold text-positive mt-1">{analyticsData.teamOverview.retentionRate}%</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(2.1)}
                <span className={`text-[11px] ${getTrendColor(2.1)}`}>+2.1% vs last period</span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-positive/10">
              <UserCheck className="w-5 h-5 text-positive" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-ink-muted">Avg Performance</p>
              <p className="text-[24px] font-semibold text-brand mt-1">{analyticsData.performance.averageRating}</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(0.4)}
                <span className={`text-[11px] ${getTrendColor(0.4)}`}>+0.4 vs last period</span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-brand/10">
              <Star className="w-5 h-5 text-brand" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-ink-muted">Employee Satisfaction</p>
              <p className="text-[24px] font-semibold text-brand mt-1">{analyticsData.satisfaction.overall}</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(0.3)}
                <span className={`text-[11px] ${getTrendColor(0.3)}`}>+0.3 vs last period</span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-brand/10">
              <Heart className="w-5 h-5 text-brand" />
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-ink-muted">Turnover Rate</p>
              <p className="text-[24px] font-semibold text-warning mt-1">{analyticsData.turnover.overallRate}%</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(-1.2)}
                <span className={`text-[11px] ${getTrendColor(-1.2)}`}>-1.2% vs last period</span>
              </div>
            </div>
            <div className="p-2.5 rounded-full bg-warning/10">
              <UserX className="w-5 h-5 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Client Churn & Movements */}
      <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <UserMinus className="w-5 h-5 text-ink" />
            <span className="text-[15px] font-medium text-ink">Client Churn & Movements</span>
          </div>
          <p className="text-[12px] text-ink-muted mt-1">Deletions and reassignments for account manager retention and workload insights</p>
        </div>
        <div className="p-5">
          {clientMovements.length === 0 ? (
            <p className="text-[13px] text-ink-muted">No client movements recorded yet. Deletions and manager reassignments will appear here.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="text-left py-2 px-3 text-[11px] font-medium text-ink-muted uppercase tracking-wide">Date</th>
                      <th className="text-left py-2 px-3 text-[11px] font-medium text-ink-muted uppercase tracking-wide">Type</th>
                      <th className="text-left py-2 px-3 text-[11px] font-medium text-ink-muted uppercase tracking-wide">Client</th>
                      <th className="text-left py-2 px-3 text-[11px] font-medium text-ink-muted uppercase tracking-wide">From → To</th>
                      <th className="text-left py-2 px-3 text-[11px] font-medium text-ink-muted uppercase tracking-wide">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientMovements.slice(0, 30).map((ev) => (
                      <tr key={ev.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/5">
                        <td className="py-2 px-3 text-[12px] text-ink">{ev.timestamp ? format(new Date(ev.timestamp), 'MMM d, yyyy') : '—'}</td>
                        <td className="py-2 px-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                            ev.type === 'client_deleted' ? 'bg-danger/10 text-danger' :
                            ev.type === 'client_added' ? 'bg-positive/10 text-positive' :
                            ev.type === 'contract_value_increased' ? 'bg-brand/10 text-brand' :
                            ev.type === 'social_accounts_added' ? 'bg-brand/10 text-brand' :
                            'bg-brand/10 text-brand'
                          }`}>
                            {ev.type === 'client_deleted' ? 'Deleted' : ev.type === 'client_added' ? 'Added' : ev.type === 'contract_value_increased' ? 'Contract ↑' : ev.type === 'social_accounts_added' ? 'Accounts ↑' : 'Reassigned'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[12px] text-ink">{ev.clientName || ev.clientId || '—'}</td>
                        <td className="py-2 px-3 text-[12px] text-ink-muted">
                          {ev.type === 'client_reassigned' ? `${ev.previousAssignedManager || 'Unassigned'} → ${ev.newAssignedManager || 'Unassigned'}` :
                            ev.type === 'client_added' ? (ev.newAssignedManager ? `Assigned to ${ev.newAssignedManager}` : '—') :
                            ev.type === 'contract_value_increased' ? (ev.valuePrevious != null && ev.valueNew != null ? `${ev.valuePrevious} → ${ev.valueNew}` : '—') :
                            ev.type === 'social_accounts_added' ? (ev.details || '—') :
                            ev.type === 'client_deleted' ? (ev.previousAssignedManager || '—') : '—'}
                        </td>
                        <td className="py-2 px-3 text-[12px] text-ink-muted">{ev.performedBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {clientMovements.length > 30 && <p className="text-[11px] text-ink-muted mt-2">Showing latest 30. Total: {clientMovements.length}</p>}
            </>
          )}
        </div>
      </div>

      {/* Department Performance Comparison */}
      <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-ink" />
            <span className="text-[15px] font-medium text-ink">Department Performance Comparison</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Headcount</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Avg Rating</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Turnover Rate</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Satisfaction</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analyticsData.departmentPerformance).map(([dept, data]) => (
                <tr key={dept} className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-ink-muted" />
                      <span className="text-[13px] font-medium text-ink">{dept}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[13px] text-ink">{data.headcount}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-warning" />
                      <span className="text-[13px] font-medium text-ink">{data.avgRating}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[11px] px-2 py-1 rounded-md font-medium ${data.turnover === 0 ? 'bg-positive/10 text-positive' : 'bg-danger/10 text-danger'}`}>
                      {data.turnover}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-danger" />
                      <span className="text-[13px] text-ink">{data.satisfaction}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-brand" />
                      <span className="text-[13px] text-ink">{analyticsData.attendance.byDepartment[dept]}%</span>
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
        <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
          <div className="px-5 py-4 border-b border-hairline">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-ink" />
              <span className="text-[15px] font-medium text-ink">Performance Rating Distribution</span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(analyticsData.performance.ratingDistribution).map(([range, count]) => (
              <div key={range} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-brand"></div>
                  <span className="text-[13px] text-ink">{range}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-ink">{count}</span>
                  <span className="text-[11px] text-ink-muted">
                    ({((count / analyticsData.teamOverview.totalEmployees) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
          <div className="px-5 py-4 border-b border-hairline">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-ink" />
              <span className="text-[15px] font-medium text-ink">Monthly Performance Trend</span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {analyticsData.performance.monthlyTrend.map((rating, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-[13px] text-ink">
                  {format(subMonths(new Date(), 5 - index), 'MMM yyyy')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand rounded-full" 
                      style={{ width: `${(rating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-[13px] font-medium text-ink w-6">{rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Training & Development */}
      <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-ink" />
            <span className="text-[15px] font-medium text-ink">Training & Development Overview</span>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-brand/5 dark:bg-brand/10 rounded-xl">
              <p className="text-[24px] font-semibold text-brand">{analyticsData.training.totalPrograms}</p>
              <p className="text-[12px] text-brand/80">Training Programs</p>
            </div>
            <div className="text-center p-4 bg-positive/5 dark:bg-positive/10 rounded-xl">
              <p className="text-[24px] font-semibold text-positive">{analyticsData.training.activeEnrollments}</p>
              <p className="text-[12px] text-positive/80">Active Enrollments</p>
            </div>
            <div className="text-center p-4 bg-warning/5 dark:bg-warning/10 rounded-xl">
              <p className="text-[24px] font-semibold text-warning">{analyticsData.training.completionRate}%</p>
              <p className="text-[12px] text-warning/80">Completion Rate</p>
            </div>
            <div className="text-center p-4 bg-brand/5 dark:bg-brand/10 rounded-xl">
              <p className="text-[24px] font-semibold text-brand">{analyticsData.training.averageScore}</p>
              <p className="text-[12px] text-brand/80">Average Score</p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-[13px] font-medium text-ink mb-3">Popular Programs</h4>
              <div className="space-y-2">
                {analyticsData.training.popularPrograms.map((program, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-brand rounded-full"></div>
                    <span className="text-[12px] text-ink-muted">{program}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-[13px] font-medium text-ink mb-3">Identified Skill Gaps</h4>
              <div className="space-y-2">
                {analyticsData.training.skillGaps.map((skill, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-danger rounded-full"></div>
                    <span className="text-[12px] text-ink-muted">{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Satisfaction Breakdown */}
      <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-ink" />
            <span className="text-[15px] font-medium text-ink">Employee Satisfaction by Category</span>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {Object.entries(analyticsData.satisfaction.byCategory).map(([category, rating]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink">{category}</span>
              <div className="flex items-center gap-3">
                <div className="w-36 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-positive rounded-full" 
                    style={{ width: `${(rating / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[13px] font-medium text-ink w-6">{rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Turnover Analysis */}
      <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-ink" />
            <span className="text-[15px] font-medium text-ink">Turnover Analysis</span>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-danger/5 dark:bg-danger/10 rounded-xl">
              <p className="text-[24px] font-semibold text-danger">{analyticsData.turnover.overallRate}%</p>
              <p className="text-[12px] text-danger/80">Overall Turnover</p>
            </div>
            <div className="text-center p-4 bg-warning/5 dark:bg-warning/10 rounded-xl">
              <p className="text-[24px] font-semibold text-warning">{analyticsData.turnover.voluntary}%</p>
              <p className="text-[12px] text-warning/80">Voluntary</p>
            </div>
            <div className="text-center p-4 bg-warning/5 dark:bg-warning/10 rounded-xl">
              <p className="text-[24px] font-semibold text-warning">{analyticsData.turnover.involuntary}%</p>
              <p className="text-[12px] text-warning/80">Involuntary</p>
            </div>
            <div className="text-center p-4 bg-brand/5 dark:bg-brand/10 rounded-xl">
              <p className="text-[24px] font-semibold text-brand">${(analyticsData.turnover.totalTurnoverCost / 1000).toFixed(0)}k</p>
              <p className="text-[12px] text-brand/80">Total Cost</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-[13px] font-medium text-ink mb-3">Turnover by Department</h4>
              <div className="space-y-3">
                {Object.entries(analyticsData.turnover.byDepartment).map(([dept, rate]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <span className="text-[12px] text-ink-muted">{dept}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${rate > 10 ? 'bg-danger' : rate > 5 ? 'bg-warning' : 'bg-positive'}`}
                          style={{ width: `${Math.min(rate * 2, 100)}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-medium text-ink w-10">{rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-[13px] font-medium text-ink mb-3">Turnover Reasons</h4>
              <div className="space-y-3">
                {Object.entries(analyticsData.turnover.reasons).map(([reason, percentage]) => (
                  <div key={reason} className="flex items-center justify-between">
                    <span className="text-[12px] text-ink-muted">{reason}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand rounded-full" 
                          style={{ width: `${percentage * 2}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-medium text-ink w-10">{percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ideas for future HR metrics */}
      <div className="rounded-xl bg-surface-3 border border-hairline overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline">
          <span className="text-[13px] font-medium text-ink-muted">Future metrics we could add</span>
        </div>
        <div className="p-4 text-[12px] text-ink-muted space-y-1">
          <p>• Time-to-first-post per client (onboarding speed by manager)</p>
          <p>• Posts delivered vs scheduled per client / per manager</p>
          <p>• Leave frequency and overlap by person or team</p>
          <p>• Training completion and skill gaps by department</p>
          <p>• Client health score trends (from monthly AI run) by manager</p>
          <p>• Contract value increases (tracked when feature is implemented; use logContractValueIncrease)</p>
          <p>• Social/media accounts added per client (growth signal; tracked from April 2026 via logSocialAccountsAdded)</p>
        </div>
      </div>
    </div>
  );
};

export default HRAnalytics;
