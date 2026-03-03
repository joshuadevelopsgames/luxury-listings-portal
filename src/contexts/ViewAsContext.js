import React, { createContext, useContext, useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';

const ViewAsContext = createContext();

export function useViewAs() {
  const context = useContext(ViewAsContext);
  // Return safe defaults if context is not available (e.g., rendered outside provider)
  if (!context) {
    return {
      viewingAsUser: null,
      isViewingAs: false,
      startViewingAs: () => {},
      stopViewingAs: () => {},
      viewAsPermissions: [],
      viewAsFeaturePermissions: [],
      viewAsAdminPermissions: false,
      viewAsRole: null,
      getEffectiveUser: (user) => user,
      effectiveHasPermission: (_, realHasPermission) => realHasPermission,
      getEffectivePermissions: (perms) => perms,
      getEffectiveRole: (role) => role
    };
  }
  return context;
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
  const [viewAsFeaturePermissions, setViewAsFeaturePermissions] = useState([]);
  const [viewAsAdminPermissions, setViewAsAdminPermissions] = useState(false);
  const [viewAsRole, setViewAsRole] = useState(null);

  // Subscribe to viewed user's doc so permissions/role stay in sync when changed in Users & Permissions
  useEffect(() => {
    if (!viewingAsUser?.email) {
      setViewAsPermissions([]);
      setViewAsFeaturePermissions([]);
      setViewAsAdminPermissions(false);
      setViewAsRole(null);
      return;
    }

    const unsubscribe = firestoreService.onApprovedUserChange(viewingAsUser.email, (approvedUser) => {
      if (!approvedUser) {
        setViewAsPermissions([]);
        setViewAsFeaturePermissions([]);
        setViewAsAdminPermissions(false);
        setViewAsRole(null);
        return;
      }
      setViewAsPermissions(approvedUser.pagePermissions || []);
      setViewAsFeaturePermissions(approvedUser.featurePermissions || []);
      setViewAsAdminPermissions(!!approvedUser.adminPermissions);
      setViewAsRole(approvedUser.role || approvedUser.primaryRole || viewingAsUser.role || 'content_director');
      setViewingAsUser(prev => prev ? { ...prev, ...approvedUser } : null);
    });

    return () => unsubscribe();
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
    setViewAsFeaturePermissions([]);
    setViewAsAdminPermissions(false);
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
    viewAsFeaturePermissions,
    viewAsAdminPermissions,
    viewAsRole,
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
