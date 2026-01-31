import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { firestoreService } from '../../services/firestoreService';
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
  BarChart3,
  Target,
  TrendingUp,
  Wrench,
  BookOpen,
  FileText,
  Briefcase,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// All available pages that can be granted
const ALL_PAGES = {
  'dashboard': { name: 'Dashboard', icon: Home, description: 'Main dashboard overview' },
  'tasks': { name: 'Tasks', icon: CheckSquare, description: 'Task management' },
  'clients': { name: 'Clients', icon: User, description: 'Client directory' },
  'client-packages': { name: 'Client Packages', icon: Briefcase, description: 'Package management' },
  'pending-clients': { name: 'Pending Clients', icon: Clock, description: 'New client approvals' },
  'content-calendar': { name: 'Content Calendar', icon: Calendar, description: 'Content scheduling' },
  'crm': { name: 'CRM', icon: Target, description: 'Customer relationship management' },
  'hr-calendar': { name: 'HR Calendar', icon: Calendar, description: 'Team calendar' },
  'team': { name: 'Team Management', icon: Users, description: 'Team directory' },
  'hr-analytics': { name: 'HR Analytics', icon: TrendingUp, description: 'HR metrics and reports' },
  'analytics': { name: 'Analytics', icon: BarChart3, description: 'Business analytics' },
  'user-management': { name: 'User Management', icon: Users, description: 'User approvals (Admin)' },
  'it-support': { name: 'IT Support', icon: Wrench, description: 'Technical support' },
  'tutorials': { name: 'Tutorials', icon: BookOpen, description: 'Training materials' },
  'resources': { name: 'Resources', icon: FileText, description: 'Company resources' },
};

// System admins cannot have their access removed
const SYSTEM_ADMINS = [
  'jrsschroeder@gmail.com',
  'joshua@luxury-listings.com'
];

const PermissionsManager = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState({});

  // Check if current user is system admin
  const isSystemAdmin = SYSTEM_ADMINS.includes(currentUser?.email?.toLowerCase());

  // Load all approved users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const approvedUsers = await firestoreService.getApprovedUsers();
        setUsers(approvedUsers);

        // Load permissions for each user
        const permissionsMap = {};
        for (const user of approvedUsers) {
          try {
            const perms = await firestoreService.getUserPagePermissions(user.email);
            permissionsMap[user.email] = perms || [];
          } catch (e) {
            permissionsMap[user.email] = [];
          }
        }
        setUserPermissions(permissionsMap);
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

  // Save permissions for a user
  const saveUserPermissions = async (userEmail) => {
    try {
      setSaving(userEmail);
      await firestoreService.setUserPagePermissions(userEmail, userPermissions[userEmail] || []);
      toast.success(`Permissions saved for ${userEmail}`);
      setHasChanges(prev => ({ ...prev, [userEmail]: false }));
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(null);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em] mb-1">
            Permissions Manager
          </h1>
          <p className="text-[15px] text-[#86868b]">
            Control which pages each user can access
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0071e3]/10 text-[#0071e3]">
          <Shield className="w-4 h-4" />
          <span className="text-[13px] font-medium">System Admin</span>
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
            const isExpanded = expandedUser === user.email;
            const isAdmin = SYSTEM_ADMINS.includes(user.email?.toLowerCase());
            const perms = userPermissions[user.email] || [];
            const hasUnsavedChanges = hasChanges[user.email];

            return (
              <div
                key={user.email}
                className={`rounded-2xl bg-[#ffffff] dark:bg-[#2c2c2e] border transition-all ${
                  isExpanded 
                    ? 'border-[#0071e3]/30 shadow-lg' 
                    : 'border-gray-200 dark:border-white/5 hover:shadow-md'
                }`}
              >
                {/* User Header */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedUser(isExpanded ? null : user.email)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white font-semibold text-[15px]">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">
                          {user.displayName || 'Unknown User'}
                        </h3>
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
                      <p className="text-[13px] text-[#86868b]">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-[#86868b]">
                      {isAdmin ? 'Full Access' : `${perms.length} pages`}
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
                        {/* Quick Actions */}
                        <div className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => grantAllPages(user.email)}
                              className="px-3 py-1.5 rounded-lg bg-[#34c759]/10 text-[#34c759] text-[13px] font-medium hover:bg-[#34c759]/20 transition-colors"
                            >
                              Grant All
                            </button>
                            <button
                              onClick={() => revokeAllPages(user.email)}
                              className="px-3 py-1.5 rounded-lg bg-[#ff3b30]/10 text-[#ff3b30] text-[13px] font-medium hover:bg-[#ff3b30]/20 transition-colors"
                            >
                              Revoke All
                            </button>
                          </div>
                          <button
                            onClick={() => saveUserPermissions(user.email)}
                            disabled={!hasUnsavedChanges || saving === user.email}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                              hasUnsavedChanges
                                ? 'bg-[#0071e3] text-white hover:bg-[#0077ed] shadow-lg shadow-[#0071e3]/25'
                                : 'bg-black/5 dark:bg-white/5 text-[#86868b] cursor-not-allowed'
                            }`}
                          >
                            {saving === user.email ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save Changes
                          </button>
                        </div>

                        {/* Pages Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(ALL_PAGES).map(([pageId, page]) => {
                            const hasAccess = perms.includes(pageId);
                            const Icon = page.icon;
                            const isDashboard = pageId === 'dashboard';

                            return (
                              <button
                                key={pageId}
                                onClick={() => !isDashboard && togglePermission(user.email, pageId)}
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
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PermissionsManager;
