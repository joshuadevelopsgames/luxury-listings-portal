import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions, FEATURE_PERMISSIONS } from '../contexts/PermissionsContext';
import EmployeeDetailsModal from '../components/EmployeeDetailsModal';
import EmployeeLink from '../components/ui/EmployeeLink';
import { firestoreService } from '../services/firestoreService';
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
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserPlus,
  UserMinus,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { format, differenceInDays, isToday, isPast } from 'date-fns';
import { safeFormatDate } from '../utils/dateUtils';
import { toast } from 'react-hot-toast';

const TeamManagement = () => {
  const { currentUser, currentRole } = useAuth();
  const { hasFeaturePermission, isSystemAdmin } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [migratingLeave, setMigratingLeave] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  
  const isHRManager = currentRole === 'hr_manager';
  const canRunLeaveMigration = isHRManager || isSystemAdmin;
  const canViewFinancials = hasFeaturePermission(FEATURE_PERMISSIONS.VIEW_FINANCIALS);

  // Team members loaded from Firestore
  const [teamMembers, setTeamMembers] = useState([]);

  // Generate numerical employee ID (EMP-001, EMP-002, etc.)
  const generateEmployeeId = (index) => {
    const num = (index + 1).toString().padStart(3, '0');
    return `EMP-${num}`;
  };

  // Load team members from Firestore; leave balances from user profiles (same source as My Time Off)
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        setLoading(true);
        const users = await firestoreService.getApprovedUsers();
        const sortedUsers = [...users].sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateA - dateB;
        });
        const formattedMembers = await Promise.all(sortedUsers.map(async (user, index) => {
          const email = user.email || user.id;
          const leaveBalance = await firestoreService.getUserLeaveBalances(email);
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
        }));
        setTeamMembers(formattedMembers);
      } catch (error) {
        console.error('Error loading team members:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTeamMembers();
  }, []);

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

  // Team statistics
  const teamStats = {
    totalMembers: teamMembers.length,
    activeMembers: teamMembers.filter(m => m.status === 'active').length,
    probationMembers: teamMembers.filter(m => m.status === 'probation').length,
    averageRating: (teamMembers.reduce((sum, m) => sum + m.performance.rating, 0) / teamMembers.length).toFixed(1),
    totalSalary: teamMembers.reduce((sum, m) => sum + m.salary, 0),
    averageTenure: Math.round(teamMembers.reduce((sum, m) => sum + differenceInDays(new Date(), new Date(m.startDate)), 0) / teamMembers.length)
  };

  // Department breakdown
  const departmentBreakdown = teamMembers.reduce((acc, member) => {
    acc[member.department] = (acc[member.department] || 0) + 1;
    return acc;
  }, {});

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-[#34c759]/10 text-[#34c759]';
      case 'probation': return 'bg-[#ff9500]/10 text-[#ff9500]';
      case 'inactive': return 'bg-[#ff3b30]/10 text-[#ff3b30]';
      default: return 'bg-black/5 dark:bg-white/10 text-[#86868b]';
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

  const getPerformanceColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400';
    if (rating >= 4.0) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const openEmployeeModal = (employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
  };

  // Migrate all users' leave balances to new structure (sick=3, remove personal)
  const handleMigrateLeavBalances = async () => {
    if (!window.confirm('This will set all users\' sick days to 3 and remove personal days. Continue?')) {
      return;
    }
    setMigratingLeave(true);
    try {
      const result = await firestoreService.migrateLeaveBalances();
      toast.success(`Migration complete! Updated ${result.updated} users, skipped ${result.skipped}.`);
      setMigrationDone(true);
      // Reload team members to reflect changes
      const users = await firestoreService.getApprovedUsers();
      const sortedUsers = [...users].sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateA - dateB;
      });
      const formattedMembers = sortedUsers.map((user, index) => ({
        id: user.id,
        name: user.displayName || user.firstName + ' ' + user.lastName || 'Team Member',
        email: user.email,
        role: user.role || 'employee',
        department: user.department || 'General',
        position: user.position || user.role || 'Team Member',
        status: user.status || 'active',
        startDate: user.startDate || user.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        employeeId: generateEmployeeId(index),
        leaveBalance: user.leaveBalances || { vacation: { total: 15, used: 0, remaining: 15 }, sick: { total: 3, used: 0, remaining: 3 } },
        performance: user.performance || 4.0,
        skills: user.skills || []
      }));
      setTeamMembers(formattedMembers);
    } catch (error) {
      console.error('Error migrating leave balances:', error);
      toast.error('Failed to migrate leave balances');
    } finally {
      setMigratingLeave(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">Team Management</h1>
          <p className="text-[15px] sm:text-[17px] text-[#86868b] mt-1">Manage your team, track performance, and oversee employee development</p>
        </div>
        <div className="flex gap-2">
          {canRunLeaveMigration && !migrationDone && (
            <button 
              onClick={handleMigrateLeavBalances}
              disabled={migratingLeave}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff9500]/10 text-[#ff9500] text-[14px] font-medium hover:bg-[#ff9500]/20 transition-colors disabled:opacity-50"
              title="Set all users' sick days to 3 and remove personal days"
            >
              {migratingLeave ? (
                <>
                  <Activity className="w-4 h-4 animate-spin shrink-0" />
                  <span className="hidden sm:inline">Migrating...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 shrink-0" />
                  <span>Set Sick Days to 3</span>
                </>
              )}
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white text-[14px] font-medium hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Team Data</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors">
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Team Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#86868b]">Total Team</p>
              <p className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white mt-1">{teamStats.totalMembers}</p>
            </div>
            <div className="p-2.5 rounded-full bg-[#0071e3]/10">
              <Users className="w-5 h-5 text-[#0071e3]" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#86868b]">Active Members</p>
              <p className="text-[24px] font-semibold text-[#34c759] mt-1">{teamStats.activeMembers}</p>
            </div>
            <div className="p-2.5 rounded-full bg-[#34c759]/10">
              <CheckCircle className="w-5 h-5 text-[#34c759]" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#86868b]">Avg Rating</p>
              <p className="text-[24px] font-semibold text-[#ff9500] mt-1">{teamStats.averageRating}</p>
            </div>
            <div className="p-2.5 rounded-full bg-[#ff9500]/10">
              <Star className="w-5 h-5 text-[#ff9500]" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#86868b]">Avg Tenure</p>
              <p className="text-[24px] font-semibold text-[#af52de] mt-1">{teamStats.averageTenure}d</p>
            </div>
            <div className="p-2.5 rounded-full bg-[#af52de]/10">
              <Calendar className="w-5 h-5 text-[#af52de]" />
            </div>
          </div>
        </div>

        {canViewFinancials && (
          <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-[#86868b]">Total Salary</p>
                <p className="text-[24px] font-semibold text-[#5856d6] mt-1">${(teamStats.totalSalary / 1000).toFixed(0)}k</p>
              </div>
              <div className="p-2.5 rounded-full bg-[#5856d6]/10">
                <TrendingUp className="w-5 h-5 text-[#5856d6]" />
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-[#86868b]">Probation</p>
              <p className="text-[24px] font-semibold text-[#ff9500] mt-1">{teamStats.probationMembers}</p>
            </div>
            <div className="p-2.5 rounded-full bg-[#ff9500]/10">
              <AlertTriangle className="w-5 h-5 text-[#ff9500]" />
            </div>
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
            <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Department Breakdown</span>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(departmentBreakdown).map(([dept, count]) => (
              <div key={dept} className="text-center p-4 bg-black/[0.02] dark:bg-white/5 rounded-xl">
                <p className="text-[24px] font-semibold text-[#1d1d1f] dark:text-white">{count}</p>
                <p className="text-[12px] text-[#86868b]">{dept}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#86868b] w-4 h-4" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-[14px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>
          
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="h-10 px-4 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
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
            className="h-10 px-4 text-[13px] rounded-xl bg-black/5 dark:bg-white/10 border-0 text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
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
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1d1d1f] dark:text-white" />
            <span className="text-[15px] font-medium text-[#1d1d1f] dark:text-white">Team Members ({filteredTeamMembers.length})</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 dark:border-white/10">
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Employee</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Performance</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Leave Balance</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeamMembers.map((member) => (
                <tr key={member.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#0071e3] to-[#5856d6] rounded-full flex items-center justify-center text-white text-[13px] font-medium">
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
                        <p className="text-[11px] text-[#86868b]">{member.position}</p>
                        <p className="text-[10px] text-[#86868b]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-[13px] text-[#1d1d1f] dark:text-white">{member.department}</p>
                      <p className="text-[11px] text-[#86868b]">Since {safeFormatDate(member.startDate, 'MMM yyyy')}</p>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Star className={`w-3.5 h-3.5 ${getPerformanceColor(member.performance.rating)}`} />
                        <span className={`text-[13px] font-medium ${getPerformanceColor(member.performance.rating)}`}>
                          {member.performance.rating}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#86868b]">{member.performance.projectsCompleted} projects</p>
                      <p className="text-[10px] text-[#86868b]">{member.performance.onTimeDelivery}% on time</p>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-[#86868b] mb-1">
                          <span>Vacation</span>
                          <span>{member.leaveBalance.vacation.remaining}/{member.leaveBalance.vacation.total}</span>
                        </div>
                        <div className="h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#0071e3] rounded-full transition-all"
                            style={{ width: `${(member.leaveBalance.vacation.remaining / member.leaveBalance.vacation.total) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-[#86868b] mb-1">
                          <span>Sick</span>
                          <span>{member.leaveBalance.sick.remaining}/{member.leaveBalance.sick.total}</span>
                        </div>
                        <div className="h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#ff3b30] rounded-full transition-all"
                            style={{ width: `${(member.leaveBalance.sick.remaining / member.leaveBalance.sick.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-4 px-4">
                    <span className={`text-[11px] px-2 py-1 rounded-md font-medium flex items-center gap-1 w-fit ${getStatusColor(member.status)}`}>
                      {getStatusIcon(member.status)}
                      <span className="capitalize">{member.status}</span>
                    </span>
                  </td>
                  
                  <td className="py-4 px-4">
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => openEmployeeModal(member)}
                        className="p-2 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openEmployeeModal(member)}
                        className="p-2 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
                        title="View / edit details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-white hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
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
