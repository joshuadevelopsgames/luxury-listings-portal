import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { firestoreService } from '../services/firestoreService';

const PermissionsContext = createContext();

// System admins always have full access
const SYSTEM_ADMINS = [
  'jrsschroeder@gmail.com'
];

// localStorage key for caching permissions
const PERMISSIONS_CACHE_KEY = 'luxury_listings_permissions';

export function usePermissions() {
  return useContext(PermissionsContext);
}

/**
 * PermissionsProvider - Caches user permissions to avoid repeated Firestore calls
 * Loads once on auth, caches in localStorage, NO real-time listener for performance
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
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  // Refresh permissions on demand (e.g., after admin changes)
  const refreshPermissions = useCallback(async () => {
    if (!currentUser?.email || isSystemAdmin) return;
    
    try {
      const perms = await firestoreService.getUserPagePermissions(currentUser.email);
      setPermissions(perms || []);
      // Cache to localStorage
      localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify({
        email: currentUser.email,
        perms: perms || []
      }));
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    }
  }, [currentUser?.email, isSystemAdmin]);

  useEffect(() => {
    if (!currentUser?.email) {
      setPermissions([]);
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
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Load permissions once (no real-time listener for performance)
    const loadPermissions = async () => {
      try {
        const perms = await firestoreService.getUserPagePermissions(currentUser.email);
        if (isMounted) {
          setPermissions(perms || []);
          // Cache to localStorage
          localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify({
            email: currentUser.email,
            perms: perms || []
          }));
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
        if (isMounted) {
          setPermissions([]);
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
    
    // Check cached permissions
    return permissions.includes(pageId);
  };

  const value = {
    permissions,
    loading,
    isSystemAdmin,
    hasPermission,
    refreshPermissions // Expose for manual refresh when needed
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}
