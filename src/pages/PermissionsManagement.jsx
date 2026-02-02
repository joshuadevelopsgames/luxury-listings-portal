import React, { useState, useEffect } from 'react';
import { Shield, User, Check, X, Search, Save } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [saving, setSaving] = useState(false);

  // Check if user is system admin
  const isSystemAdmin = currentUser?.email === 'jrsschroeder@gmail.com';

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
      const approvedUsers = await firestoreService.getApprovedUsers();
      setUsers(approvedUsers);
      
      const permissionsMap = {};
      for (const user of approvedUsers) {
        const permissions = await firestoreService.getUserPagePermissions(user.email);
        permissionsMap[user.email] = permissions || [];
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

      await firestoreService.setUserPagePermissions(userEmail, permissions);
      toast.success(`Permissions saved for ${userEmail}`);
      
      await firestoreService.getUserPagePermissions(userEmail);
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
        <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-[#ff3b30] mx-auto mb-4" />
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] dark:text-white mb-2">Access Denied</h2>
          <p className="text-[14px] text-[#86868b]">
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
          <Shield className="w-8 h-8 text-[#0071e3]" />
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] dark:text-white tracking-[-0.02em]">
            Page Permissions
          </h1>
        </div>
        <p className="text-[15px] sm:text-[17px] text-[#86868b]">
          Control which pages each user can access. Pages will appear in their navigation menu based on permissions.
        </p>
      </div>

      {/* Search */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-[#86868b]" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#1d1d1f] dark:text-white placeholder-[#86868b]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-[14px] text-[#86868b]">Loading users...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users List */}
          <div className="space-y-4">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">Users</h2>
            {filteredUsers.map((user) => (
              <div
                key={user.email}
                className={`rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border p-4 cursor-pointer transition-all ${
                  selectedUser?.email === user.email
                    ? 'border-[#0071e3] ring-2 ring-[#0071e3]/20'
                    : 'border-black/5 dark:border-white/10 hover:shadow-lg'
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0071e3]/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-[#0071e3]" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-[12px] text-[#86868b]">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-1 rounded-md bg-[#0071e3]/10 text-[#0071e3] font-medium">
                    {(userPermissions[user.email] || []).length} pages
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Permissions Editor */}
          {selectedUser && (
            <div className="rounded-2xl bg-white/80 dark:bg-[#1d1d1f]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 p-6">
              <div className="mb-6">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-1">
                  Permissions for {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <p className="text-[12px] text-[#86868b]">{selectedUser.email}</p>
              </div>

              <div className="space-y-6 max-h-[500px] overflow-y-auto">
                {Object.entries(groupedPages).map(([category, pages]) => (
                  <div key={category}>
                    <h3 className="text-[11px] font-semibold text-[#86868b] mb-3 uppercase tracking-wider">
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
                                ? 'bg-[#34c759]/10 border border-[#34c759]/20' 
                                : 'bg-black/[0.02] dark:bg-white/5 border border-transparent hover:bg-black/5 dark:hover:bg-white/10'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={hasPermission}
                              onChange={() => handleTogglePermission(selectedUser.email, page.id)}
                              className="w-4 h-4 text-[#0071e3] rounded focus:ring-[#0071e3]"
                            />
                            <span className="text-lg">{page.icon}</span>
                            <span className="flex-1 text-[13px] font-medium text-[#1d1d1f] dark:text-white">{page.name}</span>
                            {hasPermission ? (
                              <Check className="w-5 h-5 text-[#34c759]" />
                            ) : (
                              <X className="w-5 h-5 text-[#86868b]/30" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/10">
                <button
                  onClick={() => handleSavePermissions(selectedUser.email)}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Permissions'}
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
