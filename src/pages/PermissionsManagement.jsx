import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Shield, User, Check, X, Search, Save } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// Available pages that can be granted permissions
const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'Dashboard', icon: '🏠', category: 'Core' },
  { id: 'tasks', name: 'Tasks', icon: '✅', category: 'Core' },
  { id: 'clients', name: 'Clients', icon: '👥', category: 'Client Management' },
  { id: 'client-packages', name: 'Client Packages', icon: '📦', category: 'Client Management' },
  { id: 'instagram-reports', name: 'Instagram Reports', icon: '📸', category: 'Client Management' },
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
      
      // Load permissions for each user
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
      console.log('💾 Saving permissions for:', userEmail, 'Permissions:', permissions);
      
      // Check if user exists in approved_users collection first
      const userExists = users.find(u => u.email === userEmail);
      if (!userExists) {
        toast.error(`User ${userEmail} not found in approved users`);
        setSaving(false);
        return;
      }

      await firestoreService.setUserPagePermissions(userEmail, permissions);
      console.log('✅ Permissions saved successfully');
      toast.success(`Permissions saved for ${userEmail}`);
      
      // Reload permissions to verify they were saved
      const updatedPermissions = await firestoreService.getUserPagePermissions(userEmail);
      console.log('✅ Verified saved permissions:', updatedPermissions);
    } catch (error) {
      console.error('❌ Error saving permissions:', error);
      console.error('❌ Error details:', error.message, error.stack);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            Only system administrators can manage page permissions.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Page Permissions Management</h1>
          </div>
          <p className="text-gray-600">
            Control which pages each user can access. Pages will appear in their navigation menu based on permissions.
          </p>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-none outline-none text-gray-900 placeholder-gray-400"
            />
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading users...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Users List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Users</h2>
              {filteredUsers.map((user) => (
                <Card
                  key={user.email}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedUser?.email === user.email
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {user.firstName} {user.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {(userPermissions[user.email] || []).length} pages
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>

            {/* Permissions Editor */}
            {selectedUser && (
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Permissions for {selectedUser.firstName} {selectedUser.lastName}
                  </h2>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>

                <div className="space-y-6 max-h-[600px] overflow-y-auto">
                  {Object.entries(groupedPages).map(([category, pages]) => (
                    <div key={category}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {pages.map((page) => {
                          const hasPermission = (userPermissions[selectedUser.email] || []).includes(page.id);
                          return (
                            <label
                              key={page.id}
                              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={hasPermission}
                                onChange={() => handleTogglePermission(selectedUser.email, page.id)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-lg">{page.icon}</span>
                              <span className="flex-1 font-medium text-gray-900">{page.name}</span>
                              {hasPermission ? (
                                <Check className="w-5 h-5 text-green-500" />
                              ) : (
                                <X className="w-5 h-5 text-gray-300" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Button
                    onClick={() => handleSavePermissions(selectedUser.email)}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Permissions'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionsManagement;
