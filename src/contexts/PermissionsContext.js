import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { firestoreService } from '../services/firestoreService';
import { getBaseModuleIds } from '../modules/registry';

const PermissionsContext = createContext();

// System admins always have full access
const SYSTEM_ADMINS = [
  'jrsschroeder@gmail.com'
];

// Feature permissions - granular access within pages
export const FEATURE_PERMISSIONS = {
  VIEW_FINANCIALS: 'view_financials',      // See salary, compensation, financial data
  MANAGE_USERS: 'manage_users',            // Add/remove users, change roles
  APPROVE_TIME_OFF: 'approve_time_off',    // Approve/deny time off requests
  VIEW_ANALYTICS: 'view_analytics',        // Access to analytics dashboards
};

// localStorage key for caching permissions
const PERMISSIONS_CACHE_KEY = 'luxury_listings_permissions';

export function usePermissions() {
  return useContext(PermissionsContext);
}

/**
 * PermissionsProvider - Caches user permissions to avoid repeated Firestore calls
 * Loads once on auth, caches in localStorage, NO real-time listener for performance
 * Supports both page permissions and feature permissions (granular access)
 */
export function PermissionsProvider({ children }) {
  const { currentUser } = useAuth();
  const [permissions, setPermissions] = useState(() => {
    // Load from localStorage on init for instant access
    try {
      const cached = localStorage.getItem(PERMISSIONS_CACHE_KEY);
      if (cached) {
        const { email, perms } = JSON.parse(cached);
        if (email === currentUser?.email) return perms;
      }
    } catch (e) {}
    return [];
  });
  const [featurePermissions, setFeaturePermissions] = useState(() => {
    // Load feature permissions from localStorage
    try {
      const cached = localStorage.getItem(PERMISSIONS_CACHE_KEY);
      if (cached) {
        const { email, features } = JSON.parse(cached);
        if (email === currentUser?.email) return features || [];
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  // Refresh permissions on demand (e.g., after admin changes)
  const refreshPermissions = useCallback(async () => {
    if (!currentUser?.email || isSystemAdmin) return;
    
    try {
      const result = await firestoreService.getUserPermissions(currentUser.email);
      const pagePerms = result?.pages || result || [];
      const featurePerms = result?.features || [];
      
      setPermissions(Array.isArray(pagePerms) ? pagePerms : []);
      setFeaturePermissions(Array.isArray(featurePerms) ? featurePerms : []);
      
      // Cache to localStorage
      localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify({
        email: currentUser.email,
        perms: pagePerms,
        features: featurePerms
      }));
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    }
  }, [currentUser?.email, isSystemAdmin]);

  useEffect(() => {
    if (!currentUser?.email) {
      setPermissions([]);
      setFeaturePermissions([]);
      setLoading(false);
      setIsSystemAdmin(false);
      localStorage.removeItem(PERMISSIONS_CACHE_KEY);
      return;
    }

    // Check if system admin
    const adminStatus = SYSTEM_ADMINS.includes(currentUser.email.toLowerCase());
    setIsSystemAdmin(adminStatus);

    // System admins don't need to load permissions
    if (adminStatus) {
      setPermissions([]);
      setFeaturePermissions([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Load permissions once (no real-time listener for performance)
    const loadPermissions = async () => {
      try {
        const result = await firestoreService.getUserPermissions(currentUser.email);
        const pagePerms = result?.pages || result || [];
        const featurePerms = result?.features || [];
        
        if (isMounted) {
          setPermissions(Array.isArray(pagePerms) ? pagePerms : []);
          setFeaturePermissions(Array.isArray(featurePerms) ? featurePerms : []);
          
          // Cache to localStorage
          localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify({
            email: currentUser.email,
            perms: pagePerms,
            features: featurePerms
          }));
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
        if (isMounted) {
          setPermissions([]);
          setFeaturePermissions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPermissions();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.email]);

  // Check if user has permission for a specific page
  const hasPermission = (pageId) => {
    // System admins have access to everything
    if (isSystemAdmin) return true;
    
    // Dashboard is always accessible
    if (pageId === 'dashboard') return true;
    
    // Base modules are always accessible
    const baseModules = getBaseModuleIds();
    if (baseModules.includes(pageId)) return true;
    
    // Check user's additional permissions
    return permissions.includes(pageId);
  };

  // Check if user has a specific feature permission (granular access)
  const hasFeaturePermission = (featureId) => {
    // System admins have access to all features
    if (isSystemAdmin) return true;
    
    // Check user's feature permissions
    return featurePermissions.includes(featureId);
  };

  const value = {
    permissions,
    featurePermissions,
    loading,
    isSystemAdmin,
    hasPermission,
    hasFeaturePermission,
    refreshPermissions // Expose for manual refresh when needed
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}
