import React, { createContext, useContext, useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';

const ViewAsContext = createContext();

export function useViewAs() {
  return useContext(ViewAsContext);
}

/**
 * ViewAsProvider - Allows system admins to view the site as another user
 * 
 * When viewing as another user:
 * - effectiveUser returns the viewed user instead of the real user
 * - effectivePermissions returns the viewed user's permissions
 * - Navigation is filtered based on their permissions
 * - Data fetching should use effectiveUser.email
 * - A banner shows at the top indicating view mode
 * - Admin can exit at any time to return to their own view
 */
export function ViewAsProvider({ children }) {
  const [viewingAsUser, setViewingAsUser] = useState(null);
  const [viewAsPermissions, setViewAsPermissions] = useState([]);
  const [viewAsRole, setViewAsRole] = useState(null);

  // Load permissions when viewing as a user
  useEffect(() => {
    if (!viewingAsUser?.email) {
      setViewAsPermissions([]);
      setViewAsRole(null);
      return;
    }

    const loadViewAsData = async () => {
      try {
        // Get the viewed user's permissions (page-level permissions)
        const permissions = await firestoreService.getUserPagePermissions(viewingAsUser.email);
        setViewAsPermissions(permissions || []);
        
        // Get their role
        const role = viewingAsUser.role || viewingAsUser.primaryRole || 'content_director';
        setViewAsRole(role);
        
        console.log('📋 View As loaded:', {
          user: viewingAsUser.email,
          permissions: permissions?.length || 0,
          role
        });
      } catch (error) {
        console.error('Error loading view-as data:', error);
        setViewAsPermissions([]);
        setViewAsRole(null);
      }
    };

    loadViewAsData();
  }, [viewingAsUser?.email]);

  // Start viewing as another user
  const startViewingAs = (user) => {
    console.log('👁️ Starting View As:', user.email);
    setViewingAsUser(user);
  };

  // Stop viewing as another user
  const stopViewingAs = () => {
    console.log('👁️ Stopping View As');
    setViewingAsUser(null);
    setViewAsPermissions([]);
    setViewAsRole(null);
  };

  // Check if currently viewing as another user
  const isViewingAs = !!viewingAsUser;

  // Get effective user (viewed user if viewing as, otherwise null - real user should come from AuthContext)
  const getEffectiveUser = (realUser) => {
    if (isViewingAs && viewingAsUser) {
      return {
        ...viewingAsUser,
        // Preserve some admin capabilities for debugging
        _realUser: realUser,
        _isViewingAs: true
      };
    }
    return realUser;
  };

  // Check if effective user has a specific permission
  const effectiveHasPermission = (permission, realHasPermission) => {
    if (!isViewingAs) {
      return realHasPermission;
    }
    // When viewing as, check the viewed user's permissions
    return viewAsPermissions.includes(permission);
  };

  // Get effective permissions
  const getEffectivePermissions = (realPermissions) => {
    if (!isViewingAs) {
      return realPermissions;
    }
    return viewAsPermissions;
  };

  // Get effective role
  const getEffectiveRole = (realRole) => {
    if (!isViewingAs) {
      return realRole;
    }
    return viewAsRole;
  };

  const value = {
    viewingAsUser,
    isViewingAs,
    startViewingAs,
    stopViewingAs,
    viewAsPermissions,
    viewAsRole,
    // Helper functions for components to get effective values
    getEffectiveUser,
    effectiveHasPermission,
    getEffectivePermissions,
    getEffectiveRole
  };

  return (
    <ViewAsContext.Provider value={value}>
      {children}
    </ViewAsContext.Provider>
  );
}
