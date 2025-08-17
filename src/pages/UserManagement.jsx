import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePendingUsers } from '../contexts/PendingUsersContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, UserPlus, UserCheck, UserX, Shield, Mail, Calendar, CheckCircle, XCircle, Clock, Search, Filter, Eye, Edit, Trash2, Plus } from 'lucide-react';

const UserManagement = () => {
  const { currentUser, currentRole } = useAuth();
  const { pendingUsers, removePendingUser, updatePendingUserRole } = usePendingUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userToAssignRole, setUserToAssignRole] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  // Admin note: Use the profile switcher (top right) to access other role-specific features
  // This page is for user management only - other features are available through role switching
  
  // Mock data for existing users (in a real app, this would come from Firebase)
  const [existingUsers, setExistingUsers] = useState([
    {
      id: 'user-001',
      email: 'joshua.mitchell@luxuryrealestate.com',
      firstName: 'Joshua',
      lastName: 'Mitchell',
      role: 'content_director',
      status: 'active',
      joinedAt: '2023-01-15',
      lastActive: '2025-01-15'
    },
    {
      id: 'user-002',
      email: 'michelle.chen@luxuryrealestate.com',
      firstName: 'Michelle',
      lastName: 'Chen',
      role: 'social_media_manager',
      status: 'active',
      joinedAt: '2023-06-20',
      lastActive: '2025-01-15'
    },
    {
      id: 'user-003',
      email: 'matthew.rodriguez@luxuryrealestate.com',
      firstName: 'Matthew',
      lastName: 'Rodriguez',
      role: 'hr_manager',
      status: 'active',
      joinedAt: '2022-09-10',
      lastActive: '2025-01-14'
    },
    {
      id: 'user-004',
      email: 'emily.watson@luxuryrealestate.com',
      firstName: 'Emily',
      lastName: 'Watson',
      role: 'sales_manager',
      status: 'active',
      joinedAt: '2023-03-15',
      lastActive: '2025-01-15'
    }
  ]);

  // Function to get all pending users (now using the real context)
  const getAllPendingUsers = () => {
    return pendingUsers;
  };

  // Function to open role assignment modal
  const openRoleAssignment = (user) => {
    setUserToAssignRole(user);
    setSelectedRole(user.requestedRole || 'content_director');
    setShowRoleModal(true);
  };

  // Function to assign custom role
  const assignCustomRole = () => {
    if (userToAssignRole && selectedRole) {
      // Update the user's requested role using context
      updatePendingUserRole(userToAssignRole.id, selectedRole);
      
      setShowRoleModal(false);
      setUserToAssignRole(null);
      setSelectedRole('');
      
      alert(`Role updated to: ${getRoleDisplayName(selectedRole)}`);
    }
  };

  const existingUsers = [
    {
      id: 'user-001',
      email: 'joshua.mitchell@luxuryrealestate.com',
      firstName: 'Joshua',
      lastName: 'Mitchell',
      role: 'content_director',
      status: 'active',
      joinedAt: '2023-01-15',
      lastActive: '2025-01-15'
    },
    {
      id: 'user-002',
      email: 'michelle.chen@luxuryrealestate.com',
      firstName: 'Michelle',
      lastName: 'Chen',
      role: 'social_media_manager',
      status: 'active',
      joinedAt: '2023-06-20',
      lastActive: '2025-01-15'
    },
    {
      id: 'user-003',
      email: 'matthew.rodriguez@luxuryrealestate.com',
      firstName: 'Matthew',
      lastName: 'Rodriguez',
      role: 'hr_manager',
      status: 'active',
      joinedAt: '2022-09-10',
      lastActive: '2025-01-14'
    },
    {
      id: 'user-004',
      email: 'emily.watson@luxuryrealestate.com',
      firstName: 'Emily',
      lastName: 'Watson',
      role: 'sales_manager',
      status: 'active',
      joinedAt: '2023-03-15',
      lastActive: '2025-01-15'
    }
  ];

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'System Admin',
      'content_director': 'Content Manager',
      'social_media_manager': 'Social Media Manager',
      'hr_manager': 'HR Manager',
      'sales_manager': 'Sales Manager'
    };
    return roleNames[role] || role;
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'suspended': 'bg-red-100 text-red-800',
      'inactive': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.inactive;
  };

  const handleApproveUser = (userId) => {
    console.log('Approving user:', userId);
    
    // Find the pending user
    const allPendingUsers = getAllPendingUsers();
    const pendingUser = allPendingUsers.find(user => user.id === userId);
    
    if (pendingUser) {
      // In a real app, this would update Firebase
      console.log('User approved:', pendingUser.email, 'Role assigned:', pendingUser.requestedRole);
      
      // Remove from pending users using context
      removePendingUser(userId);
      
      // Add to existing users
      const newExistingUser = {
        id: `user-${Date.now()}`,
        email: pendingUser.email,
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        role: pendingUser.requestedRole,
        status: 'active',
        joinedAt: new Date().toISOString().split('T')[0],
        lastActive: new Date().toISOString().split('T')[0]
      };
      
      setExistingUsers(prev => [...prev, newExistingUser]);
      
      // Show success message
      alert(`User ${pendingUser.email} approved with role: ${getRoleDisplayName(pendingUser.requestedRole)}`);
      
      // In a real app, you would also:
      // 1. Update the user's role in Firebase
      // 2. Update the UserRoleMapping
      // 3. Send email notification to user
    }
  };

  const handleRejectUser = (userId) => {
    console.log('Rejecting user:', userId);
    
    // Find the pending user
    const allPendingUsers = getAllPendingUsers();
    const pendingUser = allPendingUsers.find(user => user.id === userId);
    
    if (pendingUser) {
      // Remove from pending users using context
      removePendingUser(userId);
      
      // Show rejection message
      alert(`User ${pendingUser.email} has been rejected. They will need to re-apply.`);
      
      // In a real app, you would also:
      // 1. Update Firebase to mark user as rejected
      // 2. Send email notification to user
      // 3. Log the rejection reason
    }
  };

  const handleChangeRole = (userId, newRole) => {
    // In a real app, this would update the database
    console.log('Changing role for user:', userId, 'to:', newRole);
  };

  const filteredPendingUsers = pendingUsers.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExistingUsers = existingUsers.filter(user =>
    (user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || user.status === filterStatus)
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage user accounts, roles, and permissions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Admin Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">Admin Access Note</h3>
            <p className="text-sm text-blue-700 mt-1">
              This page is for user management only. To access other role-specific features (Tutorials, HR Calendar, CRM, etc.), 
              use the <strong>Profile Switcher</strong> in the top-right corner to switch between different roles.
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-2">Total Users</p>
                <p className="text-3xl font-bold text-blue-900">{existingUsers.length + pendingUsers.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-200">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Active Users</p>
                <p className="text-3xl font-bold text-green-900">{existingUsers.filter(u => u.status === 'active').length}</p>
              </div>
              <div className="p-3 rounded-full bg-green-200">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-2">Pending Approvals</p>
                <p className="text-3xl font-bold text-yellow-900">{pendingUsers.length}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-200">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-2">System Uptime</p>
                <p className="text-3xl font-bold text-purple-900">99.9%</p>
              </div>
              <div className="p-3 rounded-full bg-purple-200">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Pending Approvals ({pendingUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Requested Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Requested Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Bio</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendingUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {getRoleDisplayName(user.requestedRole)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(user.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate">{user.bio}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleApproveUser(user.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRejectUser(user.id)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
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

      {/* Existing Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Active Users ({existingUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Joined</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Last Active</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExistingUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(user.status)}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(user.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(user.lastActive).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)} className="text-blue-600 hover:text-blue-700">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)} className="text-green-600 hover:text-green-700">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
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

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">User Details</h3>
              <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{selectedUser.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedUser.role}
                  onChange={(e) => handleChangeRole(selectedUser.id, e.target.value)}
                >
                  <option value="content_director">Content Manager</option>
                  <option value="social_media_manager">Social Media Manager</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="sales_manager">Sales Manager</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedUser.status}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cancel
              </Button>
              <Button onClick={() => setSelectedUser(null)}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleModal && userToAssignRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Assign Role</h3>
              <Button variant="ghost" onClick={() => setShowRoleModal(false)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <p className="text-gray-900">{userToAssignRole.firstName} {userToAssignRole.lastName}</p>
                <p className="text-sm text-gray-500">{userToAssignRole.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Role</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="content_director">Content Manager</option>
                  <option value="social_media_manager">Social Media Manager</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="sales_manager">Sales Manager</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowRoleModal(false)}>
                Cancel
              </Button>
              <Button onClick={assignCustomRole}>
                Assign Role
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
