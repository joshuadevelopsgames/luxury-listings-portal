import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { firestoreService } from '../services/firestoreService';

const PermissionsContext = createContext();

// System admins always have full access
const SYSTEM_ADMINS = [
  'jrsschroeder@gmail.com',
  'joshua@luxury-listings.com'
];

export function usePermissions() {
  return useContext(PermissionsContext);
}

/**
 * PermissionsProvider - Caches user permissions to avoid repeated Firestore calls
 * Loads once on auth, updates in real-time via listener
 */
export function PermissionsProvider({ children }) {
  const { currentUser } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  useEffect(() => {
    if (!currentUser?.email) {
      setPermissions([]);
      setLoading(false);
      setIsSystemAdmin(false);
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

    // Load permissions
    const loadPermissions = async () => {
      try {
        const perms = await firestoreService.getUserPagePermissions(currentUser.email);
        if (isMounted) {
          setPermissions(perms || []);
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

    // Set up real-time listener
    const unsubscribe = firestoreService.onUserPagePermissionsChange(
      currentUser.email,
      (perms) => {
        if (isMounted) {
          setPermissions(perms || []);
        }
      }
    );

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
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
    hasPermission
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}
