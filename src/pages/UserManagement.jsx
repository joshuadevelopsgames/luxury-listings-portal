import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Mail, 
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Phone,
  MapPin,
  Briefcase,
  Clock,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePendingUsers } from '../contexts/PendingUsersContext';
import { firestoreService } from '../services/firestoreService';
import { USER_ROLES } from '../entities/UserRoles';

const UserManagement = () => {
  const { currentUser, hasPermission } = useAuth();
  const { pendingUsers, removePendingUser, approveUser, updatePendingUserRole, refreshPendingUsers } = usePendingUsers();
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Load approved users from Firestore
  useEffect(() => {
    const loadApprovedUsers = async () => {
      try {
        setLoading(true);
        const users = await firestoreService.getApprovedUsers();
        setApprovedUsers(users);
      } catch (error) {
        console.error('Error loading approved users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadApprovedUsers();
  }, []);

  // Subscribe to real-time approved users changes
  useEffect(() => {
    const unsubscribe = firestoreService.onApprovedUsersChange((users) => {
      console.log('📡 Approved users updated:', users);
      setApprovedUsers(users);
    });

    return () => unsubscribe();
  }, []);

  // Debug function to show all pending users
  const debugPendingUsers = () => {
    console.log('🔍 DEBUG: All pending users:');
    pendingUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ID: ${user.id}, Email: ${user.email}, Created: ${user.createdAt}`);
    });
  };

  // Call debug function when component loads
  useEffect(() => {
    debugPendingUsers();
  }, [pendingUsers]);

  const handleApproveUserAsAdmin = async (pendingUser) => {
    try {
      console.log('✅ Approving user as admin:', pendingUser);
      console.log('🔍 Pending user ID:', pendingUser.id);
      console.log('🔍 Pending user email:', pendingUser.email);
      
      // Create approved user data with admin role
      const approvedUserData = {
        email: pendingUser.email,
        firstName: pendingUser.firstName || 'Joshua',
        lastName: pendingUser.lastName || 'Schroeder',
        role: 'admin',
        primaryRole: 'admin',
        roles: ['admin'],
        bio: pendingUser.bio || 'System Administrator',
        skills: pendingUser.skills || ['System Administration', 'User Management', 'Role Assignment'],
        isApproved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser.email,
        uid: pendingUser.uid || `admin-${Date.now()}`, // Generate uid if not present
        displayName: pendingUser.displayName || 'Joshua Schroeder',
        department: 'Administration',
        startDate: new Date().toISOString().split('T')[0],
        phone: pendingUser.phone || '',
        location: pendingUser.location || 'Remote',
        avatar: pendingUser.avatar || ''
      };

      console.log('🔍 Approved user data:', approvedUserData);

      // Remove any undefined values to prevent Firestore errors
      Object.keys(approvedUserData).forEach(key => {
        if (approvedUserData[key] === undefined) {
          delete approvedUserData[key];
        }
      });

      console.log('🔍 Cleaned approved user data:', approvedUserData);

      // Approve the user as admin
      console.log('🔄 Calling firestoreService.approveUser...');
      await approveUser(pendingUser.id, approvedUserData);
      
      console.log('✅ User approved as admin successfully');
      
      // Refresh from Firestore to ensure permanent changes are loaded
      console.log('🔄 Refreshing from Firestore to confirm permanent changes...');
      await handleRefreshUsers();
      
    } catch (error) {
      console.error('❌ Error approving user as admin:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert('Failed to approve user as admin. Please try again.');
    }
  };

  const handleApproveUser = async (pendingUser) => {
    try {
      console.log('✅ Approving user:', pendingUser);
      
      // Create approved user data
      const approvedUserData = {
        email: pendingUser.email,
        firstName: pendingUser.firstName || 'User',
        lastName: pendingUser.lastName || 'Name',
        role: pendingUser.requestedRole || 'content_director',
        primaryRole: pendingUser.requestedRole || 'content_director',
        roles: [pendingUser.requestedRole || 'content_director'],
        bio: pendingUser.bio || '',
        skills: pendingUser.skills || [],
        isApproved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser.email,
        uid: pendingUser.uid || `user-${Date.now()}`, // Generate uid if not present
        displayName: pendingUser.displayName || `${pendingUser.firstName || 'User'} ${pendingUser.lastName || 'Name'}`,
        department: getDepartmentForRole(pendingUser.requestedRole || 'content_director'),
        startDate: new Date().toISOString().split('T')[0],
        phone: pendingUser.phone || '',
        location: pendingUser.location || 'Remote',
        avatar: pendingUser.avatar || ''
      };

      // Remove any undefined values to prevent Firestore errors
      Object.keys(approvedUserData).forEach(key => {
        if (approvedUserData[key] === undefined) {
          delete approvedUserData[key];
        }
      });

      // Approve the user (this will move them from pending to approved)
      await firestoreService.approveUser(pendingUser.id, approvedUserData);
      
      console.log('✅ User approved successfully');
    } catch (error) {
      console.error('❌ Error approving user:', error);
      alert('Failed to approve user. Please try again.');
    }
  };

  const handleRejectUser = async (pendingUser) => {
    try {
      console.log('❌ Rejecting user:', pendingUser);
      console.log('🔍 Pending user ID:', pendingUser.id);
      console.log('🔍 Pending user email:', pendingUser.email);
      
      // Find all users with the same email (in case of duplicates)
      const usersWithSameEmail = pendingUsers.filter(user => user.email === pendingUser.email);
      console.log('🔍 Found users with same email:', usersWithSameEmail.length);
      
      if (usersWithSameEmail.length > 1) {
        console.log('⚠️ Multiple users with same email found. Removing all...');
        // Remove all users with the same email
        for (const user of usersWithSameEmail) {
          console.log('🗑️ Removing duplicate user:', user.id);
          try {
            await removePendingUser(user.id);
            console.log('✅ Successfully removed user:', user.id);
          } catch (error) {
            console.error('❌ Failed to remove user:', user.id, error);
          }
        }
      } else {
        console.log('🔍 Calling removePendingUser...');
        await removePendingUser(pendingUser.id);
      }
      
      console.log('✅ User rejected successfully');
      
      // Refresh from Firestore to ensure permanent changes are loaded
      console.log('🔄 Refreshing from Firestore to confirm permanent changes...');
      await handleRefreshUsers();
      
    } catch (error) {
      console.error('❌ Error rejecting user:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert('Failed to reject user. Please try again.');
    }
  };

  const handleUpdateUserRole = async (pendingUser, newRole) => {
    try {
      console.log('🔄 Updating user role:', pendingUser.email, 'to', newRole);
      await updatePendingUserRole(pendingUser.id, newRole);
      console.log('✅ User role updated successfully');
    } catch (error) {
      console.error('❌ Error updating user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  const handleUpdateApprovedUser = async (userEmail, updates) => {
    try {
      console.log('🔄 Updating approved user:', userEmail, updates);
      await firestoreService.updateApprovedUser(userEmail, updates);
      console.log('✅ Approved user updated successfully');
    } catch (error) {
      console.error('❌ Error updating approved user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleDeleteApprovedUser = async (userEmail) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting approved user:', userEmail);
      await firestoreService.deleteApprovedUser(userEmail);
      console.log('✅ Approved user deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting approved user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const handleFixUserRoles = async () => {
    try {
      console.log('🔧 Fixing user roles...');
      
      // Fix Joshua's role specifically
      if (approvedUsers.find(user => user.email === 'joshua@luxury-listings.com')) {
        console.log('🔄 Fixing Joshua\'s role to content_director...');
        await handleUpdateApprovedUser('joshua@luxury-listings.com', { 
          role: 'content_director',
          primaryRole: 'content_director',
          roles: ['content_director']
        });
      }
      
      // Fix any other users with content_creator role
      const usersToFix = approvedUsers.filter(user => user.role === 'content_creator');
      for (const user of usersToFix) {
        console.log(`🔄 Fixing ${user.email} role from content_creator to content_director...`);
        await handleUpdateApprovedUser(user.email, { 
          role: 'content_director',
          primaryRole: 'content_director',
          roles: ['content_director']
        });
      }
      
      console.log('✅ User roles fixed successfully');
      alert('User roles have been fixed!');
    } catch (error) {
      console.error('❌ Error fixing user roles:', error);
      alert('Failed to fix user roles. Please try again.');
    }
  };

  // Function to clean up duplicate pending users
  const handleCleanDuplicates = async () => {
    try {
      console.log('🧹 Cleaning up duplicate pending users...');
      
      // Group users by email
      const emailGroups = {};
      pendingUsers.forEach(user => {
        if (!emailGroups[user.email]) {
          emailGroups[user.email] = [];
        }
        emailGroups[user.email].push(user);
      });
      
      // Remove duplicates (keep only the first one)
      let removedCount = 0;
      for (const [email, users] of Object.entries(emailGroups)) {
        if (users.length > 1) {
          console.log(`🗑️ Found ${users.length} users with email ${email}. Removing duplicates...`);
          // Keep the first user, remove the rest
          for (let i = 1; i < users.length; i++) {
            console.log(`🗑️ Removing duplicate user: ${users[i].id}`);
            await removePendingUser(users[i].id);
            removedCount++;
          }
        }
      }
      
      console.log(`✅ Cleaned up ${removedCount} duplicate users`);
      alert(`Cleaned up ${removedCount} duplicate users`);
      
      // Refresh from Firestore to ensure permanent changes are loaded
      console.log('🔄 Refreshing from Firestore to confirm permanent changes...');
      await handleRefreshUsers();
      
    } catch (error) {
      console.error('❌ Error cleaning duplicates:', error);
      alert('Failed to clean duplicates. Please try again.');
    }
  };

  // Function to refresh pending users from Firestore
  const handleRefreshUsers = async () => {
    try {
      console.log('🔄 Refreshing pending users from Firestore...');
      setLoading(true);
      
      // Load current pending users from Firestore
      const currentPendingUsers = await firestoreService.getPendingUsers();
      console.log('📡 Loaded pending users from Firestore:', currentPendingUsers);
      
      // Update the context with the fresh data
      await refreshPendingUsers();
      
      console.log('✅ Pending users refreshed successfully');
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Error refreshing pending users:', error);
      alert('Failed to refresh pending users. Please try again.');
      setLoading(false);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const getRoleDisplayName = (role) => {
    if (!role) return 'Unknown Role';
    
    const roleNames = {
      'admin': 'System Administrator',
      'content_director': 'Content Manager',
      'social_media_manager': 'Social Media Manager',
      'hr_manager': 'HR Manager',
      'sales_manager': 'Sales Manager',
      'pending': 'Pending Approval'
    };
    return roleNames[role] || role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getRoleBadgeColor = (role) => {
    if (!role) return 'bg-gray-100 text-gray-800';
    
    const colors = {
      'admin': 'bg-red-100 text-red-800',
      'content_director': 'bg-blue-100 text-blue-800',
      'social_media_manager': 'bg-purple-100 text-purple-800',
      'hr_manager': 'bg-green-100 text-green-800',
      'sales_manager': 'bg-orange-100 text-orange-800',
      'pending': 'bg-yellow-100 text-yellow-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getDepartmentForRole = (role) => {
    if (!role) return 'General';
    
    const departments = {
      'admin': 'Administration',
      'content_director': 'Content & Creative',
      'social_media_manager': 'Marketing',
      'hr_manager': 'Human Resources',
      'sales_manager': 'Sales'
    };
    return departments[role] || 'General';
  };

  const UserProfileModal = ({ user, isOpen, onClose }) => {
    if (!isOpen || !user) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">User Profile</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-16 h-16 rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-gray-500" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{user.firstName} {user.lastName}</h3>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Role: {getRoleDisplayName(user.role)}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Department: {getDepartmentForRole(user.role)}</span>
              </div>
              
              {user.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Phone: {user.phone}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {user.isApproved ? 'Approved' : 'Requested'}: {new Date(user.approvedAt || user.requestedAt).toLocaleDateString()}
                </span>
              </div>
              
              {user.bio && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Bio:</p>
                  <p className="text-sm text-gray-600">{user.bio}</p>
                </div>
              )}
              
              {user.skills && user.skills.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {user.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const EditUserModal = ({ user, isOpen, onClose }) => {
    const [formData, setFormData] = useState({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      role: user?.role || 'content_director',
      bio: user?.bio || '',
      phone: user?.phone || '',
      location: user?.location || 'Remote'
    });

    useEffect(() => {
      if (user) {
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.role || 'content_director',
          bio: user.bio || '',
          phone: user.phone || '',
          location: user.location || 'Remote'
        });
      }
    }, [user]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        await handleUpdateApprovedUser(user.email, formData);
        onClose();
      } catch (error) {
        console.error('Error updating user:', error);
      }
    };

    if (!isOpen || !user) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Edit User</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="content_director">Content Manager</option>
                <option value="social_media_manager">Social Media Manager</option>
                <option value="hr_manager">HR Manager</option>
                <option value="sales_manager">Sales Manager</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (!hasPermission('manage_users')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">You don't have permission to access user management.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">User Management</h1>
          <p className="text-slate-600">Manage team members and access permissions</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">{approvedUsers.length}</div>
            <div className="text-sm text-slate-600">Approved Users</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600">{pendingUsers.length}</div>
            <div className="text-sm text-slate-600">Pending Approval</div>
          </div>
          <Button
            onClick={handleFixUserRoles}
            variant="outline"
            className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
          >
            🔧 Fix User Roles
          </Button>
          <Button
            onClick={handleCleanDuplicates}
            variant="outline"
            className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
          >
            🧹 Clean Duplicates
          </Button>
          <Button
            onClick={handleRefreshUsers}
            variant="outline"
            className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            🔄 Refresh Pending Users
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Pending Approval ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Approved Users ({approvedUsers.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-4">
          {activeTab === "pending" && (
            pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <UserCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Users</h3>
                  <p className="text-gray-600">All user requests have been processed.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingUsers.map((user) => (
                <Card key={user.id} className="border-orange-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{user.firstName} {user.lastName}</CardTitle>
                      <Badge variant="outline" className="border-orange-300 text-orange-700">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        Requested: {new Date(user.requestedAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Requested Role:</span>
                        <Badge className={getRoleBadgeColor(user.requestedRole)}>
                          {getRoleDisplayName(user.requestedRole)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleViewUser(user)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      {user.email === 'jrsschroeder@gmail.com' ? (
                        <Button
                          size="sm"
                          onClick={() => handleApproveUserAsAdmin(user)}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve as Admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleApproveUser(user)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectUser(user)}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
        </div>

        <div className="mt-6 space-y-4">
          {activeTab === "approved" && (
            approvedUsers.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Approved Users</h3>
                  <p className="text-gray-600">No users have been approved yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedUsers.map((user) => (
                <Card key={user.email} className="border-green-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{user.firstName} {user.lastName}</CardTitle>
                      <Badge variant="outline" className="border-green-300 text-green-700">
                        Approved
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Role:</span>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>
                      {user.approvedAt && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          Approved: {new Date(user.approvedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewUser(user)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(user)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteApprovedUser(user.email)}
                        className="flex-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
        </div>
      </Tabs>

      <UserProfileModal
        user={selectedUser}
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
      />

      <EditUserModal
        user={editingUser}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
};

export default UserManagement;
