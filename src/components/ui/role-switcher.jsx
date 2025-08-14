import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { USER_ROLES, ROLE_PERMISSIONS } from '../../entities/UserRoles';
import { ChevronDown, User, Users, BarChart3, FileText, Settings, Target, TrendingUp, Shield } from 'lucide-react';

const RoleSwitcher = () => {
  const { currentRole, switchRole, getCurrentRolePermissions } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const currentRoleData = getCurrentRolePermissions();
  
  const roleOptions = [
    {
      role: USER_ROLES.CONTENT_DIRECTOR,
      label: 'Content Director',
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
    }
  ];

  const handleRoleSwitch = (newRole) => {
    switchRole(newRole);
    setIsOpen(false);
  };

  const getRoleColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      green: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="relative">
      {/* Profile Tab Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 px-4 py-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${getRoleColor(currentRoleData.color)} hover:shadow-lg`}
        title="Switch Profile Role"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
        <div className="text-left">
          <div className="font-medium text-sm">Profile</div>
          <div className="text-xs opacity-75">{currentRoleData.displayName}</div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <div className="text-sm font-medium text-gray-700 mb-4">Switch Profile Role</div>
            
            {roleOptions.map((option) => {
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
                      <div className={`font-medium ${isActive ? 'text-white' : 'text-gray-900'}`}>
                        {option.label}
                      </div>
                      <div className={`text-xs mt-1 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                        {option.description}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {option.features.slice(0, 2).map((feature, index) => (
                          <span 
                            key={index}
                            className={`text-xs px-2 py-1 rounded-full ${
                              isActive 
                                ? 'bg-current bg-opacity-20 text-white' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {feature}
                          </span>
                        ))}
                        {option.features.length > 2 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isActive 
                              ? 'bg-current bg-opacity-20 text-white' 
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
            <div className="text-xs text-gray-500">
              Each role has different permissions and access levels. Switch to explore different perspectives.
            </div>
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
