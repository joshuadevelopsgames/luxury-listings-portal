import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useViewAs } from '../../contexts/ViewAsContext';
import { firestoreService } from '../../services/firestoreService';
import { FEATURE_PERMISSIONS } from '../../contexts/PermissionsContext';
import { 
  Shield, 
  Search, 
  User, 
  Check, 
  X, 
  ChevronDown,
  ChevronRight,
  Save,
  RefreshCw,
  Home,
  CheckSquare,
  Users,
  Calendar,
  Target,
  TrendingUp,
  Wrench,
  BookOpen,
  FileText,
  Briefcase,
  AlertCircle,
  Plus,
  Trash2,
  UserPlus,
  Mail,
  Eye,
  Instagram,
  Star,
  DollarSign,
  UserCog,
  Clock,
  BarChart3,
  Palette,
  Sparkles,
  Bug,
  MessageSquare,
  Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { modules as moduleRegistry, getBaseModuleIds } from '../../modules/registry';
import { USER_ROLES } from '../../entities/UserRoles';
import EmployeeLink from '../../components/ui/EmployeeLink';
import EmployeeDetailsModal from '../../components/EmployeeDetailsModal';

// Feature permissions with descriptions
const ALL_FEATURES = {
  [FEATURE_PERMISSIONS.VIEW_FINANCIALS]: { 
    name: 'View Financial Data', 
    icon: DollarSign, 
    description: 'See salary, compensation, and other financial information' 
  },
  [FEATURE_PERMISSIONS.MANAGE_USERS]: { 
    name: 'Manage Users', 
    icon: UserCog, 
    description: 'Add, edit, or remove users and change roles' 
  },
  [FEATURE_PERMISSIONS.APPROVE_TIME_OFF]: { 
    name: 'Approve Time Off', 
    icon: Clock, 
    description: 'Approve or deny employee time off requests' 
  },
  [FEATURE_PERMISSIONS.VIEW_ANALYTICS]: { 
    name: 'View Analytics', 
    icon: BarChart3, 
    description: 'Access analytics dashboards and reports' 
  },
  [FEATURE_PERMISSIONS.MANAGE_CLIENTS]: { 
    name: 'Manage Clients', 
    icon: Users, 
    description: 'Edit client info, remove clients from the system' 
  },
  [FEATURE_PERMISSIONS.ASSIGN_CLIENT_MANAGERS]: { 
    name: 'Assign Client Managers', 
    icon: UserPlus, 
    description: 'Assign social media managers to clients' 
  },
  [FEATURE_PERMISSIONS.EDIT_CLIENT_PACKAGES]: { 
    name: 'Edit Client Packages', 
    icon: Briefcase, 
    description: 'Edit package type, posts remaining, and payment status' 
  },
};

// Build ALL_PAGES from module registry + additional pages
const ALL_PAGES = {
  // Base modules (included in base package)
  'time-off': { name: 'Time Off', icon: Calendar, description: 'Request and manage time off', isBase: true },
  'my-clients': { name: 'My Clients', icon: Users, description: 'View your assigned clients', isBase: true },
  'instagram-reports': { name: 'Instagram Analytics', icon: Instagram, description: 'Instagram analytics reports', isBase: true },
  // Upgrade modules
  'dashboard': { name: 'Dashboard', icon: Home, description: 'Main dashboard overview' },
  'tasks': { name: 'Tasks', icon: CheckSquare, description: 'Task management' },
  'clients': { name: 'Client Management', icon: User, description: 'Client directory and pending approvals' },
  'posting-packages': { name: 'Posting Packages', icon: Briefcase, description: 'Manage @luxury_listings posting packages' },
  'content-calendar': { name: 'Content Calendar', icon: Calendar, description: 'Content scheduling' },
  'crm': { name: 'CRM', icon: Target, description: 'Customer relationship management' },
  'hr-calendar': { name: 'HR Calendar', icon: Calendar, description: 'Team calendar' },
  'team': { name: 'Team Management', icon: Users, description: 'Team directory' },
  'hr-analytics': { name: 'HR Analytics', icon: TrendingUp, description: 'HR metrics and reports' },
  'client-health': { name: 'Client Health', icon: Activity, description: 'AI health overview for all clients (admin)' },
  'it-support': { name: 'IT Support', icon: Wrench, description: 'Technical support' },
  'tutorials': { name: 'Tutorials', icon: BookOpen, description: 'Training materials' },
  'resources': { name: 'Resources', icon: FileText, description: 'Company resources' },
  'features': { name: 'Features', icon: Sparkles, description: 'Future features to quote' },
  'workload': { name: 'Team Workload', icon: BarChart3, description: 'Team capacity and client distribution' },
  'graphic-projects': { name: 'Team Projects', icon: Palette, description: 'Graphic design project tracker' },
  'admin-feedback': { name: 'Feedback & Reports', icon: Bug, description: 'Bug reports and feature requests (admin)' },
  'admin-chats': { name: 'Support Chats', icon: MessageSquare, description: 'User support chats (admin)' },
};

// Get list of base module IDs
const BASE_MODULE_IDS = getBaseModuleIds();

// Default pages for new users (clients and other pages are hidden by default; enable per user in Permissions)
const DEFAULT_PAGES = ['dashboard', 'tasks', 'resources', 'features', 'tutorials', ...BASE_MODULE_IDS];

// Department options
const DEPARTMENTS = [
  'Executive',
  'Content Team',
  'Design Team',
  'Sales',
  'Marketing',
  'Operations',
  'HR',
  'IT',
  'Finance',
  'General'
];

// System admins (for full access display)
const SYSTEM_ADMINS = [
  'jrsschroeder@gmail.com',
  'demo@luxurylistings.app'
];

// Protected admins that cannot be removed
const PROTECTED_ADMINS = [
  'jrsschroeder@gmail.com'
];

const PermissionsManager = () => {
  const { currentUser } = useAuth();
  const { startViewingAs } = useViewAs();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [userFeaturePermissions, setUserFeaturePermissions] = useState({});
  const [hasChanges, setHasChanges] = useState({});
  
  // Add user modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    displayName: '',
    role: 'content_director'
  });
  const [addingUser, setAddingUser] = useState(false);
  
  // Remove user state
  const [userToRemove, setUserToRemove] = useState(null);
  
  // User roles state
  const [userRoles, setUserRoles] = useState({});
  const [savingRole, setSavingRole] = useState(null);
  const [removingUser, setRemovingUser] = useState(false);
  
  // Unified edit profile: open EmployeeDetailsModal in edit mode
  const [profileModalUser, setProfileModalUser] = useState(null);

  // Check if current user is system admin
  const isSystemAdmin = SYSTEM_ADMINS.includes(currentUser?.email?.toLowerCase());

  // Load all approved users (including system admins who may not be in approved_users)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const approvedUsers = await firestoreService.getApprovedUsers();
        
        // Ensure system admins are included even if not in approved_users
        const existingEmails = new Set(approvedUsers.map(u => u.email?.toLowerCase()));
        const systemAdminUsers = SYSTEM_ADMINS
          .filter(email => !existingEmails.has(email.toLowerCase()))
          .map(email => ({
            email,
            displayName: email === 'demo@luxurylistings.app' ? 'Demo Admin' : 'System Admin',
            role: 'admin',
            primaryRole: 'admin',
            roles: ['admin'],
            isApproved: true,
            department: 'Administration'
          }));
        
        const allUsers = [...approvedUsers, ...systemAdminUsers];
        setUsers(allUsers);

        // Load permissions for each user (pages + features); use normalized email for keys
        const permissionsMap = {};
        const featurePermissionsMap = {};
        const rolesMap = {};
        for (const user of allUsers) {
          const uEmail = user.email || user.id || '';
          try {
            const result = await firestoreService.getUserPermissions(uEmail);
            permissionsMap[uEmail] = result?.pages || [];
            featurePermissionsMap[uEmail] = result?.features || [];
          } catch (e) {
            permissionsMap[uEmail] = [];
            featurePermissionsMap[uEmail] = [];
          }
          rolesMap[uEmail] = user.primaryRole || user.role || user.roles?.[0] || 'social_media_manager';
        }
        setUserRoles(rolesMap);
        setUserPermissions(permissionsMap);
        setUserFeaturePermissions(featurePermissionsMap);
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Toggle a page permission for a user
  const togglePermission = (userEmail, pageId) => {
    // Don't allow modifying system admin permissions
    if (SYSTEM_ADMINS.includes(userEmail.toLowerCase())) {
      toast.error("Cannot modify system admin permissions");
      return;
    }

    setUserPermissions(prev => {
      const currentPerms = prev[userEmail] || [];
      const newPerms = currentPerms.includes(pageId)
        ? currentPerms.filter(id => id !== pageId)
        : [...currentPerms, pageId];
      
      return { ...prev, [userEmail]: newPerms };
    });

    setHasChanges(prev => ({ ...prev, [userEmail]: true }));
  };

  // Toggle a feature permission for a user
  const toggleFeaturePermission = (userEmail, featureId) => {
    if (SYSTEM_ADMINS.includes(userEmail.toLowerCase())) {
      toast.error("Cannot modify system admin permissions");
      return;
    }

    setUserFeaturePermissions(prev => {
      const currentPerms = prev[userEmail] || [];
      const newPerms = currentPerms.includes(featureId)
        ? currentPerms.filter(id => id !== featureId)
        : [...currentPerms, featureId];
      
      return { ...prev, [userEmail]: newPerms };
    });

    setHasChanges(prev => ({ ...prev, [userEmail]: true }));
  };

  // Grant all pages to a user
  const grantAllPages = (userEmail) => {
    if (SYSTEM_ADMINS.includes(userEmail.toLowerCase())) return;
    
    setUserPermissions(prev => ({
      ...prev,
      [userEmail]: Object.keys(ALL_PAGES)
    }));
    setHasChanges(prev => ({ ...prev, [userEmail]: true }));
  };

  // Revoke all pages from a user
  const revokeAllPages = (userEmail) => {
    if (SYSTEM_ADMINS.includes(userEmail.toLowerCase())) return;
    
    // Always keep dashboard access
    setUserPermissions(prev => ({
      ...prev,
      [userEmail]: ['dashboard']
    }));
    setHasChanges(prev => ({ ...prev, [userEmail]: true }));
  };

  // Save permissions for a user (both pages and features)
  const saveUserPermissions = async (userEmail) => {
    try {
      setSaving(userEmail);
      await firestoreService.setUserFullPermissions(userEmail, {
        pages: userPermissions[userEmail] || [],
        features: userFeaturePermissions[userEmail] || []
      });
      toast.success(`Permissions saved for ${userEmail}`);
      setHasChanges(prev => ({ ...prev, [userEmail]: false }));
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(null);
    }
  };

  // Handle role change for a user
  const handleRoleChange = async (userEmail, newRole) => {
    if (SYSTEM_ADMINS.includes(userEmail.toLowerCase())) {
      toast.error("Cannot modify system admin role");
      return;
    }

    try {
      setSavingRole(userEmail);
      await firestoreService.updateApprovedUser(userEmail, {
        role: newRole,
        primaryRole: newRole,
        roles: [newRole]
      });
      setUserRoles(prev => ({ ...prev, [userEmail]: newRole }));
      // Update local users state too
      setUsers(prev => prev.map(u => 
        u.email === userEmail 
          ? { ...u, role: newRole, primaryRole: newRole, roles: [newRole] }
          : u
      ));
      toast.success(`Role updated to ${getRoleDisplayName(newRole)}`);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setSavingRole(null);
    }
  };

  // Get display name for role
  const getRoleDisplayName = (role) => {
    const displayNames = {
      'admin': 'Admin',
      'director': 'Director',
      'content_director': 'Content Director',
      'social_media_manager': 'Social Media Manager',
      'graphic_designer': 'Graphic Designer',
      'hr_manager': 'HR Manager',
      'sales_manager': 'Sales Manager'
    };
    return displayNames[role] || role;
  };

  const handleEditProfile = (user) => setProfileModalUser(user);

  // Add a new user
  const handleAddUser = async () => {
    if (!newUserForm.email || !newUserForm.displayName) {
      toast.error('Please fill in all fields');
      return;
    }

    // Check if user already exists
    if (users.some(u => u.email?.toLowerCase() === newUserForm.email.toLowerCase())) {
      toast.error('User with this email already exists');
      return;
    }

    try {
      setAddingUser(true);
      
      const userData = {
        email: newUserForm.email.toLowerCase().trim(),
        displayName: newUserForm.displayName.trim(),
        firstName: newUserForm.displayName.split(' ')[0],
        lastName: newUserForm.displayName.split(' ').slice(1).join(' ') || '',
        role: newUserForm.role,
        primaryRole: newUserForm.role,
        roles: [newUserForm.role],
        isApproved: true,
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser?.email,
        department: 'General',
        startDate: new Date().toISOString().split('T')[0],
        avatar: ''
      };

      await firestoreService.addApprovedUser(userData);
      
      // Default pages only; clients and other pages are enabled per user. Role is not used for permissions.
      await firestoreService.setUserFullPermissions(userData.email, { pages: DEFAULT_PAGES, features: [] });
      
      // Update local state
      setUsers(prev => [...prev, userData]);
      setUserPermissions(prev => ({ ...prev, [userData.email]: DEFAULT_PAGES }));
      setUserFeaturePermissions(prev => ({ ...prev, [userData.email]: [] }));
      
      toast.success(`User ${newUserForm.displayName} added successfully`);
      setShowAddModal(false);
      setNewUserForm({ email: '', displayName: '', role: 'content_director' });
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  // Remove a user
  const handleRemoveUser = async () => {
    if (!userToRemove) return;
    
    // Don't allow removing protected admins
    if (PROTECTED_ADMINS.includes(userToRemove.email?.toLowerCase())) {
      toast.error('Cannot remove the primary system administrator');
      setUserToRemove(null);
      return;
    }

    try {
      setRemovingUser(true);
      
      // Remove from approved users
      await firestoreService.removeApprovedUser(userToRemove.email);
      
      // Update local state
      setUsers(prev => prev.filter(u => u.email !== userToRemove.email));
      setUserPermissions(prev => {
        const newPerms = { ...prev };
        delete newPerms[userToRemove.email];
        return newPerms;
      });
      
      toast.success(`User ${userToRemove.displayName || userToRemove.email} removed`);
      setUserToRemove(null);
      setExpandedUser(null);
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user');
    } finally {
      setRemovingUser(false);
    }
  };

  // View site as another user
  const handleViewAsUser = (user) => {
    startViewingAs({
      email: user.email,
      displayName: user.displayName || user.email,
      avatar: user.avatar || user.photoURL
    });
    navigate('/dashboard');
    toast.success(`Now viewing as ${user.displayName || user.email}`);
  };

  // Normalize email for display/key (doc id may be email when field missing)
  const userEmail = (user) => user.email || user.id || '';

  // Filter users by search
  const filteredUsers = users.filter(user => 
    userEmail(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isSystemAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-[#ff3b30] mx-auto mb-4" />
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-[#86868b]">
            Only system administrators can access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
              Permissions Manager
            </h1>
            {!loading && (
              <span className="px-3 py-1 rounded-full bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-semibold">
                {users.length} {users.length === 1 ? 'user' : 'users'}
              </span>
            )}
          </div>
          <p className="text-[15px] text-[#86868b]">
            Manage users and control which pages they can access
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0071e3]/10 text-[#0071e3]">
            <Shield className="w-4 h-4" />
            <span className="text-[13px] font-medium">System Admin</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[15px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 transition-all"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
          <p className="text-[#86868b]">No users found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const email = userEmail(user);
            const isExpanded = expandedUser === email;
            const isAdmin = SYSTEM_ADMINS.includes(email.toLowerCase());
            const perms = userPermissions[email] || [];
            const hasUnsavedChanges = hasChanges[email];

            return (
              <div
                key={email}
                className={`rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border transition-all ${
                  isExpanded 
                    ? 'border-[#0071e3]/30 shadow-lg' 
                    : 'border-gray-200 dark:border-white/5 hover:shadow-md'
                }`}
              >
                {/* User Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedUser(isExpanded ? null : email)}
                >
                  <div className="flex items-center gap-4">
                    {user.avatar || user.photoURL ? (
                      <img 
                        src={user.avatar || user.photoURL} 
                        alt={user.displayName || 'User'} 
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-12 h-12 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] items-center justify-center text-white font-semibold text-[15px] ${user.avatar || user.photoURL ? 'hidden' : 'flex'}`}
                    >
                      {user.displayName?.charAt(0) || email?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <EmployeeLink user={user} showId className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
                          {user.displayName || 'Unknown User'}
                        </EmployeeLink>
                        {isAdmin && (
                          <span className="px-2 py-0.5 rounded-full bg-[#ff9500]/10 text-[#ff9500] text-[11px] font-semibold">
                            System Admin
                          </span>
                        )}
                        {hasUnsavedChanges && (
                          <span className="px-2 py-0.5 rounded-full bg-[#ff3b30]/10 text-[#ff3b30] text-[11px] font-semibold">
                            Unsaved
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-[#86868b]">{email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-[#86868b]">
                      {isAdmin ? 'Full Access' : `${perms.length} pages, ${(userFeaturePermissions[email] || []).length} features`}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-[#86868b]" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-[#86868b]" />
                    )}
                  </div>
                </div>

                {/* Expanded Permissions */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-white/5">
                    {isAdmin ? (
                      <div className="py-6 text-center">
                        <AlertCircle className="w-8 h-8 text-[#ff9500] mx-auto mb-2" />
                        <p className="text-[13px] text-[#86868b]">
                          System administrators have full access to all pages.
                          <br />
                          Their permissions cannot be modified.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Role & Profile */}
                        <div className="py-4 border-b border-gray-200 dark:border-white/5">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <UserCog className="w-4 h-4 text-[#0071e3]" />
                                <span className="text-[13px] font-medium text-[#1d1d1f] dark:text-white">Role</span>
                              </div>
                              <select
                                value={userRoles[email] || 'social_media_manager'}
                                onChange={(e) => handleRoleChange(email, e.target.value)}
                                disabled={savingRole === email}
                                className="h-9 px-3 rounded-lg bg-black/5 dark:bg-white/10 border-0 text-[13px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 disabled:opacity-50"
                              >
                                <option value="admin">Admin</option>
                                <option value="director">Director</option>
                                <option value="content_director">Content Director</option>
                                <option value="social_media_manager">Social Media Manager</option>
                                <option value="graphic_designer">Graphic Designer</option>
                                <option value="hr_manager">HR Manager</option>
                                <option value="sales_manager">Sales Manager</option>
                              </select>
                              {savingRole === email && (
                                <RefreshCw className="w-4 h-4 text-[#0071e3] animate-spin" />
                              )}
                            </div>
                            <span className="text-[11px] text-[#86868b]">
                              Controls dashboard view and default permissions
                            </span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleEditProfile(user)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#af52de]/10 text-[#af52de] text-[13px] font-medium hover:bg-[#af52de]/20 transition-colors"
                            >
                              <User className="w-3.5 h-3.5" />
                              Edit Profile
                            </button>
                            <button
                              onClick={() => handleViewAsUser(user)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071e3]/10 text-[#0071e3] text-[13px] font-medium hover:bg-[#0071e3]/20 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View as User
                            </button>
                            <button
                              onClick={() => grantAllPages(email)}
                              className="px-3 py-1.5 rounded-lg bg-[#34c759]/10 text-[#34c759] text-[13px] font-medium hover:bg-[#34c759]/20 transition-colors"
                            >
                              Grant All
                            </button>
                            <button
                              onClick={() => revokeAllPages(email)}
                              className="px-3 py-1.5 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] text-[13px] font-medium hover:bg-[#ff3b30]/20 transition-colors"
                            >
                              Revoke All
                            </button>
                          </div>
                          <button
                            onClick={() => saveUserPermissions(email)}
                            disabled={!hasUnsavedChanges || saving === email}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                              hasUnsavedChanges
                                ? 'bg-[#0071e3] text-white hover:bg-[#0077ed] shadow-lg shadow-[#0071e3]/25'
                                : 'bg-black/5 dark:bg-white/5 text-[#86868b] cursor-not-allowed'
                            }`}
                          >
                            {saving === email ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save Changes
                          </button>
                        </div>

                        {/* Base Modules Section */}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-[#ff9500]" />
                            <span className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Base Modules</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {Object.entries(ALL_PAGES).filter(([_, page]) => page.isBase).map(([pageId, page]) => {
                              const hasAccess = perms.includes(pageId);
                              const Icon = page.icon;
                              return (
                                <button
                                  key={pageId}
                                  onClick={() => togglePermission(email, pageId)}
                                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                    hasAccess
                                      ? 'bg-[#ff9500]/10 border-[#ff9500]/30 text-[#ff9500]'
                                      : 'bg-black/[0.02] dark:bg-white/[0.02] border-transparent text-[#86868b] hover:bg-black/5 dark:hover:bg-white/5'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    hasAccess 
                                      ? 'bg-[#ff9500]/20' 
                                      : 'bg-black/5 dark:bg-white/5'
                                  }`}>
                                    <Icon className={`w-4 h-4 ${hasAccess ? 'text-[#ff9500]' : ''}`} />
                                  </div>
                                  <div className="flex-1 text-left min-w-0">
                                    <p className={`text-[13px] font-medium truncate ${
                                      hasAccess ? 'text-[#ff9500]' : 'text-[#1d1d1f] dark:text-white'
                                    }`}>
                                      {page.name}
                                    </p>
                                    <p className="text-[10px] text-[#86868b]">Base module</p>
                                  </div>
                                  {hasAccess && (
                                    <Check className="w-4 h-4 flex-shrink-0 text-[#ff9500]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Upgrade Modules Section */}
                        <div className="flex items-center gap-2 mb-2">
                          <Plus className="w-4 h-4 text-[#0071e3]" />
                          <span className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Additional Modules</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(ALL_PAGES).filter(([_, page]) => !page.isBase).map(([pageId, page]) => {
                            const hasAccess = perms.includes(pageId);
                            const Icon = page.icon;
                            const isDashboard = pageId === 'dashboard';

                            return (
                              <button
                                key={pageId}
                                onClick={() => !isDashboard && togglePermission(email, pageId)}
                                disabled={isDashboard}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                  hasAccess
                                    ? 'bg-[#0071e3]/10 border-[#0071e3]/30 text-[#0071e3]'
                                    : 'bg-black/[0.02] dark:bg-white/[0.02] border-transparent text-[#86868b] hover:bg-black/5 dark:hover:bg-white/5'
                                } ${isDashboard ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  hasAccess 
                                    ? 'bg-[#0071e3]/20' 
                                    : 'bg-black/5 dark:bg-white/5'
                                }`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <p className={`text-[13px] font-medium truncate ${
                                    hasAccess ? 'text-[#0071e3]' : 'text-[#1d1d1f] dark:text-white'
                                  }`}>
                                    {page.name}
                                  </p>
                                  {isDashboard && (
                                    <p className="text-[10px] text-[#86868b]">Always enabled</p>
                                  )}
                                </div>
                                {hasAccess && (
                                  <Check className="w-4 h-4 flex-shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Feature Permissions Section */}
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/5">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-[#af52de]" />
                            <span className="text-[12px] font-medium text-[#86868b] uppercase tracking-wide">Feature Permissions</span>
                          </div>
                          <p className="text-[12px] text-[#86868b] mb-3">
                            Control what data and actions this user can access within pages.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(ALL_FEATURES).map(([featureId, feature]) => {
                              const featurePerms = userFeaturePermissions[email] || [];
                              const hasFeature = featurePerms.includes(featureId);
                              const Icon = feature.icon;

                              return (
                                <button
                                  key={featureId}
                                  onClick={() => toggleFeaturePermission(email, featureId)}
                                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                    hasFeature
                                      ? 'bg-[#af52de]/10 border-[#af52de]/30'
                                      : 'bg-black/[0.02] dark:bg-white/[0.02] border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    hasFeature 
                                      ? 'bg-[#af52de]/20' 
                                      : 'bg-black/5 dark:bg-white/5'
                                  }`}>
                                    <Icon className={`w-4 h-4 ${hasFeature ? 'text-[#af52de]' : 'text-[#86868b]'}`} />
                                  </div>
                                  <div className="flex-1 text-left min-w-0">
                                    <p className={`text-[13px] font-medium ${
                                      hasFeature ? 'text-[#af52de]' : 'text-[#1d1d1f] dark:text-white'
                                    }`}>
                                      {feature.name}
                                    </p>
                                    <p className="text-[10px] text-[#86868b] truncate">
                                      {feature.description}
                                    </p>
                                  </div>
                                  {hasFeature && (
                                    <Check className="w-4 h-4 flex-shrink-0 text-[#af52de]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Remove User */}
                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/5">
                          <button
                            onClick={() => setUserToRemove(user)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors text-[13px] font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove User
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#ffffff] dark:bg-[#2c2c2e] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-[#0071e3]" />
                  </div>
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Add New User</h2>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-[#86868b]" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="user@example.com"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[15px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
                    <input
                      type="text"
                      value={newUserForm.displayName}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, displayName: e.target.value }))}
                      placeholder="John Doe"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[15px] text-[#1d1d1f] dark:text-white placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white mb-1.5">
                    Role
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-black/5 dark:bg-white/5 border-0 text-[15px] text-[#1d1d1f] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50"
                  >
                    <option value="admin">Admin</option>
                    <option value="director">Director</option>
                    <option value="content_director">Content Director</option>
                    <option value="social_media_manager">Social Media Manager</option>
                    <option value="graphic_designer">Graphic Designer</option>
                    <option value="hr_manager">HR Manager</option>
                    <option value="sales_manager">Sales Manager</option>
                  </select>
                </div>

                <p className="text-[12px] text-[#86868b]">
                  The user will be able to sign in with Google using this email. They'll get default page access which you can modify after adding.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 dark:border-white/5">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-4 rounded-xl text-[13px] font-medium text-[#1d1d1f] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={addingUser || !newUserForm.email || !newUserForm.displayName}
                  className="flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-medium shadow-lg shadow-[#0071e3]/25 hover:bg-[#0077ed] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingUser ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add User
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Remove User Confirmation Modal */}
      {userToRemove && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setUserToRemove(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#ffffff] dark:bg-[#2c2c2e] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 text-center">
                <div className="w-16 h-16 rounded-full bg-[#ff3b30]/10 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-[#ff3b30]" />
                </div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
                  Remove User?
                </h2>
                <p className="text-[15px] text-[#86868b]">
                  Are you sure you want to remove <span className="font-medium text-[#1d1d1f] dark:text-white">{userToRemove.displayName || userToRemove.email}</span>? They will lose access to the platform.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-5 border-t border-gray-200 dark:border-white/5">
                <button
                  onClick={() => setUserToRemove(null)}
                  className="flex-1 h-11 rounded-xl text-[15px] font-medium text-[#1d1d1f] dark:text-white bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveUser}
                  disabled={removingUser}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-[#ff3b30] text-white text-[15px] font-medium hover:bg-[#ff453a] transition-all disabled:opacity-50"
                >
                  {removingUser ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Remove
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {profileModalUser && (
        <EmployeeDetailsModal
          user={profileModalUser}
          startInEditMode
          onClose={() => setProfileModalUser(null)}
          onEmployeeUpdate={(updated) => {
            setUsers(prev => prev.map(u => u.email === updated.email ? { ...u, ...updated } : u));
            setProfileModalUser(null);
          }}
        />
      )}
    </div>
  );
};

export default PermissionsManager;
