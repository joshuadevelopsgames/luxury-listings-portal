/**
 * UserLink - Universal clickable user name that opens the user profile modal
 * 
 * Use this component everywhere a user name is displayed to provide
 * consistent, interactive user information across the app.
 */

import React, { useState, useEffect } from 'react';
import UserDetailModal from './UserDetailModal';

const UserLink = ({ 
  user, 
  className = '',
  showRole = false,
  showId = false,
  onUserUpdate = null,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localUser, setLocalUser] = useState(user);

  // Update local user when prop changes
  useEffect(() => {
    setLocalUser(user);
  }, [user]);

  const handleUserUpdate = (updatedUser) => {
    setLocalUser(updatedUser);
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  if (!user) return null;

  const displayName = localUser.displayName || 
    `${localUser.firstName || ''} ${localUser.lastName || ''}`.trim() || 
    localUser.email?.split('@')[0] || 
    'Unknown User';

  const roleDisplay = {
    system_admin: 'Admin',
    content_director: 'Director',
    content_manager: 'Manager',
    hr_manager: 'HR',
    graphic_designer: 'Designer',
    sales_rep: 'Sales',
    client: 'Client',
    viewer: 'Viewer'
  }[localUser.role] || localUser.role;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 text-[#5856d6] hover:text-[#6e6ce8] hover:underline font-medium transition-colors cursor-pointer ${className}`}
      >
        {children || displayName}
        {showId && (localUser.uid || localUser.id) && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#5856d6]/10 text-[#5856d6] font-mono">
            {(localUser.uid || localUser.id).slice(0, 8)}
          </span>
        )}
        {showRole && localUser.role && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[#86868b] font-normal">
            {roleDisplay}
          </span>
        )}
      </button>

      {/* User Detail Modal */}
      {isOpen && (
        <UserDetailModal
          user={localUser}
          onClose={() => setIsOpen(false)}
          onUserUpdate={handleUserUpdate}
        />
      )}
    </>
  );
};

export default UserLink;
