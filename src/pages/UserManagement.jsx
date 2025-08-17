import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePendingUsers } from '../contexts/PendingUsersContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, UserPlus, UserCheck, UserX, Shield, Mail, Calendar, CheckCircle, XCircle, Clock, Search, Filter, Eye, Edit, Trash2, Plus, RefreshCw } from 'lucide-react';

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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [editingUserData, setEditingUserData] = useState({
    firstName: '',
    lastName: '',
    roles: [], // Changed from single role to array of roles
    status: ''
  });
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Admin note: Use the profile switcher (top right) to access other role-specific features
  // This page is for user management only - other features are available through role switching
  
  // Load existing users from localStorage (approved users + mock data)
  const [existingUsers, setExistingUsers] = useState(() => {
    // Load approved users from localStorage
    const approvedUsers = JSON.parse(localStorage.getItem('luxury-listings-approved-users') || '[]');
    
    // Convert approved users to existing users format
    const approvedExistingUsers = approvedUsers.map(user => ({
      id: `approved-${user.email}`,
      email: user.email,
      firstName: user.firstName || user.email.split('@')[0], // Use stored firstName or fallback to email prefix
      lastName: user.lastName || 'User', // Use stored lastName or fallback to 'User'
      roles: user.roles || [user.primaryRole || user.role] || ['content_director'], // Support multiple roles
      primaryRole: user.primaryRole || user.role || 'content_director', // Keep primary role for display
      status: 'active',
      joinedAt: user.approvedAt || new Date().toISOString().split('T')[0],
      lastActive: new Date().toISOString().split('T')[0]
    }));
    
    // No mock users - only show real approved users
    return approvedExistingUsers;
  });

  // Function to get all pending users (now using the real context)
  const getAllPendingUsers = () => {
    return pendingUsers;
  };

  // Function to refresh existing users from localStorage
  const refreshExistingUsers = () => {
    // Load approved users from localStorage
    const approvedUsers = JSON.parse(localStorage.getItem('luxury-listings-approved-users') || '[]');
    
    // Convert approved users to existing users format
    const approvedExistingUsers = approvedUsers.map(user => ({
      id: `approved-${user.email}`,
      email: user.email,
      firstName: user.firstName || user.email.split('@')[0], // Use stored firstName or fallback to email prefix
      lastName: user.lastName || 'User', // Use stored lastName or fallback to 'User'
      roles: user.roles || [user.primaryRole || user.role] || ['content_director'], // Support multiple roles
      primaryRole: user.primaryRole || user.role || 'content_director', // Keep primary role for display
      status: 'active',
      joinedAt: user.approvedAt || new Date().toISOString().split('T')[0],
      lastActive: new Date().toISOString().split('T')[0]
    }));
    
    // No mock users - only show real approved users
    setExistingUsers(approvedExistingUsers);
  };

  // Function to open role assignment modal
  const openRoleAssignment = (user) => {
    setUserToAssignRole(user);
    setSelectedRole(user.requestedRole || 'content_director');
    setShowRoleModal(true);
  };

  // Function to view user profile
  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  // Function to edit user
  const handleEditUser = (user) => {
    setUserToEdit(user);
    setEditingUserData({
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles || [user.primaryRole || user.role] || ['content_director'], // Support multiple roles
      status: user.status
    });
    setShowEditModal(true);
  };

  // Function to show success notification
  const showSuccessNotification = (message) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000); // Auto-hide after 3 seconds
  };

  // Function to save user edits
  const handleSaveUserEdit = () => {
    if (userToEdit && editingUserData) {
      // Update the user in existingUsers
      setExistingUsers(prev => prev.map(user => 
        user.id === userToEdit.id 
          ? { 
              ...user, 
              firstName: editingUserData.firstName,
              lastName: editingUserData.lastName,
              roles: editingUserData.roles, // Support multiple roles
              primaryRole: editingUserData.roles[0] || 'content_director', // Set first role as primary
              status: editingUserData.status
            }
          : user
      ));

      // Always update localStorage for approved users
      if (userToEdit.id.startsWith('approved-')) {
        const approvedUsers = JSON.parse(localStorage.getItem('luxury-listings-approved-users') || '[]');
        const updatedApprovedUsers = approvedUsers.map(u => 
          u.email === userToEdit.email 
            ? { 
                ...u, 
                roles: editingUserData.roles, // Store multiple roles
                primaryRole: editingUserData.roles[0] || 'content_director', // Set first role as primary
                // Store the edited names in localStorage
                firstName: editingUserData.firstName,
                lastName: editingUserData.lastName
              }
            : u
        );
        localStorage.setItem('luxury-listings-approved-users', JSON.stringify(updatedApprovedUsers));
      }

      // Show success notification
      showSuccessNotification(`User ${userToEdit.email} updated successfully!`);
      
      // Close modal and reset
      setShowEditModal(false);
      setUserToEdit(null);
      setEditingUserData({
        firstName: '',
        lastName: '',
        role: '',
        status: ''
      });
    }
  };

  // Function to assign custom role
  const assignCustomRole = () => {
    if (userToAssignRole && selectedRole) {
      // Update the user's requested role using context
      updatePendingUserRole(userToAssignRole.id, selectedRole);
      
      setShowRoleModal(false);
      setUserToAssignRole(null);
      setSelectedRole('');
      
      showSuccessNotification(`Role updated to: ${getRoleDisplayName(selectedRole)}`);
    }
  };

  // Function to handle role changes for existing users
  const handleChangeRole = (userId, newRole) => {
    setExistingUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, role: newRole }
        : user
    ));
    
          // Show success notification
      const user = existingUsers.find(u => u.id === userId);
      if (user) {
        showSuccessNotification(`Role updated for ${user.email} to: ${getRoleDisplayName(newRole)}`);
      }
  };

  // Function to handle status changes for existing users
  const handleChangeStatus = (userId, newStatus) => {
    setExistingUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: newStatus }
        : user
    ));
    
          // Show success notification
      const user = existingUsers.find(u => u.id === userId);
      if (user) {
        showSuccessNotification(`Status updated for ${user.email} to: ${newStatus}`);
      }
  };

  // Function to save all changes for a user
  const handleSaveUserChanges = () => {
    if (selectedUser) {
      // Find the updated user data
      const updatedUser = existingUsers.find(u => u.id === selectedUser.id);
      
      if (updatedUser) {
        // In a real app, this would update Firebase
        console.log('Saving user changes:', updatedUser);
        
        // Show success notification
        showSuccessNotification(`Changes saved for ${updatedUser.email}`);
        
        // Close the modal
        setSelectedUser(null);
      }
    }
  };

  // Function to delete a user
  const handleDeleteUser = (userId) => {
    const user = existingUsers.find(u => u.id === userId);
    
    if (user) {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete ${user.email}? This action cannot be undone.`
      );
      
      if (confirmDelete) {
        // Remove user from existing users
        setExistingUsers(prev => prev.filter(u => u.id !== userId));
        
        // Show success notification
        showSuccessNotification(`User ${user.email} has been deleted.`);
        
        // Close modal if it was open for this user
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(null);
        }
      }
    }
  };



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
      
      // Update the user's roles in localStorage so they can login
      const approvedUserData = {
        email: pendingUser.email,
        firstName: pendingUser.firstName,
        lastName: pendingUser.lastName,
        roles: [pendingUser.requestedRole], // Store as array with initial role
        primaryRole: pendingUser.requestedRole, // Keep primary role for backward compatibility
        isApproved: true,
        approvedAt: new Date().toISOString()
      };
      
      // Store approved user data in localStorage
      const approvedUsers = JSON.parse(localStorage.getItem('luxury-listings-approved-users') || '[]');
      const updatedApprovedUsers = approvedUsers.filter(u => u.email !== pendingUser.email);
      updatedApprovedUsers.push(approvedUserData);
      localStorage.setItem('luxury-listings-approved-users', JSON.stringify(updatedApprovedUsers));
      
      console.log('✅ User approved and role stored:', approvedUserData);
      
      // Refresh the existing users list to show the newly approved user
      refreshExistingUsers();
      
      // Show success notification
      showSuccessNotification(`User ${pendingUser.email} approved with role: ${getRoleDisplayName(pendingUser.requestedRole)}. They can now login!`);
      
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
      
      // Show success notification
      showSuccessNotification(`User ${pendingUser.email} has been rejected. They will need to re-apply.`);
      
      // In a real app, you would also:
      // 1. Update Firebase to mark user as rejected
      // 2. Send email notification to user
      // 3. Log the rejection reason
    }
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
        <div className="flex gap-3">
          <Button onClick={refreshExistingUsers} variant="outline" className="border-gray-300 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Users
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New User
          </Button>
        </div>
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
                      <div className="flex flex-wrap gap-1">
                        {(user.roles || [user.primaryRole || user.role] || ['content_director']).map(role => (
                          <Badge key={role} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            {getRoleDisplayName(role)}
                          </Badge>
                        ))}
                      </div>
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
                        <Button variant="ghost" size="sm" onClick={() => handleViewProfile(user)} className="text-blue-600 hover:text-blue-700">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} className="text-green-600 hover:text-green-700">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteUser(user.id)}
                        >
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

      {/* User Profile View Modal */}
      {showProfileModal && selectedUser && (() => {
        // Get the current user data from existingUsers to show real-time updates
        const currentUserData = existingUsers.find(u => u.id === selectedUser.id);
        if (!currentUserData) return null;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">User Profile</h3>
                <Button variant="ghost" onClick={() => {
                  setShowProfileModal(false);
                  setSelectedUser(null);
                }}>
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="text-center pb-4 border-b border-gray-200">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-blue-600">
                      {currentUserData.firstName.charAt(0)}{currentUserData.lastName.charAt(0)}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{currentUserData.firstName} {currentUserData.lastName}</h2>
                  <p className="text-gray-600">{currentUserData.email}</p>
                </div>
                
                {/* Profile Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
                    <div className="flex flex-wrap gap-2">
                      {(currentUserData.roles || [currentUserData.primaryRole || currentUserData.role] || ['content_director']).map(role => (
                        <Badge key={role} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {getRoleDisplayName(role)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <Badge className={getStatusColor(currentUserData.status)}>
                      {currentUserData.status.charAt(0).toUpperCase() + currentUserData.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Joined Date</label>
                    <p className="text-gray-900">{new Date(currentUserData.joinedAt).toLocaleDateString()}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Active</label>
                    <p className="text-gray-900">{new Date(currentUserData.lastActive).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => {
                  setShowProfileModal(false);
                  setSelectedUser(null);
                }}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowProfileModal(false);
                  handleEditUser(currentUserData);
                }} className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit User
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit User Modal */}
      {showEditModal && userToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Edit User</h3>
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editingUserData.firstName}
                    onChange={(e) => setEditingUserData(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editingUserData.lastName}
                    onChange={(e) => setEditingUserData(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border">{userToEdit.email}</p>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roles (Multiple Selection)</label>
                <div className="space-y-2">
                  {[
                    { value: 'content_director', label: 'Content Manager' },
                    { value: 'social_media_manager', label: 'Social Media Manager' },
                    { value: 'hr_manager', label: 'HR Manager' },
                    { value: 'sales_manager', label: 'Sales Manager' }
                  ].map(roleOption => (
                    <label key={roleOption.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingUserData.roles.includes(roleOption.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingUserData(prev => ({
                              ...prev,
                              roles: [...prev.roles, roleOption.value]
                            }));
                          } else {
                            setEditingUserData(prev => ({
                              ...prev,
                              roles: prev.roles.filter(r => r !== roleOption.value)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{roleOption.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Select multiple roles for this user</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={editingUserData.status}
                  onChange={(e) => setEditingUserData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUserEdit} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
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

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ease-in-out">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
