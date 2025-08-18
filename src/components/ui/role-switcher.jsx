import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { USER_ROLES, ROLE_PERMISSIONS } from '../../entities/UserRoles';
import { getAllowedRolesForUser } from '../../entities/UserRoleMapping';
import { ChevronDown, User, Users, BarChart3, FileText, Settings, Target, TrendingUp, Shield } from 'lucide-react';

const RoleSwitcher = () => {
  const { currentRole, switchRole, getCurrentRolePermissions, currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
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
      icon: '🎨',
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
  
  // Safety check - ensure userAssignedRoles is always an array
  const safeUserAssignedRoles = Array.isArray(userAssignedRoles) ? userAssignedRoles : ['content_director'];
  
  // Admin users should always have access to all roles
  // Check if the user is the admin user (jrsschroeder@gmail.com) - this should never change
  const isAdminUser = currentUser?.email === 'jrsschroeder@gmail.com';
  
  // Admin users can always see all roles, regardless of current role
  const shouldShowAllRoles = isAdminUser;
  
  // Debug logging
  console.log('🔍 Role Switcher Debug:', {
    userEmail: currentUser?.email,
    isAdminUser,
    shouldShowAllRoles,
    currentRole,
    userAssignedRoles: safeUserAssignedRoles,
    filteredRoleOptionsCount: shouldShowAllRoles ? roleOptions.length : roleOptions.filter(option => safeUserAssignedRoles.includes(option.role)).length
  });
  
  // Filter role options based on user's assigned roles
  // For admin users, show all roles. For others, only show their assigned roles
  const filteredRoleOptions = shouldShowAllRoles ? roleOptions : roleOptions.filter(option => 
    safeUserAssignedRoles.includes(option.role)
  );

  const handleRoleSwitch = (newRole) => {
    console.log('🔄 Role Switcher - Switching to:', newRole);
    
    // For admin users, always allow role switching
    if (isAdminUser) {
      console.log('✅ Admin user - switching role');
      switchRole(newRole);
      setIsOpen(false);
      return;
    }
    
    // For regular users, check if they have this role
    if (safeUserAssignedRoles.includes(newRole)) {
      console.log('✅ User has this role - switching');
      switchRole(newRole);
      setIsOpen(false);
    } else {
      console.log('❌ User does not have this role');
      alert('You do not have permission to switch to this role.');
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

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 px-4 py-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${getRoleColor(currentRoleData.color)} hover:shadow-lg`}
        title="Switch Profile Role"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="text-left">
          <div className="font-medium text-sm flex items-center gap-2">
            Profile
            {currentUser?.email === 'jrsschroeder@gmail.com' && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Admin</span>
            )}
            {!isAdminUser && safeUserAssignedRoles.length > 1 && (
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
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
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
                  className={`w-full text-left p-4 rounded-lg border transition-all duration-200 mb-3 ${
                    isActive 
                      ? `${getRoleColor(option.color)} border-2` 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div className="flex-1">
                      <div className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-900'}`}>
                        {option.label}
                      </div>
                      <div className={`text-xs mt-1 ${isActive ? 'text-gray-700' : 'text-gray-500'}`}>
                        {option.description}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {option.features.slice(0, 2).map((feature, index) => (
                          <span 
                            key={index}
                            className={`text-xs px-2 py-1 rounded-full ${
                              isActive 
                                ? `${getBadgeColor(option.color)} bg-opacity-20 text-white` 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {feature}
                          </span>
                        ))}
                        {option.features.length > 2 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isActive 
                              ? `${getBadgeColor(option.color)} bg-opacity-20 text-white` 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            +{option.features.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-current rounded-full mt-2"></div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-200">
            {currentUser?.email === 'jrsschroeder@gmail.com' ? (
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
    </div>
  );
};

export default RoleSwitcher;
