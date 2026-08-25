import React, { useState, useEffect } from 'react';
import { Shield, User, Check, X, Search, Save } from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { getDefaultPagePermissions } from '../entities/UserRoles';
import { toast } from 'react-hot-toast';

// Available pages that can be granted permissions
const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'Dashboard', icon: '🏠', category: 'Core' },
  { id: 'tasks', name: 'Tasks', icon: '✅', category: 'Core' },
  { id: 'clients', name: 'Client Management', icon: '👥', category: 'Client Management' },
  { id: 'posting-packages', name: 'Posting Packages', icon: '📦', category: 'Content' },
  { id: 'instagram-reports', name: 'Instagram Analytics', icon: '📸', category: 'Client Management' },
  { id: 'content-calendar', name: 'Content Calendar', icon: '📅', category: 'Content' },
  { id: 'crm', name: 'CRM', icon: '💼', category: 'Sales' },
  { id: 'hr-calendar', name: 'HR Calendar', icon: '📆', category: 'HR' },
  { id: 'team', name: 'Team Management', icon: '👨‍👩‍👧‍👦', category: 'HR' },
  { id: 'it-support', name: 'IT Support', icon: '🛠️', category: 'Support' },
  { id: 'my-time-off', name: 'My Time Off', icon: '🏖️', category: 'HR' },
];

const PermissionsManagement = () => {
  const { currentUser } = useAuth();
  const { isSystemAdmin } = usePermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSystemAdmin) {
      toast.error('Access denied. Only system administrators can manage permissions.');
      return;
    }
    loadUsers();
  }, [isSystemAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const approvedUsers = await supabaseService.getApprovedUsers();
      setUsers(approvedUsers);
      
      const permissionsMap = {};
      for (const user of approvedUsers) {
        const result = supabaseService.getPermissionsFromUserRecord(user);
        permissionsMap[user.email] = result?.pages || [];
      }
      setUserPermissions(permissionsMap);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (userEmail, pageId) => {
    const currentPermissions = userPermissions[userEmail] || [];
    const hasPermission = currentPermissions.includes(pageId);
    
    setUserPermissions(prev => ({
      ...prev,
      [userEmail]: hasPermission
        ? currentPermissions.filter(p => p !== pageId)
        : [...currentPermissions, pageId]
    }));
  };

  const handleResetToRoleDefaults = (userEmail) => {
    const user = users.find(u => u.email === userEmail);
    if (!user) return;
    const role = user.role || user.primaryRole || 'content_director';
    const defaults = getDefaultPagePermissions(role);
    setUserPermissions(prev => ({ ...prev, [userEmail]: defaults }));
    toast.success(`Reset to ${role} defaults — click Save to apply`);
  };

  const handleSavePermissions = async (userEmail) => {
    try {
      setSaving(true);
      const permissions = userPermissions[userEmail] || [];
      
      const userExists = users.find(u => u.email === userEmail);
      if (!userExists) {
        toast.error(`User ${userEmail} not found in approved users`);
        setSaving(false);
        return;
      }

      await supabaseService.setUserPagePermissions(userEmail, permissions, { changedBy: currentUser?.email });
      toast.success(`Permissions saved for ${userEmail}`);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error(`Failed to save permissions: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPages = AVAILABLE_PAGES.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = [];
    }
    acc[page.category].push(page);
    return acc;
  }, {});

  if (!isSystemAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-danger mx-auto mb-4" />
          <h2 className="text-[22px] font-semibold text-ink mb-2">Access Denied</h2>
          <p className="text-[14px] text-ink-muted">
            Only system administrators can manage page permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-brand" />
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-ink tracking-[-0.02em]">
            Page Permissions
          </h1>
        </div>
        <p className="text-[15px] sm:text-[17px] text-ink-muted">
          Control which pages each user can access. Pages will appear in their navigation menu based on permissions.
        </p>
      </div>

      {/* Search */}
      <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-ink-muted" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-ink placeholder-ink-muted"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[14px] text-ink-muted">Loading users...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users List */}
          <div className="space-y-4">
            <h2 className="text-[17px] font-semibold text-ink">Users</h2>
            {filteredUsers.map((user) => (
              <div
                key={user.email}
                className={`rounded-xl bg-surface backdrop-blur-xl border p-4 cursor-pointer transition-all ${
                  selectedUser?.email === user.email
                    ? 'border-brand ring-2 ring-brand/20'
                    : 'border-hairline hover:shadow-md'
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-medium text-ink">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-[12px] text-ink-muted">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-md bg-brand/10 text-brand font-medium">
                    {(userPermissions[user.email] || []).length} pages
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Permissions Editor */}
          {selectedUser && (
            <div className="rounded-xl bg-surface backdrop-blur-xl border border-hairline p-6">
              <div className="mb-6">
                <h2 className="text-[17px] font-semibold text-ink mb-1">
                  Permissions for {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <p className="text-[12px] text-ink-muted">{selectedUser.email}</p>
              </div>

              <div className="space-y-6 max-h-[500px] overflow-y-auto">
                {Object.entries(groupedPages).map(([category, pages]) => (
                  <div key={category}>
                    <h3 className="text-[11px] font-semibold text-ink-muted mb-3 uppercase tracking-wider">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {pages.map((page) => {
                        const hasPermission = (userPermissions[selectedUser.email] || []).includes(page.id);
                        return (
                          <label
                            key={page.id}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                              hasPermission 
                                ? 'bg-positive/10 border border-positive/20' 
                                : 'bg-surface-2 border border-transparent hover:bg-surface-3'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={hasPermission}
                              onChange={() => handleTogglePermission(selectedUser.email, page.id)}
                              className="w-4 h-4 text-brand rounded focus:ring-brand"
                            />
                            <span className="text-lg">{page.icon}</span>
                            <span className="flex-1 text-[13px] font-medium text-ink">{page.name}</span>
                            {hasPermission ? (
                              <Check className="w-5 h-5 text-positive" />
                            ) : (
                              <X className="w-5 h-5 text-ink-muted/30" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-hairline space-y-3">
                <button
                  onClick={() => handleSavePermissions(selectedUser.email)}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand text-white text-[14px] font-medium hover:bg-brand-hover transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
                <button
                  onClick={() => handleResetToRoleDefaults(selectedUser.email)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-transparent border border-hairline-strong text-ink-muted text-[13px] font-medium hover:bg-surface-3 transition-colors"
                >
                  Reset to Role Defaults
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PermissionsManagement;
