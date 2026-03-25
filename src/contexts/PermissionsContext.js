import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabaseService } from '../services/supabaseService';
import { isSystemAdmin as checkIsSystemAdmin, onSystemAdminsChange } from '../utils/systemAdmins';
// getBaseModuleIds import removed - base modules now check explicit permissions

const PermissionsContext = createContext();

// Feature permissions - granular access within pages
export const FEATURE_PERMISSIONS = {
  VIEW_FINANCIALS: 'view_financials',      // See salary, compensation, financial data
  MANAGE_USERS: 'manage_users',            // View users & permissions; only system admin can add/remove or change permissions
  APPROVE_TIME_OFF: 'approve_time_off',    // Approve/deny time off requests
  VIEW_ANALYTICS: 'view_analytics',        // Access to analytics dashboards
  // Client Management
  MANAGE_CLIENTS: 'manage_clients',        // Edit client info, remove clients
  ASSIGN_CLIENT_MANAGERS: 'assign_client_managers', // Assign managers to clients
  EDIT_CLIENT_PACKAGES: 'edit_client_packages',     // Edit package details
  VIEW_ALL_REPORTS: 'view_all_reports',             // See and edit all Instagram reports (not just own)
  APPROVE_CONTENT: 'approve_content',               // Read/update all content items (approval workflow)
  // Admin Tools
  MANAGE_CHATS: 'manage_chats',                     // View and respond to user chats
  MANAGE_FEEDBACK: 'manage_feedback',               // View and manage bug reports and feature requests
  MANAGE_GRAPHIC_PROJECTS: 'manage_graphic_projects', // Archive and delete graphic projects
  MANAGE_RESOURCES: 'manage_resources',             // Create and edit resources
  MANAGE_EMPLOYEE_PROFILES: 'manage_employee_profiles', // Edit all employee profile fields
  VIEW_ALL_MODULES: 'view_all_modules',             // View all available modules in onboarding
  MANAGE_WORKLOAD: 'manage_workload',               // Access workload management features
  MANAGE_ALL_CLIENTS: 'manage_all_clients',         // Manage all clients (not just assigned)
  VIEW_AUDIT_TRAIL: 'view_audit_trail',             // View audit information (created by, etc.)
  MANAGE_INSTAGRAM_REPORTS: 'manage_instagram_reports', // Archive and manage all Instagram reports
};

export function usePermissions() {
  return useContext(PermissionsContext);
}

/**
 * PermissionsProvider - Fetches permissions from Firestore on every page load
 * Always gets fresh data from server so admin changes take effect on refresh
 * Supports both page permissions and feature permissions (granular access)
 */
export function PermissionsProvider({ children }) {
  const { currentUser } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [featurePermissions, setFeaturePermissions] = useState([]);
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  // Refresh permissions on demand (e.g., after admin changes)
  const refreshPermissions = useCallback(async () => {
    if (!currentUser?.email || currentUser?.isDemoViewOnly) return;

    try {
      const result = await supabaseService.getUserPermissions(currentUser.email);
      const pagePerms = result?.pages || result || [];
      const featurePerms = result?.features || [];

      setPermissions(Array.isArray(pagePerms) ? pagePerms : []);
      setFeaturePermissions(Array.isArray(featurePerms) ? featurePerms : []);
      if (result?.version !== undefined) setPermissionsVersion(result.version);
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
      return;
    }

    // Demo view-only: see all pages, no feature (edit) permissions
    const isDemoViewOnly = !!currentUser.isDemoViewOnly;
    if (isDemoViewOnly) {
      setIsSystemAdmin(false);
      setPermissions([]); // hasPermission will return true for all when isDemoViewOnly
      setFeaturePermissions([]);
      setLoading(false);
      return;
    }

    // Subscribe to admin changes so isSystemAdmin updates when the admin list loads from Firestore
    const unsubscribeAdmins = onSystemAdminsChange((adminEmails) => {
      const adminStatus = adminEmails.includes(currentUser.email.toLowerCase());
      setIsSystemAdmin(adminStatus);
    });

    // Check if system admin (dynamic from Firestore system_config/admins)
    const adminStatus = checkIsSystemAdmin(currentUser.email);
    setIsSystemAdmin(adminStatus);

    // System admins now use the same permission-based logic as everyone else, 
    // except for the Permissions UI which checks isSystemAdmin separately.
    // So we proceed to load permissions even if adminStatus is true.

    // Subscribe to permission changes. Only apply updates whose version >= current
    // to prevent stale realtime events from overwriting newer data.
    const sub = supabaseService.getUserPermissions(currentUser.email, {
      subscribe: true,
      onUpdate: (result) => {
        const incomingVersion = result?.version ?? 0;
        setPermissionsVersion((prevVersion) => {
          if (incomingVersion < prevVersion) {
            // Stale update — ignore it
            return prevVersion;
          }
          // Newer or same version — apply the permissions
          setPermissions(Array.isArray(result?.pages) ? result.pages : []);
          setFeaturePermissions(Array.isArray(result?.features) ? result.features : []);
          setLoading(false);
          return incomingVersion;
        });
        // Always clear loading even if version was stale
        setLoading(false);
      }
    });

    return () => {
      sub?.unsubscribe?.();
      unsubscribeAdmins();
    };
  }, [currentUser?.email]);

  // Demo view-only: see all pages, no edit (handled in state: permissions/featurePermissions empty, isDemoViewOnly set in AuthContext)
  const isDemoViewOnly = !!currentUser?.isDemoViewOnly;

  // Check if user has permission for a specific page
  const hasPermission = (pageId) => {
    // Demo view-only can see everything (all pages)
    if (isDemoViewOnly) return true;
    
    // Dashboard is always accessible
    if (pageId === 'dashboard') return true;
    
    // Check user's explicit permissions (including base modules)
    // Base modules can now be disabled per-user, so check explicit permissions
    return permissions.includes(pageId);
  };

  // Check if user has a specific feature permission (granular access)
  const hasFeaturePermission = (featureId) => {
    // Demo view-only: no edit/manage features
    if (isDemoViewOnly) return false;
    
    // Check user's feature permissions
    return featurePermissions.includes(featureId);
  };

  const value = {
    permissions,
    featurePermissions,
    permissionsVersion,
    loading,
    isSystemAdmin,
    isDemoViewOnly,
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
