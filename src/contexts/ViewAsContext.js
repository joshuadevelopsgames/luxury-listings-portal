import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';

const ViewAsContext = createContext();

export function useViewAs() {
  const context = useContext(ViewAsContext);
  if (!context) {
    return {
      viewingAsUser: null,
      isViewingAs: false,
      startViewingAs: () => {},
      stopViewingAs: () => {},
      viewAsPermissions: [],
      viewAsRole: null,
      getEffectiveUser: (user) => user,
      effectiveHasPermission: (_, realHasPermission) => realHasPermission,
      getEffectivePermissions: (perms) => perms,
      getEffectiveRole: (role) => role,
      // Deprecated — kept for call-site compat
      viewAsFeaturePermissions: [],
    };
  }
  return context;
}

/**
 * ViewAsProvider - Allows system admins to view the site as another user.
 * Simplified: only page permissions matter now.
 */
export function ViewAsProvider({ children }) {
  const [viewingAsUser, setViewingAsUser] = useState(null);
  const [viewAsPermissions, setViewAsPermissions] = useState([]);
  const [viewAsRole, setViewAsRole] = useState(null);

  useEffect(() => {
    if (!viewingAsUser?.email) {
      setViewAsPermissions([]);
      setViewAsRole(null);
      return;
    }

    const unsubscribe = supabaseService.onApprovedUserChange(viewingAsUser.email, (approvedUser) => {
      if (!approvedUser) {
        setViewAsPermissions([]);
        setViewAsRole(null);
        return;
      }
      setViewAsPermissions(approvedUser.pagePermissions || []);
      setViewAsRole(approvedUser.role || approvedUser.primaryRole || viewingAsUser.role || 'content_director');
      setViewingAsUser(prev => prev ? { ...prev, ...approvedUser } : null);
    });

    return () => unsubscribe();
  }, [viewingAsUser?.email]);

  const startViewingAs = (user) => {
    console.log('👁️ Starting View As:', user.email);
    setViewingAsUser(user);
  };

  const stopViewingAs = () => {
    console.log('👁️ Stopping View As');
    setViewingAsUser(null);
    setViewAsPermissions([]);
    setViewAsRole(null);
  };

  const isViewingAs = !!viewingAsUser;

  const getEffectiveUser = (realUser) => {
    if (isViewingAs && viewingAsUser) {
      return { ...viewingAsUser, _realUser: realUser, _isViewingAs: true };
    }
    return realUser;
  };

  const effectiveHasPermission = (permission, realHasPermission) => {
    if (!isViewingAs) return realHasPermission;
    return viewAsPermissions.includes(permission);
  };

  const getEffectivePermissions = (realPermissions) => {
    if (!isViewingAs) return realPermissions;
    return viewAsPermissions;
  };

  const getEffectiveRole = (realRole) => {
    if (!isViewingAs) return realRole;
    return viewAsRole;
  };

  const value = {
    viewingAsUser,
    isViewingAs,
    startViewingAs,
    stopViewingAs,
    viewAsPermissions,
    viewAsRole,
    getEffectiveUser,
    effectiveHasPermission,
    getEffectivePermissions,
    getEffectiveRole,
    // Deprecated — kept for backwards compat
    viewAsFeaturePermissions: [],
  };

  return (
    <ViewAsContext.Provider value={value}>
      {children}
    </ViewAsContext.Provider>
  );
}
