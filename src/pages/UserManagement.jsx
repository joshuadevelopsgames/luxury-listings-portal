import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
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
  User,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { usePendingUsers } from '../contexts/PendingUsersContext';
import { firestoreService } from '../services/firestoreService';
import { USER_ROLES } from '../entities/UserRoles';
import { auth } from '../firebase';
import { PERMISSIONS, PERMISSION_CATEGORIES, PERMISSION_LABELS } from '../entities/Permissions';

const UserManagement = () => {
  const { currentUser, hasPermission } = useAuth();
  const { pendingUsers, removePendingUser, approveUser, updatePendingUserRole, refreshPendingUsers } = usePendingUsers();
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firestoreStatus, setFirestoreStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // Prevent multiple simultaneous operations
  const approvedUsersListenerIdRef = useRef(null);
  const [showRoleAssignmentModal, setShowRoleAssignmentModal] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    department: '',
    roles: [],
    phone: '',
    location: ''
  });
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [showUnifiedManageModal, setShowUnifiedManageModal] = useState(false);
  const [managedUser, setManagedUser] = useState(null);
  const [userPagePermissions, setUserPagePermissions] = useState([]);
  const [manageModalTab, setManageModalTab] = useState('basic');
  
  // Available pages for page permissions
  const AVAILABLE_PAGES = [
    { id: 'dashboard', name: 'Dashboard', icon: '🏠', category: 'Core' },
    { id: 'tasks', name: 'Tasks', icon: '✅', category: 'Core' },
    { id: 'clients', name: 'Clients', icon: '👥', category: 'Client Management' },
    { id: 'client-packages', name: 'Client Packages', icon: '📦', category: 'Client Management' },
    { id: 'content-calendar', name: 'Content Calendar', icon: '📅', category: 'Content' },
    { id: 'crm', name: 'CRM', icon: '💼', category: 'Sales' },
    { id: 'hr-calendar', name: 'HR Calendar', icon: '📆', category: 'HR' },
    { id: 'team', name: 'Team Management', icon: '👨‍👩‍👧‍👦', category: 'HR' },
    { id: 'analytics', name: 'Analytics', icon: '📊', category: 'Analytics' },
    { id: 'it-support', name: 'IT Support', icon: '🛠️', category: 'Support' },
    { id: 'my-time-off', name: 'My Time Off', icon: '🏖️', category: 'HR' },
    { id: 'user-management', name: 'User Management', icon: '👤', category: 'Admin' },
  ];

  // Debug logging for component renders
  console.log('🔍 DEBUG: UserManagement component rendered');
  console.log('🔍 DEBUG: pendingUsers count:', pendingUsers.length);
  console.log('🔍 DEBUG: approvedUsers count:', approvedUsers.length);
  console.log('🔍 DEBUG: loading state:', loading);
  console.log('🔍 DEBUG: isProcessing state:', isProcessing);
  console.log('🔍 DEBUG: firestoreStatus:', firestoreStatus);

  // Load approved users from Firestore
  useEffect(() => {
    console.log('🔍 DEBUG: loadApprovedUsers useEffect triggered');
    const loadApprovedUsers = async () => {
      try {
        console.log('🔍 DEBUG: Starting loadApprovedUsers...');
        setLoading(true);
        const users = await firestoreService.getApprovedUsers();
        console.log('🔍 DEBUG: Loaded approved users:', users.length);
        console.log('🔍 DEBUG: Approved users emails:', users.map(u => u.email));
        setApprovedUsers(users);
        console.log('🔍 DEBUG: Approved users state updated');
      } catch (error) {
        console.error('Error loading approved users:', error);
        console.error('🔍 DEBUG: Error stack:', error.stack);
        console.warn('⚠️ Setting empty approved users list due to error');
        setApprovedUsers([]);
      } finally {
        setLoading(false);
        console.log('🔍 DEBUG: Loading set to false');
      }
    };

    loadApprovedUsers();
  }, []);

  // Subscribe to real-time approved users changes
  useEffect(() => {
    console.log('🔄 Setting up approved users real-time listener...');
    
    // TEMPORARILY DISABLED: Use manual loading only to prevent infinite loops
    console.log('⚠️ Approved users real-time listener temporarily disabled to prevent infinite loops');
    
    // Return empty cleanup function since listener is disabled
    return () => {
      console.log('🔄 Approved users real-time listener cleanup (disabled)');
    };
    
    /* DISABLED REAL-TIME LISTENER CODE:
    // Generate a unique listener ID to prevent multiple listeners
    const listenerId = `approved-users-${Date.now()}-${Math.random()}`;
    approvedUsersListenerIdRef.current = listenerId;
    
    const unsubscribe = firestoreService.onApprovedUsersChange((users) => {
      // Only process updates from this listener instance
      if (approvedUsersListenerIdRef.current !== listenerId) {
        console.log('📡 Ignoring approved users update from old listener instance');
        return;
      }
      
      console.log('📡 Approved users updated:', users);
      setApprovedUsers(users);
    });

    return () => {
      console.log('🔄 Cleaning up approved users listener...');
      // Clear the listener ID to prevent processing updates from this listener
      if (approvedUsersListenerIdRef.current === listenerId) {
        approvedUsersListenerIdRef.current = null;
      }
      unsubscribe();
    };
    */
  }, []);

  // Debug function to show all pending users (only call manually if needed)
  const debugPendingUsers = () => {
    console.log('🔍 DEBUG: All pending users:');
    pendingUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ID: ${user.id}, Email: ${user.email}, Created: ${user.createdAt}`);
    });
  };

  const handleApproveUserAsAdmin = async (pendingUser) => {
    if (isProcessing) {
      console.log('⏳ Already processing an operation, skipping...');
      return;
    }
    
    try {
      setIsProcessing(true);
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
      console.log('🔄 Calling approveUser from context...');
      await approveUser(pendingUser.id, approvedUserData);

      console.log('✅ User approved as admin successfully');
      
      // Don't call handleRefreshUsers here - let the real-time listener handle it
      
    } catch (error) {
      console.error('❌ Error approving user as admin:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert('Failed to approve user as admin. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveUser = async (pendingUser) => {
    try {
      console.log('✅ Approving user:', pendingUser);
      
      // Create approved user data with support for multiple roles
      const approvedUserData = {
        email: pendingUser.email,
        firstName: pendingUser.firstName || 'User',
        lastName: pendingUser.lastName || 'Name',
        role: pendingUser.requestedRole || 'content_director', // Keep for backward compatibility
        primaryRole: pendingUser.requestedRole || 'content_director', // Primary role
        roles: [pendingUser.requestedRole || 'content_director'], // Array of all roles
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
      
      // Automatically grant Google Drive folder access based on role
      try {
        const { googleDriveService } = await import('../services/googleDriveService');
        const primaryRole = approvedUserData.primaryRole || approvedUserData.role;
        await googleDriveService.grantFolderAccess(approvedUserData.email, primaryRole);
        console.log('✅ Google Drive access granted');
      } catch (driveError) {
        console.warn('⚠️ Could not grant Google Drive access:', driveError.message);
        // Don't fail user approval if Drive access fails
      }
      
      console.log('✅ User approved successfully');
    } catch (error) {
      console.error('❌ Error approving user:', error);
      alert('Failed to approve user. Please try again.');
    }
  };

  const handleRejectUser = async (pendingUser) => {
    if (isProcessing) {
      console.log('⏳ Already processing an operation, skipping...');
      return;
    }
    
    try {
      setIsProcessing(true);
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
      
      // Don't call handleRefreshUsers here - let the real-time listener handle it
      
    } catch (error) {
      console.error('❌ Error rejecting user:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert('Failed to reject user. Please try again.');
    } finally {
      setIsProcessing(false);
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
      
      // Validate inputs
      if (!userEmail || !updates) {
        throw new Error('Invalid input: userEmail and updates are required');
      }
      
      // Check if user exists in approved users
      const userExists = approvedUsers.find(user => user.email === userEmail);
      if (!userExists) {
        throw new Error(`User ${userEmail} not found in approved users`);
      }
      
      await firestoreService.updateApprovedUser(userEmail, updates);
      console.log('✅ Approved user updated successfully');
      
      // Update local state immediately for better UX
      setApprovedUsers(prevUsers => 
        prevUsers.map(user => 
          user.email === userEmail 
            ? { ...user, ...updates }
            : user
        )
      );
      
    } catch (error) {
      console.error('❌ Error updating approved user:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to update user. Please try again.';
      
      if (error.message.includes('permission-denied')) {
        errorMessage = 'Permission denied. You may not have the required permissions to update this user.';
      } else if (error.message.includes('unavailable')) {
        errorMessage = 'Service temporarily unavailable. Please check your internet connection and try again.';
      } else if (error.message.includes('not-found')) {
        errorMessage = 'User not found. The user may have been deleted.';
      } else if (error.message.includes('Invalid input')) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage); // Re-throw with better message
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
    if (isProcessing) {
      console.log('⏳ Already processing an operation, skipping...');
      return;
    }
    try {
      setIsProcessing(true);
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
            try {
              await removePendingUser(users[i].id);
              removedCount++;
            } catch (error) {
              console.error('❌ Failed to remove user:', users[i].id, error);
            }
          }
        }
      }
      
      console.log(`✅ Cleaned up ${removedCount} duplicate users`);
      alert(`Cleaned up ${removedCount} duplicate users`);
      
      // Don't call handleRefreshUsers here - let the real-time listener handle it
      
    } catch (error) {
      console.error('❌ Error cleaning duplicates:', error);
      alert('Failed to clean duplicates. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to refresh pending users from Firestore
  const handleRefreshUsers = async () => {
    console.log('🔍 DEBUG: handleRefreshUsers called');
    console.log('🔍 DEBUG: Current pendingUsers count before refresh:', pendingUsers.length);
    console.log('🔍 DEBUG: Current approvedUsers count before refresh:', approvedUsers.length);
    
    try {
      console.log('🔄 Refreshing users from Firestore...');
      setLoading(true);
      setFirestoreStatus('loading');
      
      // Load current pending users from Firestore
      const currentPendingUsers = await firestoreService.getPendingUsers();
      console.log('📡 Loaded pending users from Firestore:', currentPendingUsers);
      console.log('🔍 DEBUG: Pending users from Firestore:', currentPendingUsers.map(u => ({ id: u.id, email: u.email })));
      
      // Load current approved users from Firestore
      const currentApprovedUsers = await firestoreService.getApprovedUsers();
      console.log('📡 Loaded approved users from Firestore:', currentApprovedUsers);
      console.log('🔍 DEBUG: Approved users from Firestore:', currentApprovedUsers.map(u => ({ id: u.id, email: u.email })));
      
      // Update the context with the fresh data
      console.log('🔍 DEBUG: Calling refreshPendingUsers from context...');
      await refreshPendingUsers();
      
      // Update approved users state
      console.log('🔍 DEBUG: Setting approved users state...');
      setApprovedUsers(currentApprovedUsers);
      
      // Show success message with count
      const message = `✅ Refreshed! Found ${currentPendingUsers.length} pending users and ${currentApprovedUsers.length} approved users in Firestore`;
      console.log(message);
      setFirestoreStatus('success');
      
      // Auto-clear success status after 3 seconds
      setTimeout(() => setFirestoreStatus('idle'), 3000);
      
      console.log('✅ Users refreshed successfully');
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Error refreshing users:', error);
      console.error('🔍 DEBUG: Error stack:', error.stack);
      setFirestoreStatus('error');
      alert('Failed to refresh users. Please try again.');
      setLoading(false);
      
      // Auto-clear error status after 5 seconds
      setTimeout(() => setFirestoreStatus('idle'), 5000);
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
      'pending': 'bg-gray-100 text-gray-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  // Function to handle role assignment modal
  const handleAssignRoles = (user) => {
    setSelectedUserForRoles(user);
    setSelectedRoles(user.roles || [user.role] || []);
    setShowRoleAssignmentModal(true);
  };

  // Function to handle unified manage user modal
  const handleManageUser = async (user) => {
    console.log('🔧 Opening unified manage modal for user:', user);
    setManagedUser(user);
    
    // Load page permissions
    try {
      const pagePerms = await firestoreService.getUserPagePermissions(user.email);
      setUserPagePermissions(pagePerms || []);
    } catch (error) {
      console.error('Error loading page permissions:', error);
      setUserPagePermissions([]);
    }
    
    // Set other states
    setSelectedRoles(user.roles || [user.role] || []);
    setSelectedPermissions(user.customPermissions || []);
    setShowUnifiedManageModal(true);
  };

  // Function to handle permissions modal (legacy - keeping for backward compatibility)
  const handleManagePermissions = (user) => {
    handleManageUser(user);
  };

  // Function to save custom permissions
  const handleSavePermissions = async () => {
    console.log('🚀 SAVE PERMISSIONS CLICKED!');
    console.log('👤 User:', selectedUserForPermissions);
    console.log('🔐 Permissions:', selectedPermissions);
    
    try {
      setIsProcessing(true);
      
      // Update user's custom permissions
      await handleUpdateApprovedUser(selectedUserForPermissions.email, {
        customPermissions: selectedPermissions
      });
      
      // Also update employee record
      try {
        const employee = await firestoreService.getEmployeeByEmail(selectedUserForPermissions.email);
        if (employee) {
          await firestoreService.updateEmployee(employee.id, {
            customPermissions: selectedPermissions
          });
        }
      } catch (empError) {
        console.log('ℹ️ Could not update employee permissions:', empError.message);
      }
      
      console.log('✅ Permissions saved successfully');
      toast.success(`✅ Permissions updated for ${selectedUserForPermissions.email}`);
      
      setShowPermissionsModal(false);
      setSelectedUserForPermissions(null);
      setSelectedPermissions([]);
      
      // Refresh user list
      await handleRefreshUsers();
      
    } catch (error) {
      console.error('❌ Error saving permissions:', error);
      toast.error(`Failed to save permissions: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to handle adding a new user directly
  const handleAddNewUser = async () => {
    console.log('🚀 ADD USER CLICKED!');
    console.log('📝 Form data:', newUserForm);
    
    if (!newUserForm.email || !newUserForm.firstName || !newUserForm.lastName || newUserForm.roles.length === 0) {
      toast.error('Please fill in email, first name, last name, and select at least one role');
      return;
    }
    
    try {
      setIsProcessing(true);
      console.log('➕ Creating new user:', newUserForm.email);
      
      // Create approved user data
      const newUserData = {
        email: newUserForm.email,
        firstName: newUserForm.firstName,
        lastName: newUserForm.lastName,
        displayName: `${newUserForm.firstName} ${newUserForm.lastName}`,
        department: newUserForm.department || 'General',
        phone: newUserForm.phone || '',
        location: newUserForm.location || '',
        roles: newUserForm.roles,
        primaryRole: newUserForm.roles[0],
        role: newUserForm.roles[0],
        isApproved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser.email,
        uid: `manual-${Date.now()}`,
        startDate: new Date().toISOString().split('T')[0],
        avatar: '',
        bio: ''
      };
      
      console.log('💾 Saving new user to Firestore:', newUserData);
      
      // Add to approved users collection
      await firestoreService.addApprovedUser(newUserData);
      console.log('✅ User added to approved users');
      
      // Also create employee record
      try {
        await firestoreService.addEmployee({
          ...newUserData,
          onboardingCompleted: false
        });
        console.log('✅ Employee record created');
      } catch (empError) {
        console.log('⚠️ Could not create employee record:', empError.message);
      }
      
      // Automatically grant Google Drive folder access based on role
      try {
        const { googleDriveService } = await import('../services/googleDriveService');
        const primaryRole = newUserData.primaryRole || newUserData.role;
        await googleDriveService.grantFolderAccess(newUserData.email, primaryRole);
        console.log('✅ Google Drive access granted');
      } catch (driveError) {
        console.warn('⚠️ Could not grant Google Drive access:', driveError.message);
        // Don't fail user creation if Drive access fails
      }
      
      toast.success(`✅ User ${newUserForm.email} added successfully!`);
      
      // Reset form and close modal
      setNewUserForm({
        email: '',
        firstName: '',
        lastName: '',
        department: '',
        roles: [],
        phone: '',
        location: ''
      });
      setShowAddUserModal(false);
      
      // Refresh the user list
      await handleRefreshUsers();
      
    } catch (error) {
      console.error('❌ Error adding new user:', error);
      console.error('❌ Error details:', error.message, error.stack);
      
      if (error.message.includes('already exists')) {
        toast.error('This email already exists in the system');
      } else {
        toast.error(`Failed to add user: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to save role assignments
  const handleSaveRoleAssignment = async () => {
    console.log('🚀 ASSIGN ROLES BUTTON CLICKED!');
    console.log('👤 Selected user:', selectedUserForRoles);
    console.log('🎭 Selected roles:', selectedRoles);
    
    if (!selectedUserForRoles || selectedRoles.length === 0) {
      console.warn('⚠️ No user or roles selected, returning early');
      if (selectedRoles.length === 0) {
        toast.error('Please select at least one role');
      }
      return;
    }
    
    try {
      setIsProcessing(true);
      console.log('🔍 DEBUG: Assigning roles to user:', selectedUserForRoles.email);
      console.log('🔍 DEBUG: Selected roles:', selectedRoles);
      
      // Check if user is authenticated
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Get Firebase auth user for token
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Firebase user not found');
      }
      
      // Check authentication token and refresh if needed
      const authToken = await firebaseUser.getIdToken(true); // Force refresh
      console.log('🔍 Auth token exists:', !!authToken);
      console.log('🔍 Firebase user email:', firebaseUser.email);
      console.log('🔍 Firebase user UID:', firebaseUser.uid);
      
      // Verify token is valid
      if (!authToken) {
        throw new Error('Authentication token is invalid or expired');
      }
      
      // Test Firestore connection first
      console.log('🔍 Testing Firestore connection...');
      await firestoreService.testConnection();
      
      // Update the user's roles in Firestore with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await handleUpdateApprovedUser(selectedUserForRoles.email, {
            roles: selectedRoles,
            primaryRole: selectedRoles[0] // First role becomes primary
          });
          break; // Success, exit retry loop
        } catch (retryError) {
          retryCount++;
          console.log(`🔄 Retry attempt ${retryCount}/${maxRetries} for role assignment`);
          
          if (retryCount >= maxRetries) {
            throw retryError; // Re-throw if all retries failed
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      console.log('✅ Roles assigned successfully');
      toast.success(`✅ Roles updated for ${selectedUserForRoles.email}`);
      
      setShowRoleAssignmentModal(false);
      setSelectedUserForRoles(null);
      setSelectedRoles([]);
      
      // Refresh the data
      await handleRefreshUsers();
      
    } catch (error) {
      console.error('❌ Error assigning roles:', error);
      console.error('❌ Error details:', error.message, error.stack);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to assign roles. Please try again.';
      
      if (error.message.includes('permission-denied')) {
        errorMessage = 'Permission denied. You may not have the required permissions to update user roles.';
      } else if (error.message.includes('unavailable')) {
        errorMessage = 'Service temporarily unavailable. Please check your internet connection and try again.';
      } else if (error.message.includes('unauthenticated')) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.message.includes('not-found')) {
        errorMessage = 'User not found. The user may have been deleted.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to render multiple roles for a user
  const renderUserRoles = (user) => {
    const roles = user.roles || [user.role] || [];
    const primaryRole = user.primaryRole || roles[0];
    
    return (
      <div className="flex flex-wrap gap-1">
        {roles.map((role, index) => (
          <Badge 
            key={role} 
            className={`${getRoleBadgeColor(role)} ${role === primaryRole ? 'ring-2 ring-blue-300' : ''}`}
          >
            {getRoleDisplayName(role)}
            {role === primaryRole && <span className="ml-1">⭐</span>}
          </Badge>
        ))}
      </div>
    );
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
      <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
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
      <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
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
      {/* Super Prominent Refresh Button */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">Firestore Status - UPDATED 8/18/2025</h2>
            <p className="text-blue-700 text-sm">Click to refresh pending users from database</p>
          </div>
          <Button
            onClick={handleRefreshUsers}
            className={`px-6 py-3 font-bold text-lg ${
              firestoreStatus === 'loading' 
                ? 'bg-blue-600 text-white' 
                : firestoreStatus === 'success'
                ? 'bg-green-600 text-white'
                : firestoreStatus === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            disabled={loading || firestoreStatus === 'loading'}
          >
            {firestoreStatus === 'loading' ? '🔄 Loading...' : 
             firestoreStatus === 'success' ? '✅ Refreshed!' :
             firestoreStatus === 'error' ? '❌ Error' :
             '🔄 Refresh from Firestore'}
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage user approvals and roles</p>
        </div>
        <Button
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <UserPlus className="w-4 h-4" />
          Add New User
        </Button>
      </div>

      {/* Stats and Management Buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{approvedUsers.length}</div>
            <div className="text-sm text-gray-600">Approved Users</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600">{pendingUsers.length}</div>
            <div className="text-sm text-gray-600">Pending Approval</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
            disabled={isProcessing}
          >
            {isProcessing ? '🧹 Processing...' : '🧹 Clean Duplicates'}
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
                          disabled={isProcessing}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {isProcessing ? 'Processing...' : 'Approve as Admin'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleApproveUser(user)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={isProcessing}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {isProcessing ? 'Processing...' : 'Approve'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectUser(user)}
                        className="flex-1"
                        disabled={isProcessing}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {isProcessing ? 'Processing...' : 'Reject'}
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
                        <span className="text-sm text-gray-600">Roles:</span>
                        {renderUserRoles(user)}
                      </div>
                      {user.approvedAt && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          Approved: {new Date(user.approvedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewUser(user)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManageUser(user)}
                        className="bg-blue-600 text-white hover:bg-blue-700 col-span-2"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Manage User
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteApprovedUser(user.email)}
                        className="col-span-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete User
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

      {/* Role Assignment Modal */}
      {showRoleAssignmentModal && selectedUserForRoles && createPortal(
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Assign Roles to {selectedUserForRoles.firstName} {selectedUserForRoles.lastName}</h2>
              <button 
                onClick={() => setShowRoleAssignmentModal(false)} 
                className="text-gray-500 hover:text-gray-700"
                disabled={isProcessing}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Connection Status */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-blue-700">Connected to Firestore</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Roles (First role will be primary)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(USER_ROLES).filter(([key, value]) => value !== 'pending').map(([key, role]) => (
                    <label key={role} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role]);
                          } else {
                            setSelectedRoles(selectedRoles.filter(r => r !== role));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-2">
                        <Badge className={getRoleBadgeColor(role)}>
                          {getRoleDisplayName(role)}
                        </Badge>
                        {selectedRoles.includes(role) && selectedRoles.indexOf(role) === 0 && (
                          <span className="text-xs text-blue-600">⭐ Primary</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const firebaseUser = auth.currentUser;
                        if (firebaseUser) {
                          const token = await firebaseUser.getIdToken(true);
                          toast.success('✅ Authentication token refreshed successfully!');
                          console.log('✅ Token refreshed:', !!token);
                        } else {
                          toast.error('❌ No user logged in');
                        }
                      } catch (error) {
                        toast.error('❌ Failed to refresh token: ' + error.message);
                        console.error('❌ Token refresh error:', error);
                      }
                    }}
                    disabled={isProcessing}
                    className="text-xs"
                  >
                    🔄 Refresh Auth
                  </Button>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowRoleAssignmentModal(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveRoleAssignment}
                    disabled={isProcessing || selectedRoles.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? 'Saving...' : 'Save Roles'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Permissions Modal */}
      {showPermissionsModal && selectedUserForPermissions && createPortal(
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Manage Permissions for {selectedUserForPermissions.firstName} {selectedUserForPermissions.lastName}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  These permissions apply regardless of the role they're switched into
                </p>
              </div>
              <button 
                onClick={() => setShowPermissionsModal(false)} 
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Permission Categories */}
              {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                <div key={categoryKey} className="border-2 border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Toggle all permissions in this category
                        const allSelected = category.permissions.every(p => selectedPermissions.includes(p));
                        if (allSelected) {
                          // Remove all from this category
                          setSelectedPermissions(selectedPermissions.filter(p => !category.permissions.includes(p)));
                        } else {
                          // Add all from this category
                          const newPerms = [...new Set([...selectedPermissions, ...category.permissions])];
                          setSelectedPermissions(newPerms);
                        }
                      }}
                      className="text-xs"
                    >
                      {category.permissions.every(p => selectedPermissions.includes(p)) ? 'Unselect All' : 'Select All'}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.permissions.map((permission) => (
                      <label key={permission} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions([...selectedPermissions, permission]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
                            }
                          }}
                          className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-5 h-5"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {PERMISSION_LABELS[permission]}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>💡 Tip:</strong> Custom permissions give this user specific abilities across all roles they switch into. These override role-based permissions.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedUserForPermissions(null);
                  setSelectedPermissions([]);
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePermissions}
                disabled={isProcessing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 w-4 mr-2" />
                    Save Permissions
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add New User Modal */}
      {showAddUserModal && createPortal(
        <div className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add New User</h2>
              <button 
                onClick={() => setShowAddUserModal(false)} 
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="inline w-4 h-4 mr-1" />
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      placeholder="user@luxury-listings.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Briefcase className="inline w-4 h-4 mr-1" />
                      Department
                    </label>
                    <input
                      type="text"
                      value={newUserForm.department}
                      onChange={(e) => setNewUserForm({...newUserForm, department: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      placeholder="Marketing, Sales, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="inline w-4 h-4 mr-1" />
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={newUserForm.firstName}
                      onChange={(e) => setNewUserForm({...newUserForm, firstName: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      placeholder="John"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="inline w-4 h-4 mr-1" />
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={newUserForm.lastName}
                      onChange={(e) => setNewUserForm({...newUserForm, lastName: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      placeholder="Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="inline w-4 h-4 mr-1" />
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({...newUserForm, phone: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="inline w-4 h-4 mr-1" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={newUserForm.location}
                      onChange={(e) => setNewUserForm({...newUserForm, location: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      placeholder="Vancouver, BC"
                    />
                  </div>
                </div>
              </div>

              {/* Role Assignment */}
              <div>
                <h3 className="font-semibold text-lg mb-4 pb-2 border-b">Assign Roles *</h3>
                <p className="text-sm text-gray-600 mb-3">Select at least one role. The first role selected will be the primary role.</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(USER_ROLES)
                    .filter(([key, value]) => value !== 'pending')
                    .map(([key, role]) => (
                      <label key={role} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newUserForm.roles.includes(role)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewUserForm({...newUserForm, roles: [...newUserForm.roles, role]});
                            } else {
                              setNewUserForm({...newUserForm, roles: newUserForm.roles.filter(r => r !== role)});
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <Badge className={getRoleBadgeColor(role)}>
                            {getRoleDisplayName(role)}
                          </Badge>
                          {newUserForm.roles.includes(role) && newUserForm.roles.indexOf(role) === 0 && (
                            <span className="text-xs text-blue-600 font-medium">⭐ Primary</span>
                          )}
                        </div>
                      </label>
                    ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setNewUserForm({
                      email: '',
                      firstName: '',
                      lastName: '',
                      department: '',
                      roles: [],
                      phone: '',
                      location: ''
                    });
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddNewUser}
                  disabled={isProcessing || !newUserForm.email || !newUserForm.firstName || !newUserForm.lastName || newUserForm.roles.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Adding User...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add User
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Manage User Modal */}
      {showUnifiedManageModal && managedUser && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Manage User: {managedUser.firstName} {managedUser.lastName}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{managedUser.email}</p>
              </div>
              <button 
                onClick={() => {
                  setShowUnifiedManageModal(false);
                  setManagedUser(null);
                  setUserPagePermissions([]);
                }} 
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <Tabs value={manageModalTab} onValueChange={setManageModalTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="roles">Roles</TabsTrigger>
                <TabsTrigger value="pages">Page Access</TabsTrigger>
                <TabsTrigger value="permissions">Custom Permissions</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={managedUser.firstName || ''}
                      onChange={(e) => setManagedUser({...managedUser, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={managedUser.lastName || ''}
                      onChange={(e) => setManagedUser({...managedUser, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={managedUser.email || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={managedUser.phone || ''}
                      onChange={(e) => setManagedUser({...managedUser, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={managedUser.department || ''}
                      onChange={(e) => setManagedUser({...managedUser, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={managedUser.location || ''}
                      onChange={(e) => setManagedUser({...managedUser, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Roles Tab */}
              <TabsContent value="roles" className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    Select roles this user can switch between. The first role will be their primary role.
                  </p>
                  {Object.values(USER_ROLES).map((role) => (
                    <label key={role} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role]);
                          } else {
                            setSelectedRoles(selectedRoles.filter(r => r !== role));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-medium">{getRoleDisplayName(role)}</span>
                    </label>
                  ))}
                </div>
              </TabsContent>

              {/* Page Access Tab */}
              <TabsContent value="pages" className="space-y-4">
                <div className="space-y-6">
                  {Object.entries(
                    AVAILABLE_PAGES.reduce((acc, page) => {
                      if (!acc[page.category]) acc[page.category] = [];
                      acc[page.category].push(page);
                      return acc;
                    }, {})
                  ).map(([category, pages]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {pages.map((page) => {
                          const hasPermission = userPagePermissions.includes(page.id);
                          return (
                            <label
                              key={page.id}
                              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={hasPermission}
                                onChange={() => {
                                  if (hasPermission) {
                                    setUserPagePermissions(userPagePermissions.filter(p => p !== page.id));
                                  } else {
                                    setUserPagePermissions([...userPagePermissions, page.id]);
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-lg">{page.icon}</span>
                              <span className="flex-1 font-medium text-gray-900">{page.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Custom Permissions Tab */}
              <TabsContent value="permissions" className="space-y-4">
                <div className="space-y-6">
                  {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                    <div key={categoryKey} className="border-2 border-gray-200 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{category.name}</h3>
                          <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const allSelected = category.permissions.every(p => selectedPermissions.includes(p));
                            if (allSelected) {
                              setSelectedPermissions(selectedPermissions.filter(p => !category.permissions.includes(p)));
                            } else {
                              setSelectedPermissions([...new Set([...selectedPermissions, ...category.permissions])]);
                            }
                          }}
                        >
                          {category.permissions.every(p => selectedPermissions.includes(p)) ? 'Unselect All' : 'Select All'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.permissions.map((permission) => (
                          <label key={permission} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(permission)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPermissions([...selectedPermissions, permission]);
                                } else {
                                  setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
                                }
                              }}
                              className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-5 h-5"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm">
                                {PERMISSION_LABELS[permission]}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUnifiedManageModal(false);
                  setManagedUser(null);
                  setUserPagePermissions([]);
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    
                    // Save basic info
                    await handleUpdateApprovedUser(managedUser.email, {
                      firstName: managedUser.firstName,
                      lastName: managedUser.lastName,
                      phone: managedUser.phone,
                      department: managedUser.department,
                      location: managedUser.location,
                      displayName: `${managedUser.firstName} ${managedUser.lastName}`
                    });

                    // Save roles
                    await handleUpdateApprovedUser(managedUser.email, {
                      roles: selectedRoles,
                      primaryRole: selectedRoles[0] || managedUser.primaryRole,
                      role: selectedRoles[0] || managedUser.role
                    });

                    // Save page permissions
                    await firestoreService.setUserPagePermissions(managedUser.email, userPagePermissions);

                    // Save custom permissions
                    await handleUpdateApprovedUser(managedUser.email, {
                      customPermissions: selectedPermissions
                    });

                    toast.success('✅ User updated successfully!');
                    setShowUnifiedManageModal(false);
                    setManagedUser(null);
                    setUserPagePermissions([]);
                    setManageModalTab('basic');
                    await handleRefreshUsers();
                  } catch (error) {
                    console.error('Error saving user:', error);
                    toast.error(`Failed to save: ${error.message || 'Unknown error'}`);
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close unified modal */}
      {showUnifiedManageModal && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowUnifiedManageModal(false);
            setManagedUser(null);
            setUserPagePermissions([]);
            setManageModalTab('basic');
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
