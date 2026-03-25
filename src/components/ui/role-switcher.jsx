import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { USER_ROLES, ROLE_PERMISSIONS } from '../../entities/UserRoles';
import { ChevronDown, User, Users, BarChart3, FileText, Settings, Target, TrendingUp, Shield, Edit, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import EditProfileModal from './EditProfileModal';
import { toast } from 'react-hot-toast';

const RoleSwitcher = () => {
  const { currentRole, switchRole, getCurrentRolePermissions, currentUser, refreshCurrentUser, isSystemAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const currentRoleData = getCurrentRolePermissions() || { color: 'blue', displayName: 'Loading...' };
  
  const roleOptions = [
    {
      role: USER_ROLES.ADMIN,
      label: 'System Admin',
      icon: '👑',
      color: 'red',
      description: 'Full system access & user management',
      features: ['User Management', 'Role Assignment', 'System Administration', 'All Profiles']
    },
    {
      role: USER_ROLES.CONTENT_DIRECTOR,
      label: 'Content Manager',
      icon: '🎥',
      color: 'blue',
      description: 'Content strategy & creative direction',
      features: ['Content Strategy', 'Creative Direction', 'Team Management', 'Analytics']
    },
    {
      role: USER_ROLES.SOCIAL_MEDIA_MANAGER,
      label: 'Social Media Manager',
      icon: '📱',
      color: 'purple',
      description: 'Social media & engagement',
      features: ['Social Strategy', 'Content Creation', 'Community Management', 'Metrics']
    },
    {
      role: USER_ROLES.HR_MANAGER,
      label: 'HR Manager',
      icon: '👥',
      color: 'green',
      description: 'Team development & HR',
      features: ['Team Development', 'Performance Management', 'HR Analytics', 'Training']
    },
    {
      role: USER_ROLES.SALES_MANAGER,
      label: 'Sales Manager',
      icon: '💼',
      color: 'orange',
      description: 'Sales pipeline & CRM',
      features: ['CRM Management', 'Lead Generation', 'Sales Pipeline', 'Deal Tracking']
    }
  ];

  // Get user's assigned roles (support both old single-role and new multi-role systems)
  const userAssignedRoles = currentUser?.roles || [currentUser?.primaryRole || currentUser?.role] || ['content_director'];
  const safeUserAssignedRoles = Array.isArray(userAssignedRoles) ? userAssignedRoles : ['content_director'];

  // System admins (from DB, not hardcoded) can always see and switch to all roles
  const shouldShowAllRoles = isSystemAdmin;

  // Filter role options based on user's assigned roles
  const filteredRoleOptions = shouldShowAllRoles
    ? roleOptions
    : roleOptions.filter(option => safeUserAssignedRoles.includes(option.role));

  const handleRoleSwitch = (newRole) => {
    if (isSystemAdmin) {
      switchRole(newRole);
      setIsOpen(false);
      return;
    }

    if (safeUserAssignedRoles.includes(newRole)) {
      switchRole(newRole);
      setIsOpen(false);
    } else {
      toast.error('You do not have permission to switch to this role.');
    }
  };

  const getRoleColor = (color) => {
    const colors = {
      red: 'bg-red-100 text-red-800 border-red-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[color] || colors.blue;
  };

  const getBadgeColor = (color) => {
    const colors = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500'
    };
    return colors[color] || colors.blue;
  };

  // Function to get display name for roles
  const getRoleDisplayName = (role) => {
    const roleMap = {
      'content_director': 'Content Manager',
      'social_media_manager': 'Social Media Manager',
      'hr_manager': 'HR Manager',
      'sales_manager': 'Sales Manager',
      'admin': 'System Admin'
    };
    return roleMap[role] || role;
  };

  const getRoleIcon = (role) => {
    const iconMap = {
      'admin': '👑',
      'content_director': '🎥',
      'social_media_manager': '📱',
      'hr_manager': '👥',
      'sales_manager': '💼'
    };
    return iconMap[role] || '👤';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 px-4 py-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${getRoleColor(currentRoleData.color)} hover:shadow-lg`}
        title="Switch Profile Role"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden">
          {currentUser?.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div className={`w-full h-full flex items-center justify-center ${currentUser?.avatar ? 'hidden' : ''}`}>
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="text-left">
          <div className="font-medium text-sm flex items-center gap-2">
            {currentUser?.displayName || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Profile'}
            {isSystemAdmin && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Admin</span>
            )}
            {!isSystemAdmin && safeUserAssignedRoles.length > 1 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {safeUserAssignedRoles.length} Roles
              </span>
            )}
          </div>
          <div className="text-xs opacity-75">{currentRoleData.displayName}</div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* User Profile Card */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                {currentUser?.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center text-2xl ${currentUser?.avatar ? 'hidden' : ''}`}>
                  <User className="w-8 h-8 text-gray-500" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {currentUser?.displayName || `${currentUser?.firstName} ${currentUser?.lastName}`}
                </h3>
                <p className="text-sm text-gray-600 truncate">{currentUser?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {currentUser?.department || 'General'}
                  </span>
                  {isSystemAdmin && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              </div>
              <div>
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 p-2"
                  title="Edit Profile"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
            
            {/* Current Role Display */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Current Role</div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{getRoleIcon(currentRole)}</span>
                <span className="font-medium text-gray-900">{getRoleDisplayName(currentRole)}</span>
              </div>
            </div>
          </div>

          {/* Profile Menu Links */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Profile Menu</div>
            <Link
              to="/self-service"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              <UserCircle className="w-4 h-4" />
              <span>My Profile</span>
            </Link>
            <Link
              to="/resources"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              <FileText className="w-4 h-4" />
              <span>Resources</span>
            </Link>
          </div>

          {/* Role Switching Section */}
          <div className="p-4 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-4">Switch Profile Role</div>
            
            {/* Show available roles info for non-admin users */}
            {!isAdminUser && (
              <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-50 rounded">
                You have access to {safeUserAssignedRoles.length} role{safeUserAssignedRoles.length !== 1 ? 's' : ''}: {safeUserAssignedRoles.map(role => getRoleDisplayName(role)).join(', ')}
              </div>
            )}
            
            {filteredRoleOptions.map((option) => {
              const isActive = option.role === currentRole;
              return (
                <button
                  key={option.role}
                  onClick={() => handleRoleSwitch(option.role)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 mb-2 ${
                    isActive 
                      ? `${getRoleColor(option.color)} border-2` 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">{option.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium text-sm ${isActive ? 'text-gray-900' : 'text-gray-900'}`}>
                        {option.label}
                      </div>
                      <div className={`text-xs mt-0.5 ${isActive ? 'text-gray-700' : 'text-gray-500'}`}>
                        {option.description}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-current rounded-full"></div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-200">
            {isSystemAdmin ? (
              <div className="text-xs text-gray-500">
                <span className="font-medium text-red-600">Admin Access:</span> You can switch to any role and always return to admin.
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                Each role has different permissions and access levels. Switch to explore different perspectives.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        user={currentUser}
        isAdmin={isSystemAdmin}
        onSave={async (updates) => {
          try {
            const { supabaseService } = await import('../../services/firestoreService');

            await supabaseService.updateApprovedUser(currentUser.email, updates);

            // Also update employee collection if it exists
            try {
              const employee = await supabaseService.getEmployeeByEmail(currentUser.email);
              if (employee) {
                await supabaseService.updateEmployee(employee.id, updates);
              }
            } catch (_) { /* employee record not found — non-fatal */ }

            // Brief pause to let Supabase commit
            await new Promise(resolve => setTimeout(resolve, 500));

            toast.success('Profile updated successfully!');
            setIsEditOpen(false);

            if (refreshCurrentUser) {
              await refreshCurrentUser();
            } else {
              setTimeout(() => window.location.reload(), 500);
            }
          } catch (e) {
            console.error('Failed to update profile:', e);
            toast.error(`Failed to update profile: ${e.message || 'Unknown error'}`);
          }
        }}
      />
    </div>
  );
};

export default RoleSwitcher;
