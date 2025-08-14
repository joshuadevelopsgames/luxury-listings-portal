import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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

const TeamManagement = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  // Mock team data
  const [teamMembers, setTeamMembers] = useState([
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@luxuryrealestate.com',
      phone: '+1 (555) 123-4567',
      department: 'Marketing',
      position: 'Content Specialist',
      startDate: '2023-01-15',
      status: 'active',
      avatar: 'SJ',
      performance: {
        rating: 4.8,
        projectsCompleted: 24,
        onTimeDelivery: 95,
        clientSatisfaction: 4.9,
        lastReview: '2024-01-15'
      },
      skills: ['Content Creation', 'SEO', 'Social Media', 'Analytics'],
      certifications: ['Google Analytics', 'HubSpot Marketing'],
      leaveBalance: {
        vacation: { total: 20, used: 12, remaining: 8 },
        sick: { total: 10, used: 3, remaining: 7 },
        personal: { total: 5, used: 1, remaining: 4 }
      },
      salary: 65000,
      manager: 'Joshua Mitchell'
    },
    {
      id: 2,
      name: 'Mike Chen',
      email: 'mike.chen@luxuryrealestate.com',
      phone: '+1 (555) 234-5678',
      department: 'Sales',
      position: 'Account Manager',
      startDate: '2023-06-20',
      status: 'active',
      avatar: 'MC',
      performance: {
        rating: 4.6,
        projectsCompleted: 18,
        onTimeDelivery: 92,
        clientSatisfaction: 4.7,
        lastReview: '2024-01-10'
      },
      skills: ['Client Relations', 'Sales Strategy', 'CRM Management', 'Negotiation'],
      certifications: ['Salesforce Admin', 'Sales Training'],
      leaveBalance: {
        vacation: { total: 20, used: 8, remaining: 12 },
        sick: { total: 10, used: 1, remaining: 9 },
        personal: { total: 5, used: 0, remaining: 5 }
      },
      salary: 70000,
      manager: 'Joshua Mitchell'
    },
    {
      id: 3,
      name: 'Emma Rodriguez',
      email: 'emma.rodriguez@luxuryrealestate.com',
      phone: '+1 (555) 345-6789',
      department: 'Design',
      position: 'UI/UX Designer',
      startDate: '2023-03-10',
      status: 'active',
      avatar: 'ER',
      performance: {
        rating: 4.9,
        projectsCompleted: 31,
        onTimeDelivery: 98,
        clientSatisfaction: 5.0,
        lastReview: '2024-01-20'
      },
      skills: ['UI Design', 'UX Research', 'Figma', 'Prototyping', 'User Testing'],
      certifications: ['Google UX Design', 'Figma Advanced'],
      leaveBalance: {
        vacation: { total: 20, used: 15, remaining: 5 },
        sick: { total: 10, used: 2, remaining: 8 },
        personal: { total: 5, used: 2, remaining: 3 }
      },
      salary: 75000,
      manager: 'Joshua Mitchell'
    },
    {
      id: 4,
      name: 'David Kim',
      email: 'david.kim@luxuryrealestate.com',
      phone: '+1 (555) 456-7890',
      department: 'Engineering',
      position: 'Frontend Developer',
      startDate: '2022-09-10',
      status: 'active',
      avatar: 'DK',
      performance: {
        rating: 4.7,
        projectsCompleted: 28,
        onTimeDelivery: 94,
        clientSatisfaction: 4.8,
        lastReview: '2024-01-05'
      },
      skills: ['React', 'JavaScript', 'TypeScript', 'CSS', 'Git'],
      certifications: ['AWS Developer', 'React Advanced'],
      leaveBalance: {
        vacation: { total: 20, used: 6, remaining: 14 },
        sick: { total: 10, used: 0, remaining: 10 },
        personal: { total: 5, used: 1, remaining: 4 }
      },
      salary: 80000,
      manager: 'Joshua Mitchell'
    },
    {
      id: 5,
      name: 'Lisa Thompson',
      email: 'lisa.thompson@luxuryrealestate.com',
      phone: '+1 (555) 567-8901',
      department: 'Marketing',
      position: 'Social Media Manager',
      startDate: '2023-08-15',
      status: 'probation',
      avatar: 'LT',
      performance: {
        rating: 4.2,
        projectsCompleted: 12,
        onTimeDelivery: 88,
        clientSatisfaction: 4.3,
        lastReview: '2024-01-25'
      },
      skills: ['Social Media', 'Content Creation', 'Analytics', 'Community Management'],
      certifications: ['Meta Business Suite', 'Hootsuite'],
      leaveBalance: {
        vacation: { total: 20, used: 3, remaining: 17 },
        sick: { total: 10, used: 1, remaining: 9 },
        personal: { total: 5, used: 0, remaining: 5 }
      },
      salary: 60000,
      manager: 'Joshua Mitchell'
    }
  ]);

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
      case 'active': return 'bg-green-100 text-green-800';
      case 'probation': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    return 'text-red-600';
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
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-2">Manage your team, track performance, and oversee employee development</p>
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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Team</p>
                <p className="text-2xl font-bold text-gray-900">{teamStats.totalMembers}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-bold text-green-600">{teamStats.activeMembers}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600">{teamStats.averageRating}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Tenure</p>
                <p className="text-2xl font-bold text-purple-600">{teamStats.averageTenure} days</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Salary</p>
                <p className="text-2xl font-bold text-indigo-600">${(teamStats.totalSalary / 1000).toFixed(0)}k</p>
              </div>
              <div className="p-3 rounded-full bg-indigo-100">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Probation</p>
                <p className="text-2xl font-bold text-orange-600">{teamStats.probationMembers}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>Department Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(departmentBreakdown).map(([dept, count]) => (
              <div key={dept} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600">{dept}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Team Members ({filteredTeamMembers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Performance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Leave Balance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeamMembers.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {member.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.position}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-gray-900">{member.department}</p>
                        <p className="text-sm text-gray-600">Since {format(new Date(member.startDate), 'MMM yyyy')}</p>
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
                        <p className="text-sm text-gray-600">{member.performance.projectsCompleted} projects</p>
                        <p className="text-xs text-gray-500">{member.performance.onTimeDelivery}% on time</p>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Vacation</span>
                            <span>{member.leaveBalance.vacation.remaining}/{member.leaveBalance.vacation.total}</span>
                          </div>
                          <Progress value={(member.leaveBalance.vacation.remaining / member.leaveBalance.vacation.total) * 100} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
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
      {showEmployeeModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Employee Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowEmployeeModal(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {selectedEmployee.avatar}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h3>
                    <p className="text-lg text-gray-600">{selectedEmployee.position}</p>
                    <p className="text-gray-500">{selectedEmployee.department}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{selectedEmployee.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{selectedEmployee.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">Started {format(new Date(selectedEmployee.startDate), 'MMMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">Reports to {selectedEmployee.manager}</span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Performance Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{selectedEmployee.performance.rating}</p>
                      <p className="text-sm text-blue-700">Overall Rating</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{selectedEmployee.performance.projectsCompleted}</p>
                      <p className="text-sm text-green-700">Projects Completed</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{selectedEmployee.performance.onTimeDelivery}%</p>
                      <p className="text-sm text-yellow-700">On-Time Delivery</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{selectedEmployee.performance.clientSatisfaction}</p>
                      <p className="text-sm text-purple-700">Client Satisfaction</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills and Certifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <GraduationCap className="w-5 h-5" />
                      <span>Skills</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployee.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="w-5 h-5" />
                      <span>Certifications</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployee.certifications.map((cert, index) => (
                        <Badge key={index} variant="outline">{cert}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Leave Balance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Leave Balance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{selectedEmployee.leaveBalance.vacation.remaining}</p>
                      <p className="text-sm text-blue-700">Vacation Days</p>
                      <p className="text-xs text-gray-500">Used: {selectedEmployee.leaveBalance.vacation.used}</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{selectedEmployee.leaveBalance.sick.remaining}</p>
                      <p className="text-sm text-red-700">Sick Days</p>
                      <p className="text-xs text-gray-500">Used: {selectedEmployee.leaveBalance.sick.used}</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{selectedEmployee.leaveBalance.personal.remaining}</p>
                      <p className="text-sm text-purple-700">Personal Days</p>
                      <p className="text-xs text-gray-500">Used: {selectedEmployee.leaveBalance.personal.used}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
