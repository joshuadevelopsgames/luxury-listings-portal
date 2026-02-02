import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import PersonCard from '../components/PersonCard';
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

const TeamManagement = () => {
  const { currentUser, currentRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const isHRManager = currentRole === 'hr_manager';

  // Team members loaded from Firestore
  const [teamMembers, setTeamMembers] = useState([]);

  // Load team members from Firestore
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        setLoading(true);
        const users = await firestoreService.getApprovedUsers();
        const formattedMembers = users.map((user, index) => ({
          id: user.id || index + 1,
          name: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          phone: user.phone || '',
          department: user.department || 'General',
          position: user.role || user.position || 'Team Member',
          startDate: user.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
          status: user.status || 'active',
          avatar: (user.displayName || user.email || '').substring(0, 2).toUpperCase(),
          performance: user.performance || { rating: 0, projectsCompleted: 0, onTimeDelivery: 0, clientSatisfaction: 0, lastReview: null },
          skills: user.skills || [],
          certifications: user.certifications || [],
          leaveBalance: user.leaveBalances || { vacation: { total: 15, used: 0, remaining: 15 }, sick: { total: 10, used: 0, remaining: 10 }, personal: { total: 3, used: 0, remaining: 3 } },
          salary: user.salary || 0,
          manager: user.manager || ''
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

  // Departments for filtering
  const departments = ['all', 'Marketing', 'Sales', 'Design', 'Engineering', 'HR'];

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
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'probation': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300';
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your team, track performance, and oversee employee development</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Team Data</span>
          </Button>
          <Button className="flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </Button>
        </div>
      </div>

      {/* Team Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Team</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamStats.totalMembers}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Members</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{teamStats.activeMembers}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{teamStats.averageRating}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Tenure</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{teamStats.averageTenure} days</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Salary</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${(teamStats.totalSalary / 1000).toFixed(0)}k</p>
              </div>
              <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Probation</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{teamStats.probationMembers}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
            <Building className="w-5 h-5" />
            <span>Department Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(departmentBreakdown).map(([dept, count]) => (
              <div key={dept} className="text-center p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{dept}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
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
              className="px-4 py-2 border border-gray-300 dark:border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-white/5 text-gray-900 dark:text-white"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : status}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Table */}
      <Card className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
            <Users className="w-5 h-5" />
            <span>Team Members ({filteredTeamMembers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Performance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Leave Balance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeamMembers.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {member.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{member.position}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-gray-900 dark:text-white">{member.department}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Since {safeFormatDate(member.startDate, 'MMM yyyy')}</p>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Star className={`w-4 h-4 ${getPerformanceColor(member.performance.rating)}`} />
                          <span className={`font-medium ${getPerformanceColor(member.performance.rating)}`}>
                            {member.performance.rating}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{member.performance.projectsCompleted} projects</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{member.performance.onTimeDelivery}% on time</p>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>Vacation</span>
                            <span>{member.leaveBalance.vacation.remaining}/{member.leaveBalance.vacation.total}</span>
                          </div>
                          <Progress value={(member.leaveBalance.vacation.remaining / member.leaveBalance.vacation.total) * 100} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>Sick</span>
                            <span>{member.leaveBalance.sick.remaining}/{member.leaveBalance.sick.total}</span>
                          </div>
                          <Progress value={(member.leaveBalance.sick.remaining / member.leaveBalance.sick.total) * 100} className="h-2" />
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <Badge className={getStatusColor(member.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(member.status)}
                          <span className="capitalize">{member.status}</span>
                        </div>
                      </Badge>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEmployeeModal(member)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Employee Detail Modal */}
      {showEmployeeModal && selectedEmployee && createPortal(
        <div className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
            <div className="sticky top-0 bg-white dark:bg-[#1c1c1e] border-b border-gray-200 dark:border-white/10 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Employee Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowEmployeeModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white">
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Personal Information Card */}
              <PersonCard 
                person={{
                  firstName: selectedEmployee.name.split(' ')[0],
                  lastName: selectedEmployee.name.split(' ').slice(1).join(' '),
                  email: selectedEmployee.email,
                  phone: selectedEmployee.phone,
                  address: selectedEmployee.address || 'Not provided',
                  department: selectedEmployee.department,
                  position: selectedEmployee.position,
                  manager: selectedEmployee.manager,
                  startDate: selectedEmployee.startDate,
                  employeeId: selectedEmployee.employeeId || `EMP-${selectedEmployee.id}`
                }}
                editable={isHRManager}
                isHRView={isHRManager}
                onSave={async (updatedData) => {
                  try {
                    // Find employee in Firestore by email
                    const employee = await firestoreService.getEmployeeByEmail(selectedEmployee.email);
                    
                    if (employee) {
                      await firestoreService.updateEmployee(employee.id, updatedData);
                      console.log('✅ Employee updated in Firestore');
                    } else {
                      // Create new employee if not found
                      const newEmployee = {
                        firstName: updatedData.firstName || selectedEmployee.name.split(' ')[0],
                        lastName: updatedData.lastName || selectedEmployee.name.split(' ').slice(1).join(' '),
                        email: selectedEmployee.email,
                        ...updatedData
                      };
                      const result = await firestoreService.addEmployee(newEmployee);
                      console.log('✅ Employee created in Firestore:', result.id);
                    }
                  } catch (error) {
                    console.error('❌ Error in Team Management save:', error);
                    throw error;
                  }
                }}
                showAvatar={true}
                employeeId={null}
              />

              {/* Performance Metrics */}
              <Card className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                    <BarChart3 className="w-5 h-5" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedEmployee.performance.rating}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Overall Rating</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedEmployee.performance.projectsCompleted}</p>
                      <p className="text-sm text-green-700 dark:text-green-300">Projects Completed</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{selectedEmployee.performance.onTimeDelivery}%</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">On-Time Delivery</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedEmployee.performance.clientSatisfaction}</p>
                      <p className="text-sm text-purple-700 dark:text-purple-300">Client Satisfaction</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills and Certifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                      <GraduationCap className="w-5 h-5" />
                      <span>Skills</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployee.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="dark:bg-white/10 dark:text-gray-200">{skill}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                      <Award className="w-5 h-5" />
                      <span>Certifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployee.certifications.map((cert, index) => (
                        <Badge key={index} variant="outline" className="dark:border-white/20 dark:text-gray-200">{cert}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Leave Balance */}
              <Card className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                    <Calendar className="w-5 h-5" />
                    <span>Leave Balance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedEmployee.leaveBalance.vacation.remaining}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Vacation Days</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Used: {selectedEmployee.leaveBalance.vacation.used}</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{selectedEmployee.leaveBalance.sick.remaining}</p>
                      <p className="text-sm text-red-700 dark:text-red-300">Sick Days</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Used: {selectedEmployee.leaveBalance.sick.used}</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedEmployee.leaveBalance.personal.remaining}</p>
                      <p className="text-sm text-purple-700 dark:text-purple-300">Personal Days</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Used: {selectedEmployee.leaveBalance.personal.used}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TeamManagement;
