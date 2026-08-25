import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { usePermissions } from '../contexts/PermissionsContext';
import EmployeeDetailsModal from '../components/EmployeeDetailsModal';
import EmployeeLink from '../components/ui/EmployeeLink';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { formatStat, formatDays, formatCurrencyCompact } from '../utils/formatStat';
import { supabaseService } from '../services/supabaseService';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Eye, 
  TrendingUp, 
  Award, 
  Clock, 
  Calendar,
  Mail,
  Phone,
  MapPin,
  Building,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
  BarChart3,
  PieChart
} from 'lucide-react';
import { format, differenceInDays, isToday, isPast } from 'date-fns';
import { safeFormatDate } from '../utils/dateUtils';
import { toast } from 'react-hot-toast';
import { getSystemAdmins } from '../utils/systemAdmins';

const TeamManagement = () => {
  const { currentUser } = useAuth();
  const { confirm } = useConfirm();
  const { isSystemAdmin } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Page access = full access to all features
  const canViewLeaveBalance = true;
  const canViewFinancials = true;

  // Team members loaded from Firestore
  const [teamMembers, setTeamMembers] = useState([]);

  // Generate numerical employee ID (EMP-001, EMP-002, etc.)
  const generateEmployeeId = (index) => {
    const num = (index + 1).toString().padStart(3, '0');
    return `EMP-${num}`;
  };

  // Load team members from Firestore; leave balances from user profiles (same source as My Time Off). Exclude system admins.
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        setLoading(true);
        const [raw, allLeaveBalances] = await Promise.all([
          supabaseService.getApprovedUsers(),
          canViewLeaveBalance ? supabaseService.getAllUsersWithLeaveBalances() : Promise.resolve([]),
        ]);
        const leaveBalanceMap = Object.fromEntries(
          allLeaveBalances.map(b => [(b.email || '').toLowerCase(), b.leaveBalances])
        );
        const adminSet = new Set(getSystemAdmins().map(e => e.toLowerCase()));
        const users = raw.filter(u => !adminSet.has((u.email || u.id || '').toLowerCase()));
        const sortedUsers = [...users].sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateA - dateB;
        });
        const defaultLeaveBalance = { vacation: { total: 15, used: 0, remaining: 15 }, sick: { total: 3, used: 0, remaining: 3 }, remote: { total: 10, used: 0, remaining: 10 } };
        const formattedMembers = sortedUsers.map((user, index) => {
          const email = user.email || user.id;
          const leaveBalance = canViewLeaveBalance
            ? (leaveBalanceMap[(email || '').toLowerCase()] || defaultLeaveBalance)
            : defaultLeaveBalance;
          return {
            ...user,
            id: user.id || index + 1,
            name: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            email: user.email || user.id,
            phone: user.phone || '',
            department: user.department || 'General',
            position: user.role || user.position || 'Team Member',
            startDate: user.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
            status: user.status || 'active',
            avatar: (user.displayName || user.email || '').substring(0, 2).toUpperCase(),
            performance: user.performance || { rating: 0, projectsCompleted: 0, onTimeDelivery: 0, clientSatisfaction: 0, lastReview: null },
            skills: user.skills || [],
            certifications: user.certifications || [],
            leaveBalance,
            salary: user.salary || 0,
            manager: user.manager || '',
            employeeId: user.employeeId || generateEmployeeId(index)
          };
        });
        setTeamMembers(formattedMembers);
      } catch (error) {
        console.error('Error loading team members:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTeamMembers();
  }, [canViewLeaveBalance]);

  // Departments for filtering - keep in sync with PermissionsManager.jsx
  const departments = ['all', 'Executive', 'Content Team', 'Design Team', 'Sales', 'Marketing', 'Operations', 'HR', 'IT', 'Finance', 'General'];

  // Status options
  const statusOptions = ['all', 'active', 'probation', 'inactive'];

  // Filtered team members
  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || member.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Team statistics. Derived values are null (rendered as "—") rather than
  // NaN/0 when there is nothing to derive them from — an empty team has no
  // average tenure, it does not have an average tenure of zero.
  const tenures = teamMembers
    .map(m => differenceInDays(new Date(), new Date(m.startDate)))
    .filter(days => Number.isFinite(days));

  const teamStats = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(m => m.status === 'active').length,
    probationMembers: teamMembers.filter(m => m.status === 'probation').length,
    totalSalary: teamMembers.length
      ? teamMembers.reduce((sum, m) => sum + (Number(m.salary) || 0), 0)
      : null,
    averageTenure: tenures.length
      ? Math.round(tenures.reduce((sum, days) => sum + days, 0) / tenures.length)
      : null
  };

  // Department breakdown
  const departmentBreakdown = teamMembers.reduce((acc, member) => {
    acc[member.department] = (acc[member.department] || 0) + 1;
    return acc;
  }, {});

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-positive/10 text-positive';
      case 'probation': return 'bg-warning/10 text-warning';
      case 'inactive': return 'bg-danger/10 text-danger';
      default: return 'bg-surface-3 text-ink-muted';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'probation': return <AlertTriangle className="w-4 h-4" />;
      case 'inactive': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const openEmployeeModal = (employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <PageHeader
        title="Team Management"
        actions={
          <>
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-hairline-strong bg-surface text-ink text-[13px] font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand text-white text-[13px] font-medium hover:bg-brand-hover transition-colors">
              <UserPlus className="w-4 h-4" />
              <span>Add Team Member</span>
            </button>
          </>
        }
      />

      {/* Team Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Team" value={formatStat(teamStats.totalMembers)} icon={Users} />
        <StatCard label="Active Members" value={formatStat(teamStats.activeMembers)} icon={CheckCircle} />
        <StatCard label="Avg Tenure" value={formatDays(teamStats.averageTenure)} icon={Calendar} />
        {canViewFinancials && (
          <StatCard
            label="Total Salary"
            value={formatCurrencyCompact(teamStats.totalSalary)}
            icon={TrendingUp}
          />
        )}
        <StatCard
          label="Probation"
          value={formatStat(teamStats.probationMembers)}
          icon={AlertTriangle}
          status={teamStats.probationMembers > 0 ? 'Needs review' : undefined}
          statusTone="warning"
        />
      </div>

      {/* Department Breakdown */}
      <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-ink" />
            <span className="text-[15px] font-medium text-ink">Department Breakdown</span>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(departmentBreakdown).map(([dept, count]) => (
              <div key={dept} className="text-center p-4 bg-surface-2 rounded-xl">
                <p className="text-[24px] font-semibold text-ink">{count}</p>
                <p className="text-[12px] text-ink-muted">{dept}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-muted w-4 h-4" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-[14px] rounded-xl bg-surface border border-hairline-strong text-ink placeholder-ink-muted focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="h-10 px-4 text-[13px] rounded-xl bg-surface border border-hairline-strong text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-10 px-4 text-[13px] rounded-xl bg-surface border border-hairline-strong text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-ink" />
            <span className="text-[15px] font-medium text-ink">Team Members ({filteredTeamMembers.length})</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Employee</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Department</th>
                {canViewLeaveBalance && <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Leave Balance</th>}
                <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-ink-muted uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeamMembers.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => openEmployeeModal(member)}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand rounded-full flex items-center justify-center text-white text-[13px] font-medium">
                        {member.avatar}
                      </div>
                      <div>
                        <EmployeeLink
                          user={member}
                          showId
                          className="text-[13px] font-medium text-left"
                          onEmployeeUpdate={(updated) => setTeamMembers((prev) => prev.map((m) => (m.email === updated.email ? { ...m, ...updated } : m)))}
                        >
                          {member.name}
                        </EmployeeLink>
                        <p className="text-[11px] text-ink-muted">{member.position}</p>
                        <p className="text-[10px] text-ink-muted">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-[13px] text-ink">{member.department}</p>
                      <p className="text-[11px] text-ink-muted">Since {safeFormatDate(member.startDate, 'MMM yyyy')}</p>
                    </div>
                  </td>
                  
                  {canViewLeaveBalance && (
                    <td className="py-4 px-4">
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-ink-muted mb-1">
                            <span>Vacation</span>
                            <span>{member.leaveBalance.vacation.remaining}/{member.leaveBalance.vacation.total}</span>
                          </div>
                          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-brand rounded-full transition-all"
                              style={{ width: `${(member.leaveBalance.vacation.remaining / member.leaveBalance.vacation.total) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-ink-muted mb-1">
                            <span>Sick</span>
                            <span>{member.leaveBalance.sick.remaining}/{member.leaveBalance.sick.total}</span>
                          </div>
                          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-danger rounded-full transition-all"
                              style={{ width: `${(member.leaveBalance.sick.remaining / member.leaveBalance.sick.total) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-ink-muted mb-1">
                            <span>Remote</span>
                            <span>{member.leaveBalance.remote?.remaining ?? 0}/{member.leaveBalance.remote?.total ?? 10}</span>
                          </div>
                          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand rounded-full transition-all"
                              style={{ width: `${member.leaveBalance.remote?.total ? (member.leaveBalance.remote.remaining / member.leaveBalance.remote.total) * 100 : 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="py-4 px-4">
                    <span className={`text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1 w-fit ${getStatusColor(member.status)}`}>
                      {getStatusIcon(member.status)}
                      <span className="capitalize">{member.status}</span>
                    </span>
                  </td>
                  
                  <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => openEmployeeModal(member)}
                        className="p-2 rounded-lg bg-surface-3 text-ink hover:bg-hairline-strong transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openEmployeeModal(member)}
                        className="p-2 rounded-lg bg-surface-3 text-ink hover:bg-hairline-strong transition-colors"
                        title="View / edit details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-surface-3 text-ink hover:bg-hairline-strong transition-colors">
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Detail Modal */}
      {showEmployeeModal && selectedEmployee && (
        <EmployeeDetailsModal
          user={selectedEmployee}
          onClose={() => { setShowEmployeeModal(false); setSelectedEmployee(null); }}
          onEmployeeUpdate={(updated) => {
            setSelectedEmployee(updated);
            setTeamMembers((prev) => prev.map((m) => (m.email === updated.email ? { ...m, ...updated } : m)));
          }}
        />
      )}

    </div>
  );
};

export default TeamManagement;
